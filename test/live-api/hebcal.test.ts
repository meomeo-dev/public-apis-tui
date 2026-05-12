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
  calendarDaysCap?: number | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type HebcalConvertResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { date: string; strict: boolean }
  conversion: { gregorianDate: string; hebrewText: string; events: string[] }
  storage: StorageMeta
}

type HebcalCalendarResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { start: string; end: string; days: number; israel: boolean }
  count: number
  events: Array<{ title: string; date: string; category?: string | undefined }>
  storage: StorageMeta
}

test('Hebcal live e2e covers convert json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const args = ['apis', 'run', 'hebcal.convert', '--format', 'json', '--', '--date', '2026-05-03', '--strict', 'true']
  const json = await runJson<HebcalConvertResult>(args)
  assert.equal(json.kind, 'hebcal.convert')
  assert.equal(json.api.provider, 'hebcal')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.date, '2026-05-03')
  assert.equal(json.conversion.gregorianDate, '2026-05-03')
  assert.match(json.conversion.hebrewText, /תשפ/u)

  const text = await runCli(['apis', 'run', 'hebcal.convert', '--format', 'text', '--', '--date', '2026-05-03'])
  assert.match(text.stdout, /Hebcal Date Conversion/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<HebcalConvertResult>(['apis', 'run', 'hebcal.convert', '--online', '--persist', '--format', 'json', '--', '--date', '2026-05-03'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<HebcalConvertResult>(['apis', 'run', 'hebcal.convert', '--offline', '--format', 'json', '--', '--date', '2026-05-03'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.conversion, online.conversion)
  })
})

test('Hebcal live e2e covers calendar json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const args = ['apis', 'run', 'hebcal.calendar', '--format', 'json', '--', '--start', '2026-05-03', '--days', '8']
  const json = await runJson<HebcalCalendarResult>(args)
  assert.equal(json.kind, 'hebcal.calendar')
  assert.equal(json.api.provider, 'hebcal')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.calendarDaysCap, 180)
  assert.equal(json.query.days, 8)
  assert.ok(json.count > 0)
  assert.ok(json.events.some(event => event.title.length > 0 && event.date.startsWith('2026-05-')))

  const text = await runCli(['apis', 'run', 'hebcal.calendar', '--format', 'text', '--', '--start', '2026-05-03', '--days', '8'])
  assert.match(text.stdout, /Hebcal Jewish Calendar/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<HebcalCalendarResult>(['apis', 'run', 'hebcal.calendar', '--online', '--persist', '--format', 'json', '--', '--start', '2026-05-03', '--days', '8'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<HebcalCalendarResult>(['apis', 'run', 'hebcal.calendar', '--offline', '--format', 'json', '--', '--start', '2026-05-03', '--days', '8'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.events, online.events)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
  })
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
