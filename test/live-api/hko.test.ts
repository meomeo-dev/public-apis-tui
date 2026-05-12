import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type HkoResult = {
  kind: 'hko.current' | 'hko.forecast'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  current?: { temperature: { data: Array<Record<string, unknown>> } } | undefined
  forecasts?: Array<Record<string, unknown>> | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('HKO live e2e covers current/forecast text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperation('hko.current', ['--lang', 'en', '--limit', '100'], env)
    await assertOperation('hko.forecast', ['--lang', 'en', '--limit', '9'], env)
  })
})

async function assertOperation(operation: HkoResult['kind'], queryArgs: string[], env: NodeJS.ProcessEnv): Promise<void> {
  const online = await runJson<HkoResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(online.kind, operation)
  assert.equal(online.api.provider, 'hko')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)
  if (operation === 'hko.current') {
    assert.ok((online.current?.temperature.data.length ?? 0) > 0)
  } else {
    assert.ok((online.forecasts?.length ?? 0) > 0)
  }

  const offline = await runJson<HkoResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(offline.storage.mode, 'offline')
  if (operation === 'hko.current') {
    assert.deepEqual(offline.current, online.current)
  } else {
    assert.deepEqual(offline.forecasts, online.forecasts)
  }

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...queryArgs], env)
  assert.match(text.stdout, /Hong Kong Observatory/)
  assert.match(text.stdout, /open REST API only/)
  assert.match(text.stdout, /no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-hko-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
