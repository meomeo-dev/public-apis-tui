import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type OpenSenseMapResult = {
  kind: 'opensensemap.stats' | 'opensensemap.boxes' | 'opensensemap.sensors'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  stats?: Record<string, unknown> | undefined
  boxes?: Array<Record<string, unknown>> | undefined
  box?: { sensors?: Array<Record<string, unknown>> | undefined } | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('openSenseMap live e2e covers stats/boxes/sensors text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperation('opensensemap.stats', [], env)
    await assertOperation('opensensemap.boxes', ['--name', 'Berlin', '--limit', '5'], env)
    await assertOperation('opensensemap.sensors', ['--box-id', '5391be52a8341554157792e6', '--count', '1'], env)
  })
})

async function assertOperation(operation: OpenSenseMapResult['kind'], queryArgs: string[], env: NodeJS.ProcessEnv): Promise<void> {
  const online = await runJson<OpenSenseMapResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(online.kind, operation)
  assert.equal(online.api.provider, 'opensensemap')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)
  if (operation === 'opensensemap.stats') {
    assert.ok(online.stats !== undefined)
  } else if (operation === 'opensensemap.boxes') {
    assert.ok((online.boxes?.length ?? 0) > 0)
  } else {
    assert.ok((online.box?.sensors?.length ?? 0) > 0)
  }

  const offline = await runJson<OpenSenseMapResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(offline.storage.mode, 'offline')
  assert.deepEqual(readStablePayload(offline), readStablePayload(online))

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...queryArgs], env)
  assert.match(text.stdout, /openSenseMap/)
  assert.match(text.stdout, /open REST API only/)
  assert.match(text.stdout, /no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
}

function readStablePayload(result: OpenSenseMapResult): unknown {
  return result.stats ?? result.boxes ?? result.box
}

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-opensensemap-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
