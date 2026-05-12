import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type CurrencyApiResult = {
  kind: 'currencyapi.currencies' | 'currencyapi.rates'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  currencies?: Array<Record<string, unknown>> | undefined
  rates?: Array<Record<string, unknown>> | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Currency-api live e2e covers currencies, rates, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperationReplay('currencyapi.currencies', ['--limit', '301'], env, result => {
      assert.ok((result.currencies ?? []).some(currency => currency.code === 'usd'))
    })
    await assertOperationReplay('currencyapi.rates', ['--base', 'usd', '--symbols', 'eur,jpy,btc', '--limit', '301'], env, result => {
      assert.ok((result.rates ?? []).some(rate => rate.code === 'eur'))
    })
  })
})

async function assertOperationReplay(operation: CurrencyApiResult['kind'], args: string[], env: NodeJS.ProcessEnv, assertPayload: (result: CurrencyApiResult) => void): Promise<void> {
  const online = await runJson<CurrencyApiResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...args], env)
  assert.equal(online.kind, operation)
  assert.equal(online.api.provider, 'currencyapi')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)
  assertPayload(online)

  const offline = await runJson<CurrencyApiResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...args], env)
  assert.equal(offline.storage.mode, 'offline')
  if (operation === 'currencyapi.currencies') assert.deepEqual(offline.currencies, online.currencies)
  if (operation === 'currencyapi.rates') assert.deepEqual(offline.rates, online.rates)

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...args], env)
  assert.match(text.stdout, /Currency-api/)
  assert.match(text.stdout, /open REST API only/)
  assert.match(text.stdout, /no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
}

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-currencyapi-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
