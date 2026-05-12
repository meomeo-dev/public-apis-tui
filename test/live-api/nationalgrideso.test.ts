import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'
const defaultResourceId = '177f6fa4-ae49-4182-81ea-0c6b35f26ca6'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type SearchResult = Record<string, unknown> & { kind: 'nationalgrideso.search'; api: PublicApiMeta; datasets: unknown[]; storage: StorageMeta }
type RecordsResult = Record<string, unknown> & { kind: 'nationalgrideso.records'; api: PublicApiMeta; records: unknown[]; storage: StorageMeta }

test('National Grid ESO / NESO live e2e covers search, records, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const search = await runJson<SearchResult>(['apis', 'run', 'nationalgrideso.search', '--online', '--persist', '--format', 'json', '--', '--query', 'demand', '--limit', '1000'], env)
    assert.equal(search.kind, 'nationalgrideso.search')
    assert.equal(search.api.provider, 'nationalgrideso')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.ok(search.datasets.length > 0)
    assert.equal(search.storage.persisted, true)
    const searchOffline = await runJson<SearchResult>(['apis', 'run', 'nationalgrideso.search', '--offline', '--format', 'json', '--', '--query', 'demand', '--limit', '1000'], env)
    assert.deepEqual(searchOffline.datasets, search.datasets)

    const records = await runJson<RecordsResult>(['apis', 'run', 'nationalgrideso.records', '--online', '--persist', '--format', 'json', '--', '--resource-id', defaultResourceId, '--limit', '100'], env)
    assert.equal(records.kind, 'nationalgrideso.records')
    assert.ok(records.records.length > 0)
    const recordsOffline = await runJson<RecordsResult>(['apis', 'run', 'nationalgrideso.records', '--offline', '--format', 'json', '--', '--resource-id', defaultResourceId, '--limit', '100'], env)
    assert.deepEqual(recordsOffline.records, records.records)

    const text = await runCli(['apis', 'run', 'nationalgrideso.records', '--offline', '--format', 'text', '--', '--resource-id', defaultResourceId, '--limit', '100'], env)
    assert.match(text.stdout, /National Grid ESO \/ NESO Datastore Records/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
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
