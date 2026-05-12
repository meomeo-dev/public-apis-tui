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
  transport: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type IsdayoffDayResult = Record<string, unknown> & {
  kind: 'isdayoff.day'
  api: PublicApiMeta
  query: { date: string; countryCode: string }
  status: { code: string; label: string; date: string }
  storage: StorageMeta
}

type IsdayoffRangeResult = Record<string, unknown> & {
  kind: 'isdayoff.range'
  api: PublicApiMeta
  query: { from: string; to: string; days: number; countryCode: string }
  count: number
  days: Array<{ date: string; code: string; label: string }>
  storage: StorageMeta
}

test('isDayOff live e2e covers day, range, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const day = await runJson<IsdayoffDayResult>([
      'apis',
      'run',
      'isdayoff.day',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--date',
      '2026-05-11',
      '--country-code',
      'ru',
    ], env)
    assert.equal(day.kind, 'isdayoff.day')
    assert.equal(day.api.provider, 'isdayoff')
    assert.equal(day.api.authentication, 'none')
    assert.equal(day.api.usesBrowserClickstream, false)
    assert.equal(day.api.transport, 'HTTPS text/plain status API')
    assert.equal(day.query.date, '2026-05-11')
    assert.match(day.status.code, /^[01248]$/u)
    assert.equal(day.storage.persisted, true)

    const offlineDay = await runJson<IsdayoffDayResult>([
      'apis',
      'run',
      'isdayoff.day',
      '--offline',
      '--format',
      'json',
      '--',
      '--date',
      '2026-05-11',
      '--country-code',
      'ru',
    ], env)
    assert.equal(offlineDay.storage.mode, 'offline')
    assert.deepEqual(offlineDay.status, day.status)

    const range = await runJson<IsdayoffRangeResult>([
      'apis',
      'run',
      'isdayoff.range',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--from',
      '2026-05-10',
      '--days',
      '3',
      '--country-code',
      'ru',
    ], env)
    assert.equal(range.kind, 'isdayoff.range')
    assert.equal(range.count, 3)
    assert.equal(range.days.length, 3)
    assert.deepEqual(range.days.map(dayStatus => dayStatus.date), [
      '2026-05-10',
      '2026-05-11',
      '2026-05-12',
    ])
    assert.equal(range.storage.persisted, true)

    const offlineRange = await runJson<IsdayoffRangeResult>([
      'apis',
      'run',
      'isdayoff.range',
      '--offline',
      '--format',
      'json',
      '--',
      '--from',
      '2026-05-10',
      '--days',
      '3',
      '--country-code',
      'ru',
    ], env)
    assert.equal(offlineRange.storage.mode, 'offline')
    assert.deepEqual(offlineRange.days, range.days)

    const text = await runCli([
      'apis',
      'run',
      'isdayoff.range',
      '--offline',
      '--format',
      'text',
      '--',
      '--from',
      '2026-05-10',
      '--days',
      '3',
      '--country-code',
      'ru',
    ], env)
    assert.match(text.stdout, /isDayOff Range/)
    assert.match(text.stdout, /open API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /2026-05-11/)
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 64 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-isdayoff-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
