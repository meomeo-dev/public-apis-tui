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

type PointResult = Record<string, unknown> & {
  kind: 'usweather.point'
  api: PublicApiMeta
  query: { latitude: number; longitude: number }
  point: { office: string; gridX: number; gridY: number }
  storage: StorageMeta
}

type ForecastResult = Record<string, unknown> & {
  kind: 'usweather.forecast'
  api: PublicApiMeta
  query: { office: string; gridX: number; gridY: number; limit: number }
  forecast: { periods: Array<Record<string, unknown>> }
  storage: StorageMeta
}

test('US Weather live point verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<PointResult>(['apis', 'run', 'usweather.point', '--online', '--persist', '--format', 'json', '--', '--latitude', '38.8894', '--longitude', '-77.0352'], env)
    assert.equal(online.kind, 'usweather.point')
    assert.equal(online.api.provider, 'usweather')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.point.office, 'LWX')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<PointResult>(['apis', 'run', 'usweather.point', '--offline', '--format', 'json', '--', '--latitude', '38.8894', '--longitude', '-77.0352'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.point, online.point)

    const text = await runCli(['apis', 'run', 'usweather.point', '--offline', '--format', 'text', '--', '--latitude', '38.8894', '--longitude', '-77.0352'], env)
    assert.match(text.stdout, /US Weather Point/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('US Weather live forecast verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ForecastResult>(['apis', 'run', 'usweather.forecast', '--online', '--persist', '--format', 'json', '--', '--office', 'LWX', '--grid-x', '97', '--grid-y', '71', '--limit', '5'], env)
    assert.equal(online.kind, 'usweather.forecast')
    assert.equal(online.api.provider, 'usweather')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.office, 'LWX')
    assert.ok(online.forecast.periods.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ForecastResult>(['apis', 'run', 'usweather.forecast', '--offline', '--format', 'json', '--', '--office', 'LWX', '--grid-x', '97', '--grid-y', '71', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.forecast.periods, online.forecast.periods)

    const text = await runCli(['apis', 'run', 'usweather.forecast', '--offline', '--format', 'text', '--', '--office', 'LWX', '--grid-x', '97', '--grid-y', '71', '--limit', '5'], env)
    assert.match(text.stdout, /US Weather Forecast/)
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
