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
  kind: 'censusgov.datasets'
  api: PublicApiMeta
  datasets: Array<{ title: string }>
  storage: StorageMeta
}

type StatesResult = Record<string, unknown> & {
  kind: 'censusgov.acsProfileStates'
  api: PublicApiMeta
  states: Array<{ name: string; state: string; population?: number | undefined }>
  storage: StorageMeta
}

test('Census.gov live e2e covers datasets, ACS profile states, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'censusgov.datasets', '--online', '--persist', '--format', 'json', '--', '--query', 'acs', '--limit', '100'], env)
    assert.equal(datasets.kind, 'censusgov.datasets')
    assert.equal(datasets.api.provider, 'censusgov')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.ok(datasets.datasets.length > 0)
    assert.equal(datasets.storage.persisted, true)

    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'censusgov.datasets', '--offline', '--format', 'json', '--', '--query', 'acs', '--limit', '100'], env)
    assert.equal(datasetsOffline.storage.mode, 'offline')
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const states = await runJson<StatesResult>(['apis', 'run', 'censusgov.acsProfileStates', '--online', '--persist', '--format', 'json', '--', '--year', '2024', '--limit', '52'], env)
    assert.equal(states.kind, 'censusgov.acsProfileStates')
    assert.equal(states.api.authentication, 'none')
    assert.equal(states.api.usesBrowserClickstream, false)
    assert.equal(states.states.length, 52)
    assert.ok(states.states.some(state => state.name === 'California'))
    assert.equal(states.storage.persisted, true)

    const statesOffline = await runJson<StatesResult>(['apis', 'run', 'censusgov.acsProfileStates', '--offline', '--format', 'json', '--', '--year', '2024', '--limit', '52'], env)
    assert.equal(statesOffline.storage.mode, 'offline')
    assert.deepEqual(statesOffline.states, states.states)

    const text = await runCli(['apis', 'run', 'censusgov.acsProfileStates', '--offline', '--format', 'text', '--', '--year', '2024', '--limit', '52'], env)
    assert.match(text.stdout, /Census.gov ACS Profile States/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-censusgov-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
