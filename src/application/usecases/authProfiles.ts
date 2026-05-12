import { access, cp, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { withBrowserPage, type BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { SiteRegistry } from '../../infrastructure/site/siteRegistry.js'
import type { AuthProfileConfig, SiteConfig } from '../../infrastructure/site/siteAdapter.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import {
  DEFAULT_CHROME_PROFILE_DIRECTORY,
  isPathInside,
  resolveManagedAuthProfilePaths,
} from '../../shared/runtime/appPaths.js'
import { ensureOwnerOnlyDirectories, ensureOwnerOnlyDirectory, hardenDirectoryTree } from '../../shared/runtime/profileSecurity.js'
import { resolveBrowserOptionsForSite } from './browserOptions.js'

export type AuthLoginInput = {
  siteId?: string | undefined
  authProfileId?: string | undefined
  browserOptions: BrowserRuntimeOptions
  url?: string | undefined
  force?: boolean | undefined
}

export type AuthLogoutInput = {
  siteId?: string | undefined
  authProfileId?: string | undefined
}

export type CloneAuthProfileInput = {
  siteId?: string | undefined
  authProfileId?: string | undefined
  sourceUserDataDir: string
  sourceProfileDirectory?: string | undefined
  force?: boolean | undefined
}

export type ResolvedAuthProfile = {
  site: SiteConfig
  authProfile: AuthProfileConfig
}

export type AuthLoginResult = {
  status: 'ready'
  siteId: string
  authProfileId: string
  authDir: string
  chromeUserDataDir: string
  chromeProfileDirectory: string
  loginUrl: string
  finalUrl: string
  stateFile: string
  loggedInAt: string
}

export type AuthLogoutResult = {
  status: 'cleared'
  siteId: string
  authProfileId: string
  authDir: string
  chromeUserDataDir: string
  stateFile: string
  removed: boolean
}

export type CloneAuthProfileResult = {
  status: 'cloned'
  siteId: string
  authProfileId: string
  sourceUserDataDir: string
  targetUserDataDir: string
  copiedChromeProfileDirectory: string
}

export async function loginAuthProfile(
  registry: SiteRegistry,
  input: AuthLoginInput,
): Promise<AuthLoginResult> {
  const resolved = resolveAuthProfileForSite(registry, input.siteId, input.authProfileId)
  const target = resolveManagedAuthProfileTarget(resolved.authProfile)
  if (input.force === true) {
    await rm(target.paths.authDir, { recursive: true, force: true })
  }
  await ensureOwnerOnlyDirectories([target.paths.appHomeDir, target.paths.authDir, target.userDataDir])

  const loginUrl = input.url ?? resolved.site.auth.loginUrl ?? resolved.site.baseUrl
  const browserOptions = resolveBrowserOptionsForSite(
    registry,
    {
      ...input.browserOptions,
      headless: false,
      authProfileId: resolved.authProfile.id,
      initialUrl: loginUrl,
      userDataDir: target.userDataDir,
      chromeProfileDirectory: target.chromeProfileDirectory,
    },
    resolved.site.id,
  )

  const finalUrl = await withBrowserPage(browserOptions, async lease => {
    await lease.page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: browserOptions.timeoutMs })
    if (resolved.site.auth.checkSelector !== undefined) {
      await lease.page.waitForSelector(resolved.site.auth.checkSelector, {
        visible: true,
        timeout: browserOptions.timeoutMs,
      })
    }
    return lease.page.url()
  })

  const loggedInAt = new Date().toISOString()
  await writeAuthState(target.paths.stateFile, {
    version: 1,
    status: 'ready',
    siteId: resolved.site.id,
    authProfileId: resolved.authProfile.id,
    loginUrl,
    finalUrl,
    chromeUserDataDir: target.userDataDir,
    chromeProfileDirectory: browserOptions.chromeProfileDirectory ?? DEFAULT_CHROME_PROFILE_DIRECTORY,
    loggedInAt,
  })

  return {
    status: 'ready',
    siteId: resolved.site.id,
    authProfileId: resolved.authProfile.id,
    authDir: target.paths.authDir,
    chromeUserDataDir: target.userDataDir,
    chromeProfileDirectory: browserOptions.chromeProfileDirectory ?? DEFAULT_CHROME_PROFILE_DIRECTORY,
    loginUrl,
    finalUrl,
    stateFile: target.paths.stateFile,
    loggedInAt,
  }
}

export async function logoutAuthProfile(
  registry: SiteRegistry,
  input: AuthLogoutInput,
): Promise<AuthLogoutResult> {
  const resolved = resolveAuthProfileForSite(registry, input.siteId, input.authProfileId)
  const target = resolveManagedAuthProfileTarget(resolved.authProfile)
  const removed = await pathExists(target.paths.authDir)
  await rm(target.paths.authDir, { recursive: true, force: true })
  return {
    status: 'cleared',
    siteId: resolved.site.id,
    authProfileId: resolved.authProfile.id,
    authDir: target.paths.authDir,
    chromeUserDataDir: target.userDataDir,
    stateFile: target.paths.stateFile,
    removed,
  }
}

export async function cloneAuthProfile(
  registry: SiteRegistry,
  input: CloneAuthProfileInput,
): Promise<CloneAuthProfileResult> {
  const resolved = resolveAuthProfileForSite(registry, input.siteId, input.authProfileId)
  const target = resolveManagedAuthProfileTarget(resolved.authProfile)
  const sourceUserDataDir = resolve(input.sourceUserDataDir)
  const targetUserDataDir = target.userDataDir
  const copiedChromeProfileDirectory =
    input.sourceProfileDirectory ??
    resolved.authProfile.profileDirectory ??
    DEFAULT_CHROME_PROFILE_DIRECTORY

  if (input.force === true) {
    await rm(target.paths.authDir, { recursive: true, force: true })
  }

  await assertDirectoryExists(sourceUserDataDir, 'sourceUserDataDir')
  await assertChromeProfileDirectoryExists(sourceUserDataDir, copiedChromeProfileDirectory)
  await copyChromeUserDataDir(sourceUserDataDir, targetUserDataDir, copiedChromeProfileDirectory)
  await writeAuthState(target.paths.stateFile, {
    version: 1,
    status: 'ready',
    siteId: resolved.site.id,
    authProfileId: resolved.authProfile.id,
    chromeUserDataDir: targetUserDataDir,
    chromeProfileDirectory: copiedChromeProfileDirectory,
    sourceUserDataDir,
    clonedAt: new Date().toISOString(),
  })

  return {
    status: 'cloned',
    siteId: resolved.site.id,
    authProfileId: resolved.authProfile.id,
    sourceUserDataDir,
    targetUserDataDir,
    copiedChromeProfileDirectory,
  }
}

export function resolveAuthProfileForSite(
  registry: SiteRegistry,
  siteId?: string | undefined,
  authProfileId?: string | undefined,
): ResolvedAuthProfile {
  const site = resolveSiteForAuthOperation(registry, siteId, authProfileId)
  const resolvedAuthProfileId = authProfileId ?? site.auth.profileId
  if (resolvedAuthProfileId === undefined) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Site ${site.id} does not define an auth profile. Pass --auth-profile or configure site.auth.profileId.`,
      { siteId: site.id },
    )
  }

  return {
    site,
    authProfile: registry.getAuthProfile(resolvedAuthProfileId),
  }
}

function resolveSiteForAuthOperation(
  registry: SiteRegistry,
  siteId: string | undefined,
  authProfileId: string | undefined,
): SiteConfig {
  if (siteId !== undefined) {
    return registry.getSite(siteId)
  }

  if (authProfileId === undefined) {
    return registry.getSite(registry.config.defaultSiteId)
  }

  const sites = registry.listSitesForAuthProfile(authProfileId)
  if (sites.length === 1) {
    return sites[0] as SiteConfig
  }

  if (sites.length > 1) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Auth profile ${authProfileId} is used by multiple sites. Pass --site explicitly.`,
      {
        authProfileId,
        siteIds: sites.map(site => site.id),
      },
    )
  }

  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `No site references auth profile ${authProfileId}. Pass --site explicitly or configure site.auth.profileId.`,
    { authProfileId },
  )
}

async function writeAuthState(filePath: string, state: Record<string, unknown>): Promise<void> {
  await ensureOwnerOnlyDirectory(dirname(filePath))
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

async function copyChromeUserDataDir(sourceUserDataDir: string, targetUserDataDir: string, profileDirectory: string): Promise<void> {
  await rm(targetUserDataDir, { recursive: true, force: true })
  await ensureOwnerOnlyDirectory(targetUserDataDir)

  await copyIfExists(join(sourceUserDataDir, 'Local State'), join(targetUserDataDir, 'Local State'))
  await copyIfExists(join(sourceUserDataDir, profileDirectory), join(targetUserDataDir, profileDirectory))
  await hardenDirectoryTree(targetUserDataDir)
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(resolve(path))
    return true
  } catch {
    return false
  }
}

function resolveManagedAuthProfileTarget(authProfile: AuthProfileConfig): {
  paths: ReturnType<typeof resolveManagedAuthProfilePaths>
  userDataDir: string
  chromeProfileDirectory: string
} {
  const paths = resolveManagedAuthProfilePaths(authProfile.id)
  const userDataDir = resolve(authProfile.userDataDir ?? paths.chromeUserDataDir)
  if (!isPathInside(paths.authDir, userDataDir)) {
    throw new RuntimeFailure(
      'AUTH_PROFILE_FAILED',
      `Auth profile ${authProfile.id} must use a dedicated local managed userDataDir under ${paths.authDir}.`,
      {
        authProfileId: authProfile.id,
        authDir: paths.authDir,
        userDataDir,
      },
    )
  }

  return {
    paths,
    userDataDir,
    chromeProfileDirectory: authProfile.profileDirectory ?? paths.chromeProfileDirectory,
  }
}

async function assertDirectoryExists(path: string, label: string): Promise<void> {
  let info
  try {
    info = await stat(path)
  } catch {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${label} directory: ${path}`)
  }

  if (!info.isDirectory()) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} is not a directory: ${path}`)
  }
}

async function assertChromeProfileDirectoryExists(sourceUserDataDir: string, profileDirectory: string): Promise<void> {
  await assertDirectoryExists(join(sourceUserDataDir, profileDirectory), 'sourceProfileDirectory')
}

async function copyIfExists(source: string, target: string): Promise<void> {
  if (!(await pathExists(source))) {
    return
  }

  await cp(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    errorOnExist: false,
  })
}
