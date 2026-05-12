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

type ComponentsResult = Record<string, unknown> & { kind: 'luchtmeetnet.components'; api: PublicApiMeta; components: unknown[]; storage: StorageMeta }
type MeasurementsResult = Record<string, unknown> & { kind: 'luchtmeetnet.measurements'; api: PublicApiMeta; measurements: unknown[]; storage: StorageMeta }
type ConcentrationsResult = Record<string, unknown> & { kind: 'luchtmeetnet.concentrations'; api: PublicApiMeta; concentrations: unknown[]; storage: StorageMeta }

test('Luchtmeetnet live e2e covers components, measurements, concentrations, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }

    const components = await runJson<ComponentsResult>(['apis', 'run', 'luchtmeetnet.components', '--online', '--persist', '--format', 'json', '--', '--limit', '13'], env)
    assert.equal(components.kind, 'luchtmeetnet.components')
    assert.equal(components.api.provider, 'luchtmeetnet')
    assert.equal(components.api.authentication, 'none')
    assert.equal(components.api.usesBrowserClickstream, false)
    assert.ok(components.components.length > 0)
    assert.equal(components.storage.persisted, true)
    const componentsOffline = await runJson<ComponentsResult>(['apis', 'run', 'luchtmeetnet.components', '--offline', '--format', 'json', '--', '--limit', '13'], env)
    assert.equal(componentsOffline.storage.mode, 'offline')
    assert.deepEqual(componentsOffline.components, components.components)

    const measurements = await runJson<MeasurementsResult>(['apis', 'run', 'luchtmeetnet.measurements', '--online', '--persist', '--format', 'json', '--', '--station-number', 'NL01485', '--formula', 'NO2', '--limit', '167'], env)
    assert.equal(measurements.kind, 'luchtmeetnet.measurements')
    assert.ok(measurements.measurements.length > 0)
    const measurementsOffline = await runJson<MeasurementsResult>(['apis', 'run', 'luchtmeetnet.measurements', '--offline', '--format', 'json', '--', '--station-number', 'NL01485', '--formula', 'NO2', '--limit', '167'], env)
    assert.deepEqual(measurementsOffline.measurements, measurements.measurements)

    const concentrations = await runJson<ConcentrationsResult>(['apis', 'run', 'luchtmeetnet.concentrations', '--online', '--persist', '--format', 'json', '--', '--formula', 'NO2', '--latitude', '51.924452', '--longitude', '4.458807', '--limit', '19'], env)
    assert.equal(concentrations.kind, 'luchtmeetnet.concentrations')
    assert.ok(concentrations.concentrations.length > 0)
    const concentrationsOffline = await runJson<ConcentrationsResult>(['apis', 'run', 'luchtmeetnet.concentrations', '--offline', '--format', 'json', '--', '--formula', 'NO2', '--latitude', '51.924452', '--longitude', '4.458807', '--limit', '19'], env)
    assert.deepEqual(concentrationsOffline.concentrations, concentrations.concentrations)

    const text = await runCli(['apis', 'run', 'luchtmeetnet.measurements', '--offline', '--format', 'text', '--', '--station-number', 'NL01485', '--formula', 'NO2', '--limit', '167'], env)
    assert.match(text.stdout, /Luchtmeetnet Measurements/)
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
