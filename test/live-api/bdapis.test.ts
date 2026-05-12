import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('BdAPIs live operations verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const divisions = await runJson<BdApisDivisionsLive>(['apis', 'run', 'bdapis.divisions', '--online', '--persist', '--format', 'json', '--', '--limit', '8'], env)
    assert.equal(divisions.kind, 'bdapis.divisions')
    assert.equal(divisions.api.authentication, 'none')
    assert.equal(divisions.api.usesBrowserClickstream, false)
    assert.ok(divisions.divisions.length > 0)
    assert.equal(divisions.storage.persisted, true)

    const division = await runJson<BdApisDistrictsLive>(['apis', 'run', 'bdapis.division', '--online', '--persist', '--format', 'json', '--', '--division', 'dhaka', '--limit', '13'], env)
    assert.equal(division.kind, 'bdapis.division')
    assert.ok(division.districts.length > 0)

    const district = await runJson<BdApisDistrictLive>(['apis', 'run', 'bdapis.district', '--online', '--persist', '--format', 'json', '--', '--district', 'dhaka'], env)
    assert.equal(district.kind, 'bdapis.district')
    assert.equal(district.district.district, 'Dhaka')
    assert.ok(district.district.upazillas.length > 0)

    const offline = await runJson<BdApisDistrictLive>(['apis', 'run', 'bdapis.district', '--offline', '--format', 'json', '--', '--district', 'dhaka'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.district, district.district)

    const text = await runCli(['apis', 'run', 'bdapis.district', '--offline', '--format', 'text', '--', '--district', 'dhaka'], env)
    assert.match(text.stdout, /BdAPIs District/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)

    const districts = await runJson<BdApisDistrictsLive>(['apis', 'run', 'bdapis.districts', '--online', '--persist', '--format', 'json', '--', '--limit', '5'], env)
    assert.equal(districts.kind, 'bdapis.districts')
    assert.ok(districts.districts.length > 0)
  })
})

type BdApisDivisionsLive = {
  kind: 'bdapis.divisions'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  divisions: Array<Record<string, unknown>>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type BdApisDistrictsLive = {
  kind: 'bdapis.districts' | 'bdapis.division'
  districts: Array<Record<string, unknown>>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type BdApisDistrictLive = {
  kind: 'bdapis.district'
  district: { district: string; upazillas: string[] }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-bdapis-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
