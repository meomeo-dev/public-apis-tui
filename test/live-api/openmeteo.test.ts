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

type ForecastResult = Record<string, unknown> & {
  kind: 'openmeteo.forecast'
  api: PublicApiMeta
  query: { latitude: number; longitude: number; forecastDays: number }
  current: Record<string, unknown>
  daily: Record<string, unknown[]>
  storage: StorageMeta
}

type GeocodingResult = Record<string, unknown> & {
  kind: 'openmeteo.geocoding'
  api: PublicApiMeta
  query: { name: string; count: number; language: string }
  locations: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('Open-Meteo live forecast verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const args = ['apis', 'run', 'openmeteo.forecast', '--online', '--persist', '--format', 'json', '--', '--latitude', '52.52', '--longitude', '13.41', '--forecast-days', '16']
    const online = await runJson<ForecastResult>(args, env)
    assert.equal(online.kind, 'openmeteo.forecast')
    assert.equal(online.api.provider, 'openmeteo')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.forecastDays, 16)
    assert.equal(Array.isArray(online.daily.time), true)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ForecastResult>(['apis', 'run', 'openmeteo.forecast', '--offline', '--format', 'json', '--', '--latitude', '52.52', '--longitude', '13.41', '--forecast-days', '16'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.daily, online.daily)

    const text = await runCli(['apis', 'run', 'openmeteo.forecast', '--offline', '--format', 'text', '--', '--latitude', '52.52', '--longitude', '13.41', '--forecast-days', '16'], env)
    assert.match(text.stdout, /Open-Meteo Forecast/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('Open-Meteo live geocoding verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GeocodingResult>(['apis', 'run', 'openmeteo.geocoding', '--online', '--persist', '--format', 'json', '--', '--name', 'Berlin', '--count', '2'], env)
    assert.equal(online.kind, 'openmeteo.geocoding')
    assert.equal(online.api.provider, 'openmeteo')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.name, 'Berlin')
    assert.ok(online.locations.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<GeocodingResult>(['apis', 'run', 'openmeteo.geocoding', '--offline', '--format', 'json', '--', '--name', 'Berlin', '--count', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.locations, online.locations)

    const text = await runCli(['apis', 'run', 'openmeteo.geocoding', '--offline', '--format', 'text', '--', '--name', 'Berlin', '--count', '2'], env)
    assert.match(text.stdout, /Open-Meteo Geocoding/)
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
