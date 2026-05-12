import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type CdnjsResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: Record<string, unknown>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('CDNJS live e2e covers search json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<CdnjsResult & { libraries: unknown[] }>(['apis', 'run', 'cdnjs.search', '--format', 'json', '--', '--query', 'jquery', '--limit', '3'])
  assert.equal(json.kind, 'cdnjs.search')
  assert.equal(json.api.provider, 'cdnjs')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.query, 'jquery')
  assert.ok(json.libraries.length > 0)

  const text = await runCli(['apis', 'run', 'cdnjs.search', '--format', 'text', '--', '--query', 'jquery', '--limit', '3'])
  assert.match(text.stdout, /CDNJS Library Search/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<CdnjsResult & { libraries: unknown[] }>(['apis', 'run', 'cdnjs.search', '--online', '--persist', '--format', 'json', '--', '--query', 'jquery', '--limit', '3'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<CdnjsResult & { libraries: unknown[] }>(['apis', 'run', 'cdnjs.search', '--offline', '--format', 'json', '--', '--query', 'jquery', '--limit', '3'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.libraries, online.libraries)
  })
})

test('CDNJS live e2e covers library and version operations with offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const library = await runJson<CdnjsResult & { library: { name: string; assets: unknown[] } }>(['apis', 'run', 'cdnjs.library', '--format', 'json', '--', '--name', 'jquery', '--version-limit', '1', '--file-limit', '3'])
  assert.equal(library.kind, 'cdnjs.library')
  assert.equal(library.api.authentication, 'none')
  assert.equal(library.api.usesBrowserClickstream, false)
  assert.equal(library.library.name, 'jquery')
  assert.ok(library.library.assets.length > 0)

  const libraryText = await runCli(['apis', 'run', 'cdnjs.library', '--format', 'text', '--', '--name', 'jquery', '--version-limit', '1', '--file-limit', '3'])
  assert.match(libraryText.stdout, /CDNJS Library/)
  assert.match(libraryText.stdout, /open REST API only · no auth/)

  const version = await runJson<CdnjsResult & { files: unknown[] }>(['apis', 'run', 'cdnjs.version', '--format', 'json', '--', '--name', 'jquery', '--version', '3.7.1', '--file-limit', '3'])
  assert.equal(version.kind, 'cdnjs.version')
  assert.equal(version.api.authentication, 'none')
  assert.equal(version.api.usesBrowserClickstream, false)
  assert.ok(version.files.length > 0)

  const versionText = await runCli(['apis', 'run', 'cdnjs.version', '--format', 'text', '--', '--name', 'jquery', '--version', '3.7.1', '--file-limit', '3'])
  assert.match(versionText.stdout, /CDNJS Version Files/)
  assert.match(versionText.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const onlineLibrary = await runJson<CdnjsResult & { library: unknown }>(['apis', 'run', 'cdnjs.library', '--online', '--persist', '--format', 'json', '--', '--name', 'jquery', '--version-limit', '1', '--file-limit', '3'], env)
    assert.equal(onlineLibrary.storage.persisted, true)
    const offlineLibrary = await runJson<CdnjsResult & { library: unknown }>(['apis', 'run', 'cdnjs.library', '--offline', '--format', 'json', '--', '--name', 'jquery', '--version-limit', '1', '--file-limit', '3'], env)
    assert.equal(offlineLibrary.storage.mode, 'offline')
    assert.deepEqual(offlineLibrary.library, onlineLibrary.library)

    const onlineVersion = await runJson<CdnjsResult & { files: unknown[] }>(['apis', 'run', 'cdnjs.version', '--online', '--persist', '--format', 'json', '--', '--name', 'jquery', '--version', '3.7.1', '--file-limit', '3'], env)
    assert.equal(onlineVersion.storage.persisted, true)
    const offlineVersion = await runJson<CdnjsResult & { files: unknown[] }>(['apis', 'run', 'cdnjs.version', '--offline', '--format', 'json', '--', '--name', 'jquery', '--version', '3.7.1', '--file-limit', '3'], env)
    assert.equal(offlineVersion.storage.mode, 'offline')
    assert.deepEqual(offlineVersion.files, onlineVersion.files)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 8 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
