import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type IcanhazipResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean; transport: string }
  query: { protocol: string }
  ip: { address: string; version: 4 | 6 }
  response: { endpoint: string; contentType?: string | undefined }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Icanhazip live e2e covers json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<IcanhazipResult>(['apis', 'run', 'icanhazip.ip', '--format', 'json', '--', '--protocol', 'ipv4'])
  assert.equal(json.kind, 'icanhazip.ip')
  assert.equal(json.api.provider, 'icanhazip')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS text/plain')
  assert.equal(json.query.protocol, 'ipv4')
  assert.equal(json.ip.version, 4)
  assert.match(json.ip.address, /^(?:\d{1,3}\.){3}\d{1,3}$/u)

  const text = await runCli(['apis', 'run', 'icanhazip.ip', '--format', 'text', '--', '--protocol', 'ipv4'])
  assert.match(text.stdout, /Icanhazip IP Address/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<IcanhazipResult>(['apis', 'run', 'icanhazip.ip', '--online', '--persist', '--format', 'json', '--', '--protocol', 'ipv4'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<IcanhazipResult>(['apis', 'run', 'icanhazip.ip', '--offline', '--format', 'json', '--', '--protocol', 'ipv4'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.ip, online.ip)
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
