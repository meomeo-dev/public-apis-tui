import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type DebtResult = Record<string, unknown> & {
  kind: 'fedtreasury.debt'
  api: PublicApiMeta
  rows: Array<{ recordDate: string; totalPublicDebtOutstanding?: number }>
  storage: StorageMeta
}

type RatesResult = Record<string, unknown> & {
  kind: 'fedtreasury.rates'
  api: PublicApiMeta
  rows: Array<{ recordDate: string; securityDescription: string; averageInterestRate?: number }>
  storage: StorageMeta
}

test('Fed Treasury live debt verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<DebtResult>(['apis', 'run', 'fedtreasury.debt', '--online', '--persist', '--format', 'json', '--', '--page-size', '1'], env)
    assert.equal(online.kind, 'fedtreasury.debt')
    assert.equal(online.api.provider, 'fedtreasury')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.ok(online.rows[0]?.recordDate)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<DebtResult>(['apis', 'run', 'fedtreasury.debt', '--offline', '--format', 'json', '--', '--page-size', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.rows, online.rows)

    const text = await runCli(['apis', 'run', 'fedtreasury.debt', '--offline', '--format', 'text', '--', '--page-size', '1'], env)
    assert.match(text.stdout, /Fed Treasury Debt/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('Fed Treasury live rates verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<RatesResult>(['apis', 'run', 'fedtreasury.rates', '--online', '--persist', '--format', 'json', '--', '--page-size', '5'], env)
    assert.equal(online.kind, 'fedtreasury.rates')
    assert.equal(online.api.provider, 'fedtreasury')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.ok(online.rows[0]?.securityDescription)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<RatesResult>(['apis', 'run', 'fedtreasury.rates', '--offline', '--format', 'json', '--', '--page-size', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.rows, online.rows)

    const text = await runCli(['apis', 'run', 'fedtreasury.rates', '--offline', '--format', 'text', '--', '--page-size', '5'], env)
    assert.match(text.stdout, /Fed Treasury Average Rates/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
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
