import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('bng2latlong live convert verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<Bng2LatLongLive>(['apis', 'run', 'bng2latlong.convert', '--online', '--persist', '--format', 'json', '--', '--easting', '319421', '--northing', '174588'], env)
    assert.equal(online.kind, 'bng2latlong.convert')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.conversion.easting, 319421)
    assert.equal(online.conversion.northing, 174588)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<Bng2LatLongLive>(['apis', 'run', 'bng2latlong.convert', '--offline', '--format', 'json', '--', '--easting', '319421', '--northing', '174588'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.conversion, online.conversion)

    const text = await runCli(['apis', 'run', 'bng2latlong.convert', '--offline', '--format', 'text', '--', '--easting', '319421', '--northing', '174588'], env)
    assert.match(text.stdout, /bng2latlong Convert/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /WGS84/)
  })
})

type Bng2LatLongLive = {
  kind: 'bng2latlong.convert'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  conversion: { easting: number; northing: number; latitude: number; longitude: number }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-bng2latlong-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
