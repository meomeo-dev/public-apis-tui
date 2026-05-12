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
  kind: 'brazilcentralbank.datasets'
  api: PublicApiMeta
  datasets: Array<{ name: string }>
  storage: StorageMeta
}

type SgsLatestResult = Record<string, unknown> & {
  kind: 'brazilcentralbank.sgsLatest'
  api: PublicApiMeta
  observations: Array<{ date: string; rawValue: string }>
  storage: StorageMeta
}

test('Brazil Central Bank live e2e covers datasets, SGS latest, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'brazilcentralbank.datasets', '--online', '--persist', '--format', 'json', '--', '--query', 'selic', '--rows', '100'], env)
    assert.equal(datasets.kind, 'brazilcentralbank.datasets')
    assert.equal(datasets.api.provider, 'brazilcentralbank')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.storage.persisted, true)
    assert.ok(datasets.datasets.length > 0)

    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'brazilcentralbank.datasets', '--offline', '--format', 'json', '--', '--query', 'selic', '--rows', '100'], env)
    assert.equal(datasetsOffline.storage.mode, 'offline')
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const sgs = await runJson<SgsLatestResult>(['apis', 'run', 'brazilcentralbank.sgsLatest', '--online', '--persist', '--format', 'json', '--', '--series-code', '11', '--limit', '20'], env)
    assert.equal(sgs.kind, 'brazilcentralbank.sgsLatest')
    assert.equal(sgs.api.provider, 'brazilcentralbank')
    assert.equal(sgs.api.authentication, 'none')
    assert.equal(sgs.api.usesBrowserClickstream, false)
    assert.equal(sgs.storage.persisted, true)
    assert.ok(sgs.observations.length > 0)

    const sgsOffline = await runJson<SgsLatestResult>(['apis', 'run', 'brazilcentralbank.sgsLatest', '--offline', '--format', 'json', '--', '--series-code', '11', '--limit', '20'], env)
    assert.equal(sgsOffline.storage.mode, 'offline')
    assert.deepEqual(sgsOffline.observations, sgs.observations)

    const text = await runCli(['apis', 'run', 'brazilcentralbank.sgsLatest', '--offline', '--format', 'text', '--', '--series-code', '11', '--limit', '20'], env)
    assert.match(text.stdout, /Brazil Central Bank SGS Latest/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-brazilcentralbank-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
