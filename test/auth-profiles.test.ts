import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { cloneAuthProfile } from '../src/application/usecases/authProfiles.js'
import { createSiteRegistry } from '../src/infrastructure/site/siteRegistry.js'
import { resolveManagedAuthProfilePaths } from '../src/shared/runtime/appPaths.js'
import { OWNER_ONLY_DIRECTORY_MODE } from '../src/shared/runtime/profileSecurity.js'

test('cloneAuthProfile copies the selected Chrome profile and shared root files only', async () => {
  const sandboxRoot = await mkdtemp(join(tmpdir(), 'cdp-cli-template-auth-profiles-'))
  const previousHome = process.env.HOME

  try {
    process.env.HOME = sandboxRoot

    const sourceUserDataDir = join(sandboxRoot, 'source-profile-root')
    await mkdir(join(sourceUserDataDir, 'Default'), { recursive: true })
    await mkdir(join(sourceUserDataDir, 'Profile 2'), { recursive: true })
    await mkdir(join(sourceUserDataDir, 'Profile 9'), { recursive: true })
    await mkdir(join(sourceUserDataDir, 'ShaderCache'), { recursive: true })
    await writeFile(join(sourceUserDataDir, 'Local State'), '{"profile":true}\n', 'utf8')
    await writeFile(join(sourceUserDataDir, 'Default', 'Cookies'), 'default-cookie', 'utf8')
    await writeFile(join(sourceUserDataDir, 'Profile 2', 'Cookies'), 'profile-two-cookie', 'utf8')
    await writeFile(join(sourceUserDataDir, 'Profile 9', 'Cookies'), 'profile-nine-cookie', 'utf8')
    await writeFile(join(sourceUserDataDir, 'ShaderCache', 'index'), 'cache', 'utf8')

    const registry = createSiteRegistry({
      defaultSiteId: 'v2ex-main',
      authProfiles: [
        {
          id: 'v2ex-main-auth',
          label: 'V2EX Main',
        },
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

    const result = await cloneAuthProfile(registry, {
      siteId: 'v2ex-main',
      sourceUserDataDir,
      sourceProfileDirectory: 'Profile 2',
    })

    const managedPaths = resolveManagedAuthProfilePaths('v2ex-main-auth')
    assert.equal(result.targetUserDataDir, managedPaths.chromeUserDataDir)
    assert.equal(result.copiedChromeProfileDirectory, 'Profile 2')
    if (process.platform !== 'win32') {
      const info = await stat(result.targetUserDataDir)
      assert.equal(info.mode & 0o777, OWNER_ONLY_DIRECTORY_MODE)
    }

    const entries = await readdir(result.targetUserDataDir)
    assert.deepEqual(entries.sort(), ['Local State', 'Profile 2'].sort())
    assert.equal(await readFile(join(result.targetUserDataDir, 'Profile 2', 'Cookies'), 'utf8'), 'profile-two-cookie')
    await assert.rejects(stat(join(result.targetUserDataDir, 'Default')), /ENOENT/)
    await assert.rejects(stat(join(result.targetUserDataDir, 'Profile 9')), /ENOENT/)
    await assert.rejects(stat(join(result.targetUserDataDir, 'ShaderCache')), /ENOENT/)

    const state = JSON.parse(await readFile(managedPaths.stateFile, 'utf8')) as {
      chromeProfileDirectory: string
      chromeUserDataDir: string
    }
    assert.equal(state.chromeProfileDirectory, 'Profile 2')
    assert.equal(state.chromeUserDataDir, result.targetUserDataDir)
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = previousHome
    }
    await rm(sandboxRoot, { recursive: true, force: true })
  }
})
