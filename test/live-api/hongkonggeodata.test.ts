import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Hong Kong GeoData live location search verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<HongKongGeoDataLiveResult>(['apis', 'run', 'hongkonggeodata.locationSearch', '--online', '--persist', '--format', 'json', '--', '--query', 'cultural centre', '--limit', '3'], env)
    assert.equal(online.kind, 'hongkonggeodata.locationSearch')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.query, 'cultural centre')
    assert.equal(online.query.limit, 3)
    assert.ok(online.count > 0)
    assert.ok(online.locations.some(location => /Cultural Centre/iu.test(location.nameEnglish)))
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<HongKongGeoDataLiveResult>(['apis', 'run', 'hongkonggeodata.locationSearch', '--offline', '--format', 'json', '--', '--query', 'cultural centre', '--limit', '3'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.locations, online.locations)

    const text = await runCli(['apis', 'run', 'hongkonggeodata.locationSearch', '--offline', '--format', 'text', '--', '--query', 'cultural centre', '--limit', '3'], env)
    assert.match(text.stdout, /Hong Kong GeoData Location Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /Cultural Centre/)
  })
})

type HongKongGeoDataLiveResult = {
  kind: 'hongkonggeodata.locationSearch'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { query: string; limit: number }
  count: number
  locations: Array<{ nameEnglish: string }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-hongkonggeodata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
