import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type CloudflareTraceResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean; transport: string }
  query: { endpoint: string; url: string; includeRaw: boolean }
  trace: { ip?: string | undefined; colo?: string | undefined; http?: string | undefined; tls?: string | undefined }
  fields: Record<string, string>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Cloudflare Trace live e2e covers json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<CloudflareTraceResult>(['apis', 'run', 'cloudflaretrace.trace', '--format', 'json', '--', '--endpoint', 'cloudflare.com'])
  assert.equal(json.kind, 'cloudflaretrace.trace')
  assert.equal(json.api.provider, 'cloudflare-trace')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS text/plain key-value')
  assert.equal(json.query.endpoint, 'cloudflare.com')
  assert.ok(Object.keys(json.fields).length > 0)
  assert.equal(typeof json.trace.ip, 'string')

  const text = await runCli(['apis', 'run', 'cloudflaretrace.trace', '--format', 'text', '--', '--endpoint', 'cloudflare.com'])
  assert.match(text.stdout, /Cloudflare Trace/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /HTTPS text\/plain key-value/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<CloudflareTraceResult>(['apis', 'run', 'cloudflaretrace.trace', '--online', '--persist', '--format', 'json', '--', '--endpoint', 'cloudflare.com'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<CloudflareTraceResult>(['apis', 'run', 'cloudflaretrace.trace', '--offline', '--format', 'json', '--', '--endpoint', 'cloudflare.com'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.fields, online.fields)
    assert.deepEqual(offline.trace, online.trace)
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
