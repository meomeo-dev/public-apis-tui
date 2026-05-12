import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type OpenSkyStatesResult = {
  kind: 'opensky.states'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { lamin: number; lomin: number; lamax: number; lomax: number; limit: number }
  aircraft: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('OpenSky live e2e covers states text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--lamin', '45.8', '--lomin', '-124', '--lamax', '49.2', '--lomax', '-116', '--limit', '2']
    const online = await runJson<OpenSkyStatesResult>(['apis', 'run', 'opensky.states', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'opensky.states')
    assert.equal(online.api.provider, 'opensky')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.limit, 2)
    assert.equal(online.storage.persisted, true)
    assert.ok(Array.isArray(online.aircraft))

    const offline = await runJson<OpenSkyStatesResult>(['apis', 'run', 'opensky.states', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.aircraft, online.aircraft)

    const text = await runCli(['apis', 'run', 'opensky.states', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /OpenSky State Vectors/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-opensky-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
