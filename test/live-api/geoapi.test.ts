import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('GeoApi live operations verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const communes = await runJson<GeoApiCommunesLive>(['apis', 'run', 'geoapi.communes', '--online', '--persist', '--format', 'json', '--', '--query', 'Paris', '--limit', '3', '--include-geometry', 'true'], env)
    assert.equal(communes.kind, 'geoapi.communes')
    assert.equal(communes.api.authentication, 'none')
    assert.equal(communes.api.usesBrowserClickstream, false)
    assert.ok(communes.communes.some(commune => commune.code === '75056'))
    assert.equal(communes.storage.persisted, true)

    const communesOffline = await runJson<GeoApiCommunesLive>(['apis', 'run', 'geoapi.communes', '--offline', '--format', 'json', '--', '--query', 'Paris', '--limit', '3', '--include-geometry', 'true'], env)
    assert.equal(communesOffline.storage.mode, 'offline')
    assert.deepEqual(communesOffline.communes, communes.communes)

    const departments = await runJson<GeoApiDepartmentsLive>(['apis', 'run', 'geoapi.departments', '--online', '--persist', '--format', 'json', '--', '--region-code', '11', '--limit', '5'], env)
    assert.equal(departments.kind, 'geoapi.departments')
    assert.equal(departments.api.authentication, 'none')
    assert.ok(departments.departments.length > 0)

    const regions = await runJson<GeoApiRegionsLive>(['apis', 'run', 'geoapi.regions', '--online', '--persist', '--format', 'json', '--', '--limit', '18'], env)
    assert.equal(regions.kind, 'geoapi.regions')
    assert.equal(regions.api.usesBrowserClickstream, false)
    assert.ok(regions.regions.some(region => region.code === '11'))

    const text = await runCli(['apis', 'run', 'geoapi.communes', '--offline', '--format', 'text', '--', '--query', 'Paris', '--limit', '3', '--include-geometry', 'true'], env)
    assert.match(text.stdout, /GeoApi Communes/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /Paris/)
  })
})

type GeoApiCommunesLive = {
  kind: 'geoapi.communes'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  communes: Array<{ code: string }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type GeoApiDepartmentsLive = {
  kind: 'geoapi.departments'
  api: { authentication: 'none' }
  departments: Array<{ code: string }>
}

type GeoApiRegionsLive = {
  kind: 'geoapi.regions'
  api: { usesBrowserClickstream: false }
  regions: Array<{ code: string }>
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-geoapi-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
