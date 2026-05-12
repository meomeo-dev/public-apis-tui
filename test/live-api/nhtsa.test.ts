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

type DecodeResult = Record<string, unknown> & {
  kind: 'nhtsa.decodeVin'
  api: PublicApiMeta
  query: { vin: string; modelYear?: number | undefined }
  decode: Record<string, unknown>
  storage: StorageMeta
}

type MakesResult = Record<string, unknown> & {
  kind: 'nhtsa.makesForType'
  api: PublicApiMeta
  query: { vehicleType: string; limit: number }
  pagination: { returned: number; upstreamTotal: number; limit: number }
  makes: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('NHTSA live decode VIN verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<DecodeResult>(['apis', 'run', 'nhtsa.decodeVin', '--online', '--persist', '--format', 'json', '--', '--vin', '1HGCM82633A004352', '--model-year', '2003'], env)
    assert.equal(online.kind, 'nhtsa.decodeVin')
    assert.equal(online.api.provider, 'nhtsa')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.vin, '1HGCM82633A004352')
    assert.equal(online.decode.make, 'HONDA')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<DecodeResult>(['apis', 'run', 'nhtsa.decodeVin', '--offline', '--format', 'json', '--', '--vin', '1HGCM82633A004352', '--model-year', '2003'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.decode, online.decode)

    const text = await runCli(['apis', 'run', 'nhtsa.decodeVin', '--offline', '--format', 'text', '--', '--vin', '1HGCM82633A004352', '--model-year', '2003'], env)
    assert.match(text.stdout, /NHTSA vPIC VIN Decode/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('NHTSA live makes for type verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<MakesResult>(['apis', 'run', 'nhtsa.makesForType', '--online', '--persist', '--format', 'json', '--', '--vehicle-type', 'car', '--limit', '5'], env)
    assert.equal(online.kind, 'nhtsa.makesForType')
    assert.equal(online.api.provider, 'nhtsa')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.vehicleType, 'car')
    assert.equal(online.pagination.limit, 5)
    assert.ok(online.makes.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<MakesResult>(['apis', 'run', 'nhtsa.makesForType', '--offline', '--format', 'json', '--', '--vehicle-type', 'car', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.makes, online.makes)

    const text = await runCli(['apis', 'run', 'nhtsa.makesForType', '--offline', '--format', 'text', '--', '--vehicle-type', 'car', '--limit', '5'], env)
    assert.match(text.stdout, /NHTSA vPIC Makes For Vehicle Type/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024,
  })
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
