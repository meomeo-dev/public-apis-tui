import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('IPFast live lookup verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<IpfastLiveResult>(['apis', 'run', 'ipfast.lookup', '--format', 'json'])
  assert.equal(json.kind, 'ipfast.lookup')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.match(json.ip.address, /^(?:\d{1,3}\.){3}\d{1,3}$|:/u)
  assert.equal(json.response.endpoint, 'https://ipfast.dev/json')

  const text = await runCli(['apis', 'run', 'ipfast.lookup', '--format', 'text'])
  assert.match(text.stdout, /IPFast IP Geo Lookup/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<IpfastLiveResult>(['apis', 'run', 'ipfast.lookup', '--online', '--persist', '--format', 'json'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<IpfastLiveResult>(['apis', 'run', 'ipfast.lookup', '--offline', '--format', 'json'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.ip, online.ip)
    assert.deepEqual(offline.geo, online.geo)
    assert.deepEqual(offline.network, online.network)
    assert.deepEqual(offline.locale, online.locale)
  })
})

type IpfastLiveResult = {
  kind: 'ipfast.lookup'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  ip: {
    address: string
  }
  geo: Record<string, unknown>
  network: Record<string, unknown>
  locale: Record<string, unknown>
  response: {
    endpoint: string
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
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
