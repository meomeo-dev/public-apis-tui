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

type HourlyResult = Record<string, unknown> & {
  kind: 'epa.uvHourly'
  api: PublicApiMeta
  forecasts: Array<{ zip: string; uvValue: number }>
  storage: StorageMeta
}

type DailyResult = Record<string, unknown> & {
  kind: 'epa.uvDaily'
  api: PublicApiMeta
  forecasts: Array<{ zip: string; uvIndex: number }>
  storage: StorageMeta
}

test('EPA live e2e covers UV hourly, daily, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const hourly = await runJson<HourlyResult>(['apis', 'run', 'epa.uvHourly', '--online', '--persist', '--format', 'json', '--', '--zip', '20050', '--limit', '21'], env)
    assert.equal(hourly.kind, 'epa.uvHourly')
    assert.equal(hourly.api.provider, 'epa')
    assert.equal(hourly.api.authentication, 'none')
    assert.equal(hourly.api.usesBrowserClickstream, false)
    assert.ok(hourly.forecasts.length > 0)
    assert.equal(hourly.forecasts[0]?.zip, '20050')
    assert.equal(hourly.storage.persisted, true)

    const hourlyOffline = await runJson<HourlyResult>(['apis', 'run', 'epa.uvHourly', '--offline', '--format', 'json', '--', '--zip', '20050', '--limit', '21'], env)
    assert.equal(hourlyOffline.storage.mode, 'offline')
    assert.deepEqual(hourlyOffline.forecasts, hourly.forecasts)

    const daily = await runJson<DailyResult>(['apis', 'run', 'epa.uvDaily', '--online', '--persist', '--format', 'json', '--', '--zip', '20050'], env)
    assert.equal(daily.kind, 'epa.uvDaily')
    assert.equal(daily.api.authentication, 'none')
    assert.equal(daily.api.usesBrowserClickstream, false)
    assert.ok(daily.forecasts.length > 0)
    assert.equal(daily.forecasts[0]?.zip, '20050')
    assert.equal(daily.storage.persisted, true)

    const dailyOffline = await runJson<DailyResult>(['apis', 'run', 'epa.uvDaily', '--offline', '--format', 'json', '--', '--zip', '20050'], env)
    assert.equal(dailyOffline.storage.mode, 'offline')
    assert.deepEqual(dailyOffline.forecasts, daily.forecasts)

    const text = await runCli(['apis', 'run', 'epa.uvDaily', '--offline', '--format', 'text', '--', '--zip', '20050'], env)
    assert.match(text.stdout, /EPA UV Daily Forecast/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-epa-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
