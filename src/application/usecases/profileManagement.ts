import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { SiteRegistry } from '../../infrastructure/site/siteRegistry.js'
import type { SiteConfig } from '../../infrastructure/site/siteAdapter.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { DEFAULT_CHROME_PROFILE_DIRECTORY, resolveManagedAuthProfilePaths } from '../../shared/runtime/appPaths.js'
import { readManagedAuthState } from '../../shared/runtime/managedAuthState.js'

export type ShowProfileInput = {
  siteId?: string | undefined
  authProfileId?: string | undefined
}

export type ShowProfileResult = {
  siteId: string
  authProfileId: string
  authDir: string
  chromeUserDataDir: string
  chromeProfileDirectory: string
  stateFile: string
  ready: boolean
  finalUrl?: string | undefined
  loggedInAt?: string | undefined
  clonedAt?: string | undefined
}

export async function showManagedProfile(
  registry: SiteRegistry,
  input: ShowProfileInput,
): Promise<ShowProfileResult> {
  const site = resolveSiteForProfileOperation(registry, input.siteId, input.authProfileId)
  const authProfileId = input.authProfileId ?? site.auth.profileId
  if (authProfileId === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Site ${site.id} does not define an auth profile.`, {
      siteId: site.id,
    })
  }

  const authProfile = registry.getAuthProfile(authProfileId)
  const paths = resolveManagedAuthProfilePaths(authProfile.id)
  const state = readManagedAuthState(authProfile.id)
  const chromeUserDataDir = state?.chromeUserDataDir ?? authProfile.userDataDir ?? paths.chromeUserDataDir
  const chromeProfileDirectory =
    state?.chromeProfileDirectory ?? authProfile.profileDirectory ?? DEFAULT_CHROME_PROFILE_DIRECTORY
  const ready = await isAuthProfileReady({
    hasManagedState: state !== undefined,
    hasConfiguredUserDataDir: authProfile.userDataDir !== undefined,
    chromeUserDataDir,
    chromeProfileDirectory,
  })

  return {
    siteId: site.id,
    authProfileId: authProfile.id,
    authDir: paths.authDir,
    chromeUserDataDir,
    chromeProfileDirectory,
    stateFile: paths.stateFile,
    ready,
    ...(state?.finalUrl !== undefined ? { finalUrl: state.finalUrl } : {}),
    ...(state?.loggedInAt !== undefined ? { loggedInAt: state.loggedInAt } : {}),
    ...(state?.clonedAt !== undefined ? { clonedAt: state.clonedAt } : {}),
  }
}

function resolveSiteForProfileOperation(
  registry: SiteRegistry,
  siteId: string | undefined,
  authProfileId: string | undefined,
): SiteConfig {
  if (siteId !== undefined) {
    return registry.getSite(siteId)
  }

  if (authProfileId === undefined) {
    return registry.defaultSite
  }

  const sites = registry.listSitesForAuthProfile(authProfileId)
  if (sites.length === 1) {
    return sites[0] as SiteConfig
  }

  if (sites.length > 1) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Auth profile ${authProfileId} is used by multiple sites. Pass --site explicitly.`,
      { authProfileId, siteIds: sites.map(site => site.id) },
    )
  }

  throw new RuntimeFailure('INVALID_ARGUMENT', `No site references auth profile ${authProfileId}.`, {
    authProfileId,
  })
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const info = await stat(resolve(path))
    return info.isDirectory() || info.isFile()
  } catch {
    return false
  }
}

async function isAuthProfileReady(input: {
  hasManagedState: boolean
  hasConfiguredUserDataDir: boolean
  chromeUserDataDir: string
  chromeProfileDirectory: string
}): Promise<boolean> {
  if (!input.hasManagedState && !input.hasConfiguredUserDataDir) {
    return false
  }

  return (
    await pathExists(input.chromeUserDataDir) &&
    await pathExists(join(input.chromeUserDataDir, input.chromeProfileDirectory))
  )
}
