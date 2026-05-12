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

type ChurchCalendarDayResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { date: string; language: string; calendar: string }
  day: { date: string; celebrations: Array<{ title: string }> }
  storage: StorageMeta
}

type ChurchCalendarMonthResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { year: number; month: number; language: string; calendar: string }
  count: number
  days: Array<{ date: string; celebrations: Array<{ title: string }> }>
  storage: StorageMeta
}

test('Church Calendar live e2e covers day json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<ChurchCalendarDayResult>([
    'apis',
    'run',
    'churchcalendar.day',
    '--format',
    'json',
    '--',
    '--date',
    '2026-05-10',
  ])
  assert.equal(json.kind, 'churchcalendar.day')
  assert.equal(json.api.provider, 'churchcalendar')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTP JSON')
  assert.equal(json.query.date, '2026-05-10')
  assert.equal(json.day.date, '2026-05-10')
  assert.ok(json.day.celebrations.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'churchcalendar.day',
    '--format',
    'text',
    '--',
    '--date',
    '2026-05-10',
  ])
  assert.match(text.stdout, /Church Calendar Day/)
  assert.match(text.stdout, /HTTP JSON · open API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ChurchCalendarDayResult>([
      'apis',
      'run',
      'churchcalendar.day',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--date',
      '2026-05-10',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ChurchCalendarDayResult>([
      'apis',
      'run',
      'churchcalendar.day',
      '--offline',
      '--format',
      'json',
      '--',
      '--date',
      '2026-05-10',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.day, online.day)
  })
})

test('Church Calendar live e2e covers month json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<ChurchCalendarMonthResult>([
    'apis',
    'run',
    'churchcalendar.month',
    '--format',
    'json',
    '--',
    '--year',
    '2026',
    '--month',
    '5',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'churchcalendar.month')
  assert.equal(json.api.provider, 'churchcalendar')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTP JSON')
  assert.equal(json.query.year, 2026)
  assert.equal(json.query.month, 5)
  assert.equal(json.count, 2)
  assert.equal(json.days.length, 2)

  const text = await runCli([
    'apis',
    'run',
    'churchcalendar.month',
    '--format',
    'text',
    '--',
    '--year',
    '2026',
    '--month',
    '5',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /Church Calendar Month/)
  assert.match(text.stdout, /HTTP JSON · open API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ChurchCalendarMonthResult>([
      'apis',
      'run',
      'churchcalendar.month',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--year',
      '2026',
      '--month',
      '5',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ChurchCalendarMonthResult>([
      'apis',
      'run',
      'churchcalendar.month',
      '--offline',
      '--format',
      'json',
      '--',
      '--year',
      '2026',
      '--month',
      '5',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.days, online.days)
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
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
