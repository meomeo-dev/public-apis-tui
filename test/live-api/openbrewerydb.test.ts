import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type BreweriesResult = Record<string, unknown> & {
  kind: 'openbrewerydb.breweries' | 'openbrewerydb.search'
  api: PublicApiMeta
  query: Record<string, unknown>
  pagination: { returned: number; perPage: number; page: number }
  breweries: Array<Record<string, unknown>>
  storage: StorageMeta
}

type MetaResult = Record<string, unknown> & {
  kind: 'openbrewerydb.meta'
  api: PublicApiMeta
  query: Record<string, unknown>
  meta: { total: number; byType: Record<string, number>; byState: Record<string, number> }
  storage: StorageMeta
}

test('Open Brewery DB live breweries verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<BreweriesResult>(['apis', 'run', 'openbrewerydb.breweries', '--online', '--persist', '--format', 'json', '--', '--city', 'san_diego', '--per-page', '2'], env)
    assert.equal(online.kind, 'openbrewerydb.breweries')
    assert.equal(online.api.provider, 'openbrewerydb')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.city, 'san_diego')
    assert.equal(online.pagination.perPage, 2)
    assert.ok(online.breweries.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<BreweriesResult>(['apis', 'run', 'openbrewerydb.breweries', '--offline', '--format', 'json', '--', '--city', 'san_diego', '--per-page', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.breweries, online.breweries)

    const text = await runCli(['apis', 'run', 'openbrewerydb.breweries', '--offline', '--format', 'text', '--', '--city', 'san_diego', '--per-page', '2'], env)
    assert.match(text.stdout, /Open Brewery DB Breweries/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('Open Brewery DB live search verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<BreweriesResult>(['apis', 'run', 'openbrewerydb.search', '--online', '--persist', '--format', 'json', '--', '--query', 'dogfish', '--per-page', '2'], env)
    assert.equal(online.kind, 'openbrewerydb.search')
    assert.equal(online.api.provider, 'openbrewerydb')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.query, 'dogfish')
    assert.ok(online.breweries.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<BreweriesResult>(['apis', 'run', 'openbrewerydb.search', '--offline', '--format', 'json', '--', '--query', 'dogfish', '--per-page', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.breweries, online.breweries)

    const text = await runCli(['apis', 'run', 'openbrewerydb.search', '--offline', '--format', 'text', '--', '--query', 'dogfish', '--per-page', '2'], env)
    assert.match(text.stdout, /Open Brewery DB Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('Open Brewery DB live meta verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<MetaResult>(['apis', 'run', 'openbrewerydb.meta', '--online', '--persist', '--format', 'json', '--', '--city', 'san_diego'], env)
    assert.equal(online.kind, 'openbrewerydb.meta')
    assert.equal(online.api.provider, 'openbrewerydb')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.city, 'san_diego')
    assert.ok(online.meta.total > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<MetaResult>(['apis', 'run', 'openbrewerydb.meta', '--offline', '--format', 'json', '--', '--city', 'san_diego'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.meta, online.meta)

    const text = await runCli(['apis', 'run', 'openbrewerydb.meta', '--offline', '--format', 'text', '--', '--city', 'san_diego'], env)
    assert.match(text.stdout, /Open Brewery DB Meta/)
    assert.match(text.stdout, /open REST API only · no auth/)
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
    maxBuffer: 1024 * 1024,
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
