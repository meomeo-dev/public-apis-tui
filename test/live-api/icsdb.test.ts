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

type IcsdbCalendarsResult = Record<string, unknown> & {
  kind: 'icsdb.calendars'
  api: PublicApiMeta
  query: { locale: string; query?: string | undefined; limit: number }
  count: number
  totalCalendars: number
  calendars: Array<{ slug: string; sourceUrl: string }>
  storage: StorageMeta
}

type IcsdbEventsResult = Record<string, unknown> & {
  kind: 'icsdb.events'
  api: PublicApiMeta
  query: { locale: string; slug: string; limit: number }
  calendar: { title?: string | undefined; sourceUrl: string }
  count: number
  totalEvents: number
  events: Array<{ summary: string; startDate?: string | undefined }>
  storage: StorageMeta
}

test('icsdb live e2e covers calendars, events, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const calendars = await runJson<IcsdbCalendarsResult>([
      'apis',
      'run',
      'icsdb.calendars',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--locale',
      'en-US',
      '--query',
      'us-all',
      '--limit',
      '5',
    ], env)
    assert.equal(calendars.kind, 'icsdb.calendars')
    assert.equal(calendars.api.provider, 'icsdb')
    assert.equal(calendars.api.authentication, 'none')
    assert.equal(calendars.api.usesBrowserClickstream, false)
    assert.equal(calendars.api.transport, 'HTTPS GitHub API + raw ICS text')
    assert.equal(calendars.query.locale, 'en-US')
    assert.equal(calendars.count > 0, true)
    assert.equal(calendars.calendars.some(entry => entry.slug === 'us-all'), true)
    assert.equal(calendars.storage.persisted, true)

    const offlineCalendars = await runJson<IcsdbCalendarsResult>([
      'apis',
      'run',
      'icsdb.calendars',
      '--offline',
      '--format',
      'json',
      '--',
      '--locale',
      'en-US',
      '--query',
      'us-all',
      '--limit',
      '5',
    ], env)
    assert.equal(offlineCalendars.storage.mode, 'offline')
    assert.deepEqual(offlineCalendars.calendars, calendars.calendars)

    const events = await runJson<IcsdbEventsResult>([
      'apis',
      'run',
      'icsdb.events',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--locale',
      'en-US',
      '--slug',
      'us-all',
      '--limit',
      '5',
    ], env)
    assert.equal(events.kind, 'icsdb.events')
    assert.equal(events.api.provider, 'icsdb')
    assert.equal(events.api.authentication, 'none')
    assert.equal(events.api.usesBrowserClickstream, false)
    assert.match(events.calendar.title ?? '', /US/u)
    assert.equal(events.events.length > 0, true)
    assert.equal(events.events.some(entry => /Day/u.test(entry.summary)), true)
    assert.equal(events.storage.persisted, true)

    const offlineEvents = await runJson<IcsdbEventsResult>([
      'apis',
      'run',
      'icsdb.events',
      '--offline',
      '--format',
      'json',
      '--',
      '--locale',
      'en-US',
      '--slug',
      'us-all',
      '--limit',
      '5',
    ], env)
    assert.equal(offlineEvents.storage.mode, 'offline')
    assert.deepEqual(offlineEvents.events, events.events)

    const text = await runCli([
      'apis',
      'run',
      'icsdb.events',
      '--offline',
      '--format',
      'text',
      '--',
      '--locale',
      'en-US',
      '--slug',
      'us-all',
      '--limit',
      '5',
    ], env)
    assert.match(text.stdout, /icsdb Events/)
    assert.match(text.stdout, /open API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /US/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-icsdb-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
