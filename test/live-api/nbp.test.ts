import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type NbpResult = {
  kind: 'nbp.tables' | 'nbp.history'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  rates: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('NBP live e2e covers tables, history, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperationReplay('nbp.tables', ['--table', 'A', '--code', 'USD', '--limit', '120'], env, result => {
      assert.ok(result.rates.some(rate => rate.code === 'USD'))
    })
    await assertOperationReplay('nbp.history', ['--table', 'A', '--code', 'USD', '--count', '93'], env, result => {
      assert.ok(result.rates.length > 0)
      assert.equal(result.rates.every(rate => typeof rate.effectiveDate === 'string'), true)
    })
  })
})

async function assertOperationReplay(operation: NbpResult['kind'], args: string[], env: NodeJS.ProcessEnv, assertPayload: (result: NbpResult) => void): Promise<void> {
  const online = await runJson<NbpResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...args], env)
  assert.equal(online.kind, operation)
  assert.equal(online.api.provider, 'nbp')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)
  assertPayload(online)

  const offline = await runJson<NbpResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...args], env)
  assert.equal(offline.storage.mode, 'offline')
  assert.deepEqual(offline.rates, online.rates)

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...args], env)
  assert.match(text.stdout, /NBP/)
  assert.match(text.stdout, /open REST API only/)
  assert.match(text.stdout, /no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
}

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 8 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-nbp-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
