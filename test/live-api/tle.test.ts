import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type TleSearchResult = Record<string, unknown> & {
  kind: 'tle.search'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { search: string; page: number; pageSize: number }
  pagination: { returned: number; totalItems: number; page: number }
  satellites: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

type TleSatelliteResult = Record<string, unknown> & {
  kind: 'tle.satellite'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { satelliteId: number }
  satellite: Record<string, unknown>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('TLE live e2e covers search, satellite, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const searchArgs = ['--search', 'ISS', '--page', '1']
    const search = await runJson<TleSearchResult>([
      'apis',
      'run',
      'tle.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...searchArgs,
    ], env)
    assert.equal(search.kind, 'tle.search')
    assert.equal(search.api.provider, 'tle')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.query.pageSize, 20)
    assert.equal(search.satellites.length > 0, true)
    assert.equal(search.storage.persisted, true)

    const offlineSearch = await runJson<TleSearchResult>([
      'apis',
      'run',
      'tle.search',
      '--offline',
      '--format',
      'json',
      '--',
      ...searchArgs,
    ], env)
    assert.equal(offlineSearch.storage.mode, 'offline')
    assert.deepEqual(offlineSearch.satellites, search.satellites)

    const satelliteArgs = ['--satellite-id', '25544']
    const satellite = await runJson<TleSatelliteResult>([
      'apis',
      'run',
      'tle.satellite',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...satelliteArgs,
    ], env)
    assert.equal(satellite.kind, 'tle.satellite')
    assert.equal(satellite.satellite.satelliteId, 25544)
    assert.equal(typeof satellite.satellite.line1, 'string')

    const offlineSatellite = await runJson<TleSatelliteResult>([
      'apis',
      'run',
      'tle.satellite',
      '--offline',
      '--format',
      'json',
      '--',
      ...satelliteArgs,
    ], env)
    assert.equal(offlineSatellite.storage.mode, 'offline')
    assert.deepEqual(offlineSatellite.satellite, satellite.satellite)

    const text = await runCli([
      'apis',
      'run',
      'tle.search',
      '--offline',
      '--format',
      'text',
      '--',
      ...searchArgs,
    ], env)
    assert.match(text.stdout, /TLE Satellite Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-tle-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
