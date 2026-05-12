import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'
const defaultPackageId = 'ttc-routes-and-schedules'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type SearchResult = Record<string, unknown> & {
  kind: 'torontoopendata.search'
  api: PublicApiMeta
  datasets: Array<{ id: string; title?: string | undefined }>
  storage: StorageMeta
}

type DatasetResult = Record<string, unknown> & {
  kind: 'torontoopendata.dataset'
  api: PublicApiMeta
  dataset: { name?: string | undefined; resources: Array<Record<string, unknown>> }
  storage: StorageMeta
}

test('Toronto Open Data live e2e covers search, dataset, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const search = await runJson<SearchResult>(['apis', 'run', 'torontoopendata.search', '--online', '--persist', '--format', 'json', '--', '--query', 'transportation', '--limit', '100'], env)
    assert.equal(search.kind, 'torontoopendata.search')
    assert.equal(search.api.provider, 'torontoopendata')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.ok(search.datasets.length > 0)
    assert.equal(search.storage.persisted, true)

    const searchOffline = await runJson<SearchResult>(['apis', 'run', 'torontoopendata.search', '--offline', '--format', 'json', '--', '--query', 'transportation', '--limit', '100'], env)
    assert.equal(searchOffline.storage.mode, 'offline')
    assert.deepEqual(searchOffline.datasets, search.datasets)

    const dataset = await runJson<DatasetResult>(['apis', 'run', 'torontoopendata.dataset', '--online', '--persist', '--format', 'json', '--', '--package-id', defaultPackageId], env)
    assert.equal(dataset.kind, 'torontoopendata.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.name, defaultPackageId)
    assert.ok(dataset.dataset.resources.length > 0)
    assert.equal(dataset.storage.persisted, true)

    const datasetOffline = await runJson<DatasetResult>(['apis', 'run', 'torontoopendata.dataset', '--offline', '--format', 'json', '--', '--package-id', defaultPackageId], env)
    assert.equal(datasetOffline.storage.mode, 'offline')
    assert.deepEqual(datasetOffline.dataset, dataset.dataset)

    const text = await runCli(['apis', 'run', 'torontoopendata.dataset', '--offline', '--format', 'text', '--', '--package-id', defaultPackageId], env)
    assert.match(text.stdout, /Toronto Open Data Dataset Detail/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-torontoopendata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
