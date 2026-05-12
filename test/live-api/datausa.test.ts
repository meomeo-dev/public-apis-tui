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

type PopulationResult = Record<string, unknown> & {
  kind: 'datausa.population'
  api: PublicApiMeta
  query: { drilldown: string; year: string; geographyId?: string | undefined; limit: number; offset: number }
  rows: Array<{ geography: string; population: number }>
  storage: StorageMeta
}

type GeographiesResult = Record<string, unknown> & {
  kind: 'datausa.geographies'
  api: PublicApiMeta
  members: Array<{ key: string; caption: string }>
  storage: StorageMeta
}

test('Data USA live population verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const args = ['apis', 'run', 'datausa.population', '--online', '--persist', '--format', 'json', '--', '--drilldown', 'State', '--geography-id', '04000US06', '--year', 'latest', '--limit', '100']
    const online = await runJson<PopulationResult>(args, env)
    assert.equal(online.kind, 'datausa.population')
    assert.equal(online.api.provider, 'datausa')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.geographyId, '04000US06')
    assert.equal(online.rows[0]?.geography, 'California')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<PopulationResult>(['apis', 'run', 'datausa.population', '--offline', '--format', 'json', '--', '--drilldown', 'State', '--geography-id', '04000US06', '--year', 'latest', '--limit', '100'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.rows, online.rows)

    const text = await runCli(['apis', 'run', 'datausa.population', '--offline', '--format', 'text', '--', '--drilldown', 'State', '--geography-id', '04000US06', '--year', 'latest', '--limit', '100'], env)
    assert.match(text.stdout, /Data USA Population/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /California/)
  })
})

test('Data USA live geographies verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GeographiesResult>(['apis', 'run', 'datausa.geographies', '--online', '--persist', '--format', 'json', '--', '--level', 'State', '--query', 'California', '--limit', '100'], env)
    assert.equal(online.kind, 'datausa.geographies')
    assert.equal(online.api.provider, 'datausa')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.members[0]?.key, '04000US06')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<GeographiesResult>(['apis', 'run', 'datausa.geographies', '--offline', '--format', 'json', '--', '--level', 'State', '--query', 'California', '--limit', '100'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.members, online.members)

    const text = await runCli(['apis', 'run', 'datausa.geographies', '--offline', '--format', 'text', '--', '--level', 'State', '--query', 'California', '--limit', '100'], env)
    assert.match(text.stdout, /Data USA Geographies/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /California/)
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
