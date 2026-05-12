import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type LaMetroResult = {
  kind: 'lametro.routes' | 'lametro.stops'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  routes?: Array<Record<string, unknown>> | undefined
  stops?: Array<Record<string, unknown>> | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('LA Metro live e2e covers routes text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--query', 'wilshire', '--route-type', 'bus', '--limit', '2']
    const online = await runJson<LaMetroResult>(['apis', 'run', 'lametro.routes', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'lametro.routes')
    assert.equal(online.api.provider, 'lametro')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage.persisted, true)
    assert.ok(Array.isArray(online.routes))

    const offline = await runJson<LaMetroResult>(['apis', 'run', 'lametro.routes', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.routes, online.routes)

    const text = await runCli(['apis', 'run', 'lametro.routes', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /LA Metro Routes/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

test('LA Metro live e2e covers stops text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--route-code', '720', '--day-type', 'all', '--limit', '2']
    const online = await runJson<LaMetroResult>(['apis', 'run', 'lametro.stops', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'lametro.stops')
    assert.equal(online.api.provider, 'lametro')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage.persisted, true)
    assert.ok(Array.isArray(online.stops))

    const offline = await runJson<LaMetroResult>(['apis', 'run', 'lametro.stops', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.stops, online.stops)

    const text = await runCli(['apis', 'run', 'lametro.stops', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /LA Metro Route Stops/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-lametro-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
