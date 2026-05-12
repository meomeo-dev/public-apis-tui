import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'
const defaultResourceId = '55ad4b1c-5eeb-44ea-8b29-d410da431be3'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type SearchResult = Record<string, unknown> & {
  kind: 'opengovernmentau.search'
  api: PublicApiMeta
  datasets: Array<{ id: string; title?: string | undefined }>
  storage: StorageMeta
}

type RecordsResult = Record<string, unknown> & {
  kind: 'opengovernmentau.records'
  api: PublicApiMeta
  records: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('Open Government Australia live e2e covers search, records, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const search = await runJson<SearchResult>(['apis', 'run', 'opengovernmentau.search', '--online', '--persist', '--format', 'json', '--', '--query', 'business', '--limit', '1000'], env)
    assert.equal(search.kind, 'opengovernmentau.search')
    assert.equal(search.api.provider, 'opengovernmentau')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.ok(search.datasets.length > 0)
    assert.equal(search.storage.persisted, true)

    const searchOffline = await runJson<SearchResult>(['apis', 'run', 'opengovernmentau.search', '--offline', '--format', 'json', '--', '--query', 'business', '--limit', '1000'], env)
    assert.equal(searchOffline.storage.mode, 'offline')
    assert.deepEqual(searchOffline.datasets, search.datasets)

    const records = await runJson<RecordsResult>(['apis', 'run', 'opengovernmentau.records', '--online', '--persist', '--format', 'json', '--', '--resource-id', defaultResourceId, '--limit', '5000'], env)
    assert.equal(records.kind, 'opengovernmentau.records')
    assert.equal(records.api.authentication, 'none')
    assert.equal(records.api.usesBrowserClickstream, false)
    assert.ok(records.records.length > 0)
    assert.equal(records.storage.persisted, true)

    const recordsOffline = await runJson<RecordsResult>(['apis', 'run', 'opengovernmentau.records', '--offline', '--format', 'json', '--', '--resource-id', defaultResourceId, '--limit', '5000'], env)
    assert.equal(recordsOffline.storage.mode, 'offline')
    assert.deepEqual(recordsOffline.records, records.records)

    const text = await runCli(['apis', 'run', 'opengovernmentau.records', '--offline', '--format', 'text', '--', '--resource-id', defaultResourceId, '--limit', '5000'], env)
    assert.match(text.stdout, /Open Government Australia Records/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 64 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-opengovernmentau-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
