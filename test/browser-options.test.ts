import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { resolveBrowserOptionsForDefaultSite, resolveBrowserOptionsForSite } from '../src/application/usecases/browserOptions.js'
import { createSiteRegistry } from '../src/infrastructure/site/siteRegistry.js'

test('resolveBrowserOptionsForSite applies auth profile user data dir and browser profile defaults', () => {
  const registry = createSiteRegistry({
    defaultSiteId: 'private',
    authProfiles: [
      {
        id: 'reviewer',
        label: 'Reviewer',
        userDataDir: '/tmp/reviewer-profile',
        profile: {
          locale: 'en-US,en',
          timezoneId: 'America/Los_Angeles',
          viewport: { width: 1440, height: 900 },
          interaction: {
            scrollIntoView: true,
            typeDelayMs: 40,
          },
        },
      },
    ],
    sites: [
      {
        id: 'private',
        name: 'Private',
        baseUrl: 'https://example.com/private',
        selectors: { ready: 'body' },
        auth: { mode: 'required', profileId: 'reviewer' },
        roles: ['primary'],
      },
    ],
    workflows: [],
  })

  const options = resolveBrowserOptionsForSite(
    registry,
    {
      headless: true,
      timeoutMs: 1000,
      profile: {
        userAgent: 'UA/1.0',
        interaction: {
          hoverBeforeClick: false,
          clickDelayMs: 75,
        },
      },
    },
    'private',
  )

  assert.equal(options.userDataDir, '/tmp/reviewer-profile')
  assert.equal(options.profile?.locale, 'en-US,en')
  assert.equal(options.profile?.timezoneId, 'America/Los_Angeles')
  assert.equal(options.profile?.userAgent, 'UA/1.0')
  assert.equal(options.profile?.viewport?.width, 1440)
  assert.equal(options.profile?.interaction?.scrollIntoView, true)
  assert.equal(options.profile?.interaction?.typeDelayMs, 40)
  assert.equal(options.profile?.interaction?.hoverBeforeClick, false)
  assert.equal(options.profile?.interaction?.clickDelayMs, 75)
})

test('resolveBrowserOptionsForDefaultSite leaves options unchanged when no auth profile applies', () => {
  const registry = createSiteRegistry()
  const base = { headless: true, timeoutMs: 1000 }
  const resolved = resolveBrowserOptionsForDefaultSite(registry, base)
  assert.deepEqual(resolved, base)
})

test('resolveBrowserOptionsForSite lets explicit auth profile override the site default', () => {
  const registry = createSiteRegistry({
    defaultSiteId: 'v2ex-main',
    authProfiles: [
      { id: 'google', label: 'Google', userDataDir: '/tmp/google-profile', profileDirectory: 'Profile 2' },
      { id: 'v2ex-main-auth', label: 'V2EX Main', userDataDir: '/tmp/v2ex-main-profile', profileDirectory: 'Default' },
    ],
    sites: [
      {
        id: 'v2ex-main',
        name: 'V2EX Main',
        baseUrl: 'https://www.v2ex.com/',
        selectors: { ready: 'body' },
        auth: { mode: 'required', profileId: 'v2ex-main-auth' },
        roles: ['forum'],
      },
    ],
    workflows: [],
  })

  const options = resolveBrowserOptionsForSite(
    registry,
    {
      headless: true,
      timeoutMs: 1000,
      authProfileId: 'google',
    },
    'v2ex-main',
  )

  assert.equal(options.authProfileId, 'google')
  assert.equal(options.userDataDir, '/tmp/google-profile')
  assert.equal(options.chromeProfileDirectory, 'Profile 2')
})

test('resolveBrowserOptionsForSite keeps managed browser sessions isolated by slug', () => {
  const registry = createSiteRegistry({
    defaultSiteId: 'private',
    authProfiles: [
      { id: 'reviewer', label: 'Reviewer', userDataDir: '/tmp/reviewer-profile', profileDirectory: 'Profile 2' },
    ],
    sites: [
      {
        id: 'private',
        name: 'Private',
        baseUrl: 'https://example.com/private',
        selectors: { ready: 'body' },
        auth: { mode: 'required', profileId: 'reviewer' },
        roles: ['primary'],
      },
    ],
    workflows: [],
  })

  const options = resolveBrowserOptionsForSite(
    registry,
    {
      sessionId: 'qa-main',
      headless: true,
      timeoutMs: 1000,
    },
    'private',
  )

  assert.equal(options.sessionId, 'qa-main')
  assert.equal(options.userDataDir, undefined)
  assert.equal(options.chromeProfileDirectory, undefined)
})

test('resolveBrowserOptionsForSite lets explicit user data dir override managed browser session isolation', () => {
  const registry = createSiteRegistry({
    defaultSiteId: 'private',
    authProfiles: [
      { id: 'reviewer', label: 'Reviewer', userDataDir: '/tmp/reviewer-profile' },
    ],
    sites: [
      {
        id: 'private',
        name: 'Private',
        baseUrl: 'https://example.com/private',
        selectors: { ready: 'body' },
        auth: { mode: 'required', profileId: 'reviewer' },
        roles: ['primary'],
      },
    ],
    workflows: [],
  })

  const options = resolveBrowserOptionsForSite(
    registry,
    {
      sessionId: 'qa-main',
      userDataDir: '/tmp/explicit-session-profile',
      headless: true,
      timeoutMs: 1000,
    },
    'private',
  )

  assert.equal(options.userDataDir, '/tmp/explicit-session-profile')
})

test('resolveBrowserOptionsForSite prefers remembered managed auth state over static auth profile paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'cdp-cli-template-browser-options-'))
  const previousHome = process.env.HOME

  try {
    process.env.HOME = root
    const stateDir = join(root, '.cdp-cli', 'public-apis-tui', 'auth', 'reviewer')
    const chromeProfileDir = join(root, 'managed-reviewer-profile', 'Profile 7')
    mkdirSync(stateDir, { recursive: true })
    mkdirSync(chromeProfileDir, { recursive: true })
    writeFileSync(
      join(stateDir, 'auth-state.json'),
      `${JSON.stringify({
        version: 1,
        status: 'ready',
        authProfileId: 'reviewer',
        chromeUserDataDir: join(root, 'managed-reviewer-profile'),
        chromeProfileDirectory: 'Profile 7',
      })}\n`,
      'utf8',
    )

    const registry = createSiteRegistry({
      defaultSiteId: 'private',
      authProfiles: [
        {
          id: 'reviewer',
          label: 'Reviewer',
          userDataDir: '/tmp/static-reviewer-profile',
          profileDirectory: 'Default',
        },
      ],
      sites: [
        {
          id: 'private',
          name: 'Private',
          baseUrl: 'https://example.com/private',
          selectors: { ready: 'body' },
          auth: { mode: 'required', profileId: 'reviewer' },
          roles: ['primary'],
        },
      ],
      workflows: [],
    })

    const options = resolveBrowserOptionsForSite(
      registry,
      {
        headless: true,
        timeoutMs: 1000,
      },
      'private',
    )

    assert.equal(options.userDataDir, join(root, 'managed-reviewer-profile'))
    assert.equal(options.chromeProfileDirectory, 'Profile 7')
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = previousHome
    }
    rmSync(root, { recursive: true, force: true })
  }
})

test('resolveBrowserOptionsForSite fails closed when required auth state is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'cdp-cli-template-auth-ready-'))
  const previousHome = process.env.HOME

  try {
    process.env.HOME = root
    const registry = createSiteRegistry({
      defaultSiteId: 'private',
      authProfiles: [
        {
          id: 'reviewer',
          label: 'Reviewer',
        },
      ],
      sites: [
        {
          id: 'private',
          name: 'Private',
          baseUrl: 'https://example.com/private',
          selectors: { ready: 'body' },
          auth: { mode: 'required', profileId: 'reviewer' },
          roles: ['primary'],
        },
      ],
      workflows: [],
    })

    assert.throws(
      () => resolveBrowserOptionsForSite(registry, { headless: true, timeoutMs: 1000 }, 'private', { required: true }),
      /auth profile reviewer is not ready/,
    )
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = previousHome
    }
    rmSync(root, { recursive: true, force: true })
  }
})

test('resolveBrowserOptionsForSite allows explicit browser state for required auth commands', () => {
  const registry = createSiteRegistry({
    defaultSiteId: 'private',
    authProfiles: [
      {
        id: 'reviewer',
        label: 'Reviewer',
      },
    ],
    sites: [
      {
        id: 'private',
        name: 'Private',
        baseUrl: 'https://example.com/private',
        selectors: { ready: 'body' },
        auth: { mode: 'required', profileId: 'reviewer' },
        roles: ['primary'],
      },
    ],
    workflows: [],
  })

  const options = resolveBrowserOptionsForSite(
    registry,
    {
      sessionId: 'qa-main',
      headless: true,
      timeoutMs: 1000,
    },
    'private',
    { required: true },
  )

  assert.equal(options.sessionId, 'qa-main')
})

test('resolveBrowserOptionsForSite accepts configured auth profile directories for required auth', () => {
  const root = mkdtempSync(join(tmpdir(), 'cdp-cli-template-configured-auth-'))

  try {
    const configuredUserDataDir = join(root, 'configured-profile')
    mkdirSync(join(configuredUserDataDir, 'Default'), { recursive: true })
    const registry = createSiteRegistry({
      defaultSiteId: 'private',
      authProfiles: [
        {
          id: 'reviewer',
          label: 'Reviewer',
          userDataDir: configuredUserDataDir,
        },
      ],
      sites: [
        {
          id: 'private',
          name: 'Private',
          baseUrl: 'https://example.com/private',
          selectors: { ready: 'body' },
          auth: { mode: 'required', profileId: 'reviewer' },
          roles: ['primary'],
        },
      ],
      workflows: [],
    })

    const options = resolveBrowserOptionsForSite(
      registry,
      {
        headless: true,
        timeoutMs: 1000,
      },
      'private',
      { required: true },
    )

    assert.equal(options.userDataDir, configuredUserDataDir)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
