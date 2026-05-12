import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type VelibResult = {
  kind: 'velib.stations'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  stations: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Velib live e2e covers stations text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--query', 'Bastille', '--limit', '3']
    const online = await runJson<VelibResult>(['apis', 'run', 'velib.stations', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'velib.stations')
    assert.equal(online.api.provider, 'velib')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage.persisted, true)
    assert.ok(Array.isArray(online.stations))

    const offline = await runJson<VelibResult>(['apis', 'run', 'velib.stations', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.stations, online.stations)

    const text = await runCli(['apis', 'run', 'velib.stations', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /Velib Stations/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-velib-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
