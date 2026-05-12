import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type EnturResult = {
  kind: 'entur.places' | 'entur.departures'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  places?: Array<Record<string, unknown>> | undefined
  departures?: Array<Record<string, unknown>> | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Entur live e2e covers places text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--text', 'Oslo S', '--size', '3']
    const online = await runJson<EnturResult>(['apis', 'run', 'entur.places', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'entur.places')
    assert.equal(online.api.provider, 'entur')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage.persisted, true)
    assert.ok(Array.isArray(online.places))

    const offline = await runJson<EnturResult>(['apis', 'run', 'entur.places', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.places, online.places)

    const text = await runCli(['apis', 'run', 'entur.places', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /Entur Places/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

test('Entur live e2e covers departures text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--stop-place-id', 'NSR:StopPlace:59872', '--departures', '3']
    const online = await runJson<EnturResult>(['apis', 'run', 'entur.departures', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'entur.departures')
    assert.equal(online.api.provider, 'entur')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage.persisted, true)
    assert.ok(Array.isArray(online.departures))

    const offline = await runJson<EnturResult>(['apis', 'run', 'entur.departures', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.departures, online.departures)

    const text = await runCli(['apis', 'run', 'entur.departures', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /Entur Departures/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-entur-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
