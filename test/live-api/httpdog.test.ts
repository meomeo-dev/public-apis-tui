import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type HttpDogStatusResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { statusCode: number }
  status: {
    code: number
    title: string
    images: { jpg: string }
  }
  storage: StorageMeta
}

test('HTTP Dog live e2e covers every operation', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<HttpDogStatusResult>(['apis', 'run', 'httpdog.status', '--format', 'json', '--', '--status-code', '404'])
  assert.equal(json.kind, 'httpdog.status')
  assert.equal(json.api.provider, 'http-dog')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.statusCode, 404)
  assert.equal(json.status.code, 404)
  assert.match(json.status.images.jpg, /^https:\/\/http\.dog\/404\.jpg$/u)

  const text = await runCli(['apis', 'run', 'httpdog.status', '--format', 'text', '--', '--status-code', '404'])
  assert.match(text.stdout, /HTTP Dog Status/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<HttpDogStatusResult>(['apis', 'run', 'httpdog.status', '--online', '--persist', '--format', 'json', '--', '--status-code', '404'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<HttpDogStatusResult>(['apis', 'run', 'httpdog.status', '--offline', '--format', 'json', '--', '--status-code', '404'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.status, online.status)
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
    maxBuffer: 1024 * 1024,
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
