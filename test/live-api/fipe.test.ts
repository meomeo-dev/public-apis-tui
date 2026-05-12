import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type FipeResult = {
  kind: 'fipe.brands' | 'fipe.models' | 'fipe.years' | 'fipe.price'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  items?: Array<Record<string, unknown>> | undefined
  price?: Record<string, unknown> | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Fipe live e2e covers brands, models, years, price, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperation(['fipe.brands', '--query', 'volks', '--limit', '2'], 'fipe.brands', env)
    await assertOperation(['fipe.models', '--brand-code', '59', '--query', 'amarok', '--limit', '2'], 'fipe.models', env)
    await assertOperation(['fipe.years', '--brand-code', '59', '--model-code', '5940', '--limit', '2'], 'fipe.years', env)
    await assertOperation(['fipe.price', '--brand-code', '59', '--model-code', '5940', '--year-code', '2014-3'], 'fipe.price', env)
  })
})

async function assertOperation(argsWithOperation: string[], kind: FipeResult['kind'], env: NodeJS.ProcessEnv): Promise<void> {
  const operation = argsWithOperation[0]
  const queryArgs = argsWithOperation.slice(1)
  if (operation === undefined) throw new Error('missing Fipe operation')
  const online = await runJson<FipeResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(online.kind, kind)
  assert.equal(online.api.provider, 'fipe')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)

  const offline = await runJson<FipeResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(offline.storage.mode, 'offline')
  if (online.items !== undefined) assert.deepEqual(offline.items, online.items)
  if (online.price !== undefined) assert.deepEqual(offline.price, online.price)

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...queryArgs], env)
  assert.match(text.stdout, /Fipe/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-fipe-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
