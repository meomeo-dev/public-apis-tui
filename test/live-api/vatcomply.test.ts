import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type VatComplyResult = {
  kind: 'vatcomply.rates' | 'vatcomply.vatRates' | 'vatcomply.geolocate' | 'vatcomply.vat'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  rates?: Array<Record<string, unknown>> | undefined
  location?: Record<string, unknown> | undefined
  validation?: Record<string, unknown> | undefined
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('VATComply live e2e covers rates, VAT rates, geolocation, VAT validation, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperationReplay('vatcomply.rates', ['--base', 'USD', '--symbols', 'EUR,GBP', '--limit', '33'], env, result => {
      assert.ok((result.rates ?? []).some(rate => rate.code === 'EUR'))
    })
    await assertOperationReplay('vatcomply.vatRates', ['--country-code', 'DE', '--limit', '27'], env, result => {
      assert.ok((result.rates ?? []).some(rate => rate.countryCode === 'DE'))
    })
    await assertOperationReplay('vatcomply.geolocate', [], env, result => {
      assert.equal(typeof result.location?.countryCode, 'string')
    })
    await assertOperationReplay('vatcomply.vat', ['--vat-number', 'DE123456789'], env, result => {
      assert.equal(result.validation?.countryCode, 'DE')
      assert.equal(typeof result.validation?.valid, 'boolean')
    })
  })
})

async function assertOperationReplay(operation: VatComplyResult['kind'], args: string[], env: NodeJS.ProcessEnv, assertPayload: (result: VatComplyResult) => void): Promise<void> {
  const online = await runJson<VatComplyResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...args], env)
  assert.equal(online.kind, operation)
  assert.equal(online.api.provider, 'vatcomply')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)
  assertPayload(online)

  const offline = await runJson<VatComplyResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...args], env)
  assert.equal(offline.storage.mode, 'offline')
  if (operation === 'vatcomply.rates' || operation === 'vatcomply.vatRates') assert.deepEqual(offline.rates, online.rates)
  if (operation === 'vatcomply.geolocate') assert.deepEqual(offline.location, online.location)
  if (operation === 'vatcomply.vat') assert.deepEqual(offline.validation, online.validation)

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...args], env)
  assert.match(text.stdout, /VATComply/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-vatcomply-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
