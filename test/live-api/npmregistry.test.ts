import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('npm Registry live search verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<NpmRegistrySearchLiveResult>(['apis', 'run', 'npmregistry.search', '--format', 'json', '--', '--query', 'typescript', '--size', '250'])
  assert.equal(json.kind, 'npmregistry.search')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedMaxSize, 250)
  assert.equal(json.query.query, 'typescript')
  assert.equal(json.query.size, 250)
  assert.ok(json.pagination.returned > 0)
  assert.ok(json.search.packages.length > 0)

  const text = await runCli(['apis', 'run', 'npmregistry.search', '--format', 'text', '--', '--query', 'typescript', '--size', '250'])
  assert.match(text.stdout, /npm Registry Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /documented max 250/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NpmRegistrySearchLiveResult>(['apis', 'run', 'npmregistry.search', '--online', '--persist', '--format', 'json', '--', '--query', 'typescript', '--size', '250'], env)
    const offline = await runJson<NpmRegistrySearchLiveResult>(['apis', 'run', 'npmregistry.search', '--offline', '--format', 'json', '--', '--query', 'typescript', '--size', '250'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.search, online.search)
  })
})

test('npm Registry live package verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<NpmRegistryPackageLiveResult>(['apis', 'run', 'npmregistry.package', '--format', 'json', '--', '--package', 'typescript', '--version-limit', '2'])
  assert.equal(json.kind, 'npmregistry.package')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.packumentProjection, 'summary-only-no-readme-or-full-versions')
  assert.equal(json.package.name, 'typescript')
  assert.ok(json.package.versionCount >= 2)
  assert.equal(json.package.versions.length, 2)

  const text = await runCli(['apis', 'run', 'npmregistry.package', '--format', 'text', '--', '--package', 'typescript', '--version-limit', '2'])
  assert.match(text.stdout, /npm Registry Package/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /summary-only-no-readme-or-full-versions/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NpmRegistryPackageLiveResult>(['apis', 'run', 'npmregistry.package', '--online', '--persist', '--format', 'json', '--', '--package', 'typescript', '--version-limit', '2'], env)
    const offline = await runJson<NpmRegistryPackageLiveResult>(['apis', 'run', 'npmregistry.package', '--offline', '--format', 'json', '--', '--package', 'typescript', '--version-limit', '2'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.package, online.package)
  })
})

type NpmRegistrySearchLiveResult = {
  kind: 'npmregistry.search'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
    documentedMaxSize: number
  }
  query: {
    query: string
    size: number
  }
  pagination: {
    returned: number
  }
  search: {
    packages: unknown[]
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

type NpmRegistryPackageLiveResult = {
  kind: 'npmregistry.package'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
    packumentProjection: 'summary-only-no-readme-or-full-versions'
  }
  package: {
    name: string
    versionCount: number
    versions: unknown[]
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 16 * 1024 * 1024,
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
