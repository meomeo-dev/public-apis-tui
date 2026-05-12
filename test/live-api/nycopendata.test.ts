import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type DatasetsResult = Record<string, unknown> & {
  kind: 'nycopendata.datasets'
  api: PublicApiMeta
  datasets: Array<{ id: string; name: string }>
  storage: StorageMeta
}

type RequestsResult = Record<string, unknown> & {
  kind: 'nycopendata.311Requests'
  api: PublicApiMeta
  requests: Array<{ uniqueKey: string; borough?: string | undefined }>
  storage: StorageMeta
}

test('NYC Open Data live e2e covers datasets, 311 requests, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'nycopendata.datasets', '--online', '--persist', '--format', 'json', '--', '--query', '311', '--limit', '100'], env)
    assert.equal(datasets.kind, 'nycopendata.datasets')
    assert.equal(datasets.api.provider, 'nycopendata')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.ok(datasets.datasets.some(dataset => dataset.id === 'erm2-nwe9'))
    assert.equal(datasets.storage.persisted, true)

    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'nycopendata.datasets', '--offline', '--format', 'json', '--', '--query', '311', '--limit', '100'], env)
    assert.equal(datasetsOffline.storage.mode, 'offline')
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const requests = await runJson<RequestsResult>(['apis', 'run', 'nycopendata.311Requests', '--online', '--persist', '--format', 'json', '--', '--borough', 'BROOKLYN', '--limit', '1000'], env)
    assert.equal(requests.kind, 'nycopendata.311Requests')
    assert.equal(requests.api.authentication, 'none')
    assert.equal(requests.api.usesBrowserClickstream, false)
    assert.ok(requests.requests.length > 0)
    assert.equal(requests.storage.persisted, true)

    const requestsOffline = await runJson<RequestsResult>(['apis', 'run', 'nycopendata.311Requests', '--offline', '--format', 'json', '--', '--borough', 'BROOKLYN', '--limit', '1000'], env)
    assert.equal(requestsOffline.storage.mode, 'offline')
    assert.deepEqual(requestsOffline.requests, requests.requests)

    const text = await runCli(['apis', 'run', 'nycopendata.311Requests', '--offline', '--format', 'text', '--', '--borough', 'BROOKLYN', '--limit', '1000'], env)
    assert.match(text.stdout, /NYC Open Data 311 Requests/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-nycopendata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
