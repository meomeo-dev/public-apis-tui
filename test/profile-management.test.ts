import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { showManagedProfile } from '../src/application/usecases/profileManagement.js'
import { createSiteRegistry } from '../src/infrastructure/site/siteRegistry.js'
import { SITE_CDP_HOME_DIR_ENV } from '../src/shared/runtime/appPaths.js'

test('showManagedProfile only reports ready when auth state and Chrome profile directory exist', async () => {
  await withTempAppHome(async appHome => {
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

    assert.equal((await showManagedProfile(registry, { siteId: 'private' })).ready, false)

    const authDir = join(appHome, 'auth', 'reviewer')
    const chromeUserDataDir = join(authDir, 'chrome-profile')
    await mkdir(authDir, { recursive: true })
    await writeFile(
      join(authDir, 'auth-state.json'),
      `${JSON.stringify({
        version: 1,
        status: 'ready',
        authProfileId: 'reviewer',
        chromeUserDataDir,
        chromeProfileDirectory: 'Default',
      })}\n`,
      'utf8',
    )
    assert.equal((await showManagedProfile(registry, { siteId: 'private' })).ready, false)

    await mkdir(join(chromeUserDataDir, 'Default'), { recursive: true })
    assert.equal((await showManagedProfile(registry, { siteId: 'private' })).ready, true)
  })
})

async function withTempAppHome<T>(handler: (appHome: string) => Promise<T>): Promise<T> {
  const previous = process.env[SITE_CDP_HOME_DIR_ENV]
  const appHome = await mkdtemp(join(tmpdir(), 'cdp-cli-profile-management-'))
  process.env[SITE_CDP_HOME_DIR_ENV] = appHome
  try {
    return await handler(appHome)
  } finally {
    if (previous === undefined) {
      delete process.env[SITE_CDP_HOME_DIR_ENV]
    } else {
      process.env[SITE_CDP_HOME_DIR_ENV] = previous
    }
    await rm(appHome, { recursive: true, force: true })
  }
}
