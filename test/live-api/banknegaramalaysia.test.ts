import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type ApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }
type OprResult = Record<string, unknown> & { kind: 'banknegaramalaysia.opr'; api: ApiMeta; opr: Record<string, unknown>; storage: StorageMeta }
type RatesResult = Record<string, unknown> & { kind: 'banknegaramalaysia.exchangeRates'; api: ApiMeta; rates: unknown[]; storage: StorageMeta }
type GoldResult = Record<string, unknown> & { kind: 'banknegaramalaysia.kijangEmas'; api: ApiMeta; kijangEmas: Record<string, unknown>; storage: StorageMeta }

test('Bank Negara Malaysia live e2e covers OPR, exchange rates, Kijang Emas, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-bnm-'))
  try {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const opr = await runJson<OprResult>(['apis', 'run', 'banknegaramalaysia.opr', '--online', '--persist', '--format', 'json'], env)
    assert.equal(opr.kind, 'banknegaramalaysia.opr')
    assert.equal(opr.api.provider, 'banknegaramalaysia')
    assert.equal(opr.api.authentication, 'none')
    assert.equal(opr.api.usesBrowserClickstream, false)
    assert.equal(opr.storage.persisted, true)
    const oprOffline = await runJson<OprResult>(['apis', 'run', 'banknegaramalaysia.opr', '--offline', '--format', 'json'], env)
    assert.deepEqual(oprOffline.opr, opr.opr)

    const rates = await runJson<RatesResult>(['apis', 'run', 'banknegaramalaysia.exchangeRates', '--online', '--persist', '--format', 'json', '--', '--limit', '27'], env)
    assert.equal(rates.kind, 'banknegaramalaysia.exchangeRates')
    assert.ok(rates.rates.length > 0)
    const ratesOffline = await runJson<RatesResult>(['apis', 'run', 'banknegaramalaysia.exchangeRates', '--offline', '--format', 'json', '--', '--limit', '27'], env)
    assert.deepEqual(ratesOffline.rates, rates.rates)

    const gold = await runJson<GoldResult>(['apis', 'run', 'banknegaramalaysia.kijangEmas', '--online', '--persist', '--format', 'json'], env)
    assert.equal(gold.kind, 'banknegaramalaysia.kijangEmas')
    assert.equal(gold.api.usesBrowserClickstream, false)
    const goldOffline = await runJson<GoldResult>(['apis', 'run', 'banknegaramalaysia.kijangEmas', '--offline', '--format', 'json'], env)
    assert.deepEqual(goldOffline.kijangEmas, gold.kijangEmas)

    const text = await runCli(['apis', 'run', 'banknegaramalaysia.exchangeRates', '--offline', '--format', 'text', '--', '--limit', '27'], env)
    assert.match(text.stdout, /Bank Negara Malaysia Exchange Rates/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
