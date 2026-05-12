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

type UsDailyResult = Record<string, unknown> & {
  kind: 'covidtracking.usDaily'
  api: PublicApiMeta
  rows: Array<{ date: string; casesTotal?: number | undefined }>
  storage: StorageMeta
}

type StatesResult = Record<string, unknown> & {
  kind: 'covidtracking.states'
  api: PublicApiMeta
  states: Array<{ stateCode: string; name: string }>
  storage: StorageMeta
}

type StateDailyResult = Record<string, unknown> & {
  kind: 'covidtracking.stateDaily'
  api: PublicApiMeta
  rows: Array<{ date: string; state?: string | undefined }>
  storage: StorageMeta
}

test('Covid Tracking Project live e2e covers archive endpoints and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const usDaily = await runJson<UsDailyResult>(['apis', 'run', 'covidtracking.usDaily', '--online', '--persist', '--format', 'json', '--', '--limit', '420'], env)
    assert.equal(usDaily.kind, 'covidtracking.usDaily')
    assert.equal(usDaily.api.provider, 'covidtracking')
    assert.equal(usDaily.api.authentication, 'none')
    assert.equal(usDaily.api.usesBrowserClickstream, false)
    assert.ok(usDaily.rows.length > 0)
    assert.equal(usDaily.storage.persisted, true)

    const usDailyOffline = await runJson<UsDailyResult>(['apis', 'run', 'covidtracking.usDaily', '--offline', '--format', 'json', '--', '--limit', '420'], env)
    assert.equal(usDailyOffline.storage.mode, 'offline')
    assert.deepEqual(usDailyOffline.rows, usDaily.rows)

    const states = await runJson<StatesResult>(['apis', 'run', 'covidtracking.states', '--online', '--persist', '--format', 'json', '--', '--limit', '56'], env)
    assert.equal(states.kind, 'covidtracking.states')
    assert.equal(states.api.authentication, 'none')
    assert.equal(states.api.usesBrowserClickstream, false)
    assert.ok(states.states.length > 0)
    assert.equal(states.storage.persisted, true)

    const statesOffline = await runJson<StatesResult>(['apis', 'run', 'covidtracking.states', '--offline', '--format', 'json', '--', '--limit', '56'], env)
    assert.equal(statesOffline.storage.mode, 'offline')
    assert.deepEqual(statesOffline.states, states.states)

    const stateDaily = await runJson<StateDailyResult>(['apis', 'run', 'covidtracking.stateDaily', '--online', '--persist', '--format', 'json', '--', '--state', 'ca', '--limit', '420'], env)
    assert.equal(stateDaily.kind, 'covidtracking.stateDaily')
    assert.equal(stateDaily.api.authentication, 'none')
    assert.equal(stateDaily.api.usesBrowserClickstream, false)
    assert.ok(stateDaily.rows.length > 0)
    assert.equal(stateDaily.storage.persisted, true)

    const stateDailyOffline = await runJson<StateDailyResult>(['apis', 'run', 'covidtracking.stateDaily', '--offline', '--format', 'json', '--', '--state', 'ca', '--limit', '420'], env)
    assert.equal(stateDailyOffline.storage.mode, 'offline')
    assert.deepEqual(stateDailyOffline.rows, stateDaily.rows)

    const text = await runCli(['apis', 'run', 'covidtracking.stateDaily', '--offline', '--format', 'text', '--', '--state', 'ca', '--limit', '420'], env)
    assert.match(text.stdout, /Covid Tracking Project CA Daily Archive/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-covidtracking-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
