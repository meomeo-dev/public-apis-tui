import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { AuthProfileConfig, BrowserInteractionConfig, BrowserProfileConfig, SiteConfig } from '../../infrastructure/site/siteAdapter.js'
import type { SiteRegistry } from '../../infrastructure/site/siteRegistry.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { DEFAULT_CHROME_PROFILE_DIRECTORY, resolveManagedAuthProfilePaths } from '../../shared/runtime/appPaths.js'
import { readManagedAuthState } from '../../shared/runtime/managedAuthState.js'

export type AuthReadinessCheck = {
  required?: boolean | undefined
}

export function resolveBrowserOptionsForSite(
  registry: SiteRegistry,
  browserOptions: BrowserRuntimeOptions,
  siteId?: string | undefined,
  authReadiness: AuthReadinessCheck = {},
): BrowserRuntimeOptions {
  const site = registry.getSite(siteId ?? registry.config.defaultSiteId)
  const profileId = browserOptions.authProfileId ?? site.auth.profileId
  if (profileId === undefined) {
    if (authReadiness.required === true && site.auth.mode === 'required') {
      throw new RuntimeFailure('AUTH_PROFILE_NOT_READY', `Site ${site.id} requires login but does not define an auth profile.`, {
        siteId: site.id,
      })
    }
    return browserOptions
  }

  const authProfile = registry.getAuthProfile(profileId)
  const managedPaths = resolveManagedAuthProfilePaths(profileId)
  const managedState = readManagedAuthState(profileId)
  assertRequiredAuthProfileReady(site, authProfile, browserOptions, managedState, managedPaths, authReadiness)
  return {
    ...browserOptions,
    authProfileId: profileId,
    userDataDir:
      browserOptions.userDataDir ??
      (browserOptions.sessionId === undefined
        ? managedState?.chromeUserDataDir ?? authProfile.userDataDir ?? managedPaths.chromeUserDataDir
        : undefined),
    chromeProfileDirectory:
      browserOptions.chromeProfileDirectory ??
      (browserOptions.sessionId === undefined
        ? managedState?.chromeProfileDirectory ?? authProfile.profileDirectory ?? DEFAULT_CHROME_PROFILE_DIRECTORY
        : undefined),
    profile: mergeBrowserProfiles(authProfile.profile, browserOptions.profile),
  }
}

export function resolveBrowserOptionsForDefaultSite(
  registry: SiteRegistry,
  browserOptions: BrowserRuntimeOptions,
  authReadiness: AuthReadinessCheck = {},
): BrowserRuntimeOptions {
  return resolveBrowserOptionsForSite(registry, browserOptions, registry.defaultSite.id, authReadiness)
}

function assertRequiredAuthProfileReady(
  site: SiteConfig,
  authProfile: AuthProfileConfig,
  browserOptions: BrowserRuntimeOptions,
  managedState: ReturnType<typeof readManagedAuthState>,
  managedPaths: ReturnType<typeof resolveManagedAuthProfilePaths>,
  authReadiness: AuthReadinessCheck,
): void {
  if (authReadiness.required !== true || site.auth.mode !== 'required') {
    return
  }

  if (browserOptions.cdpUrl !== undefined || browserOptions.userDataDir !== undefined || browserOptions.sessionId !== undefined) {
    return
  }

  const expectedUserDataDir = managedState?.chromeUserDataDir ?? authProfile.userDataDir ?? managedPaths.chromeUserDataDir
  const expectedChromeProfileDirectory =
    managedState?.chromeProfileDirectory ?? authProfile.profileDirectory ?? DEFAULT_CHROME_PROFILE_DIRECTORY
  if (
    (managedState !== undefined || authProfile.userDataDir !== undefined) &&
    existsSync(expectedUserDataDir) &&
    existsSync(join(expectedUserDataDir, expectedChromeProfileDirectory))
  ) {
    return
  }

  throw new RuntimeFailure(
    'AUTH_PROFILE_NOT_READY',
    `Site ${site.id} requires login but auth profile ${authProfile.id} is not ready. Run auth login first.`,
    {
      siteId: site.id,
      authProfileId: authProfile.id,
      expectedState: managedPaths.stateFile,
      expectedUserDataDir,
      expectedChromeProfileDirectory,
      recovery: `public-apis auth login --site ${site.id}`,
    },
  )
}

export function mergeBrowserProfiles(
  base: BrowserProfileConfig | undefined,
  override: BrowserProfileConfig | undefined,
): BrowserProfileConfig | undefined {
  if (base === undefined) {
    return override
  }
  if (override === undefined) {
    return base
  }

  return {
    ...base,
    ...override,
    viewport: override.viewport ?? base.viewport,
    geolocation: override.geolocation ?? base.geolocation,
    extraHeaders: mergeHeaders(base.extraHeaders, override.extraHeaders),
    interaction: mergeInteraction(base.interaction, override.interaction),
  }
}

function mergeHeaders(
  base: BrowserProfileConfig['extraHeaders'],
  override: BrowserProfileConfig['extraHeaders'],
): BrowserProfileConfig['extraHeaders'] {
  if (base === undefined) {
    return override
  }
  if (override === undefined) {
    return base
  }
  return {
    ...base,
    ...override,
  }
}

function mergeInteraction(
  base: BrowserInteractionConfig | undefined,
  override: BrowserInteractionConfig | undefined,
): BrowserInteractionConfig | undefined {
  if (base === undefined) {
    return override
  }
  if (override === undefined) {
    return base
  }

  return {
    hoverBeforeClick: override.hoverBeforeClick ?? base.hoverBeforeClick,
    scrollIntoView: override.scrollIntoView ?? base.scrollIntoView,
    clickDelayMs: override.clickDelayMs ?? base.clickDelayMs,
    typeDelayMs: override.typeDelayMs ?? base.typeDelayMs,
    pressDelayMs: override.pressDelayMs ?? base.pressDelayMs,
  }
}
