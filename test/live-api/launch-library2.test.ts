import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type LaunchLibrary2LaunchesResult = Record<string, unknown> & {
  kind: 'launchlibrary2.launches'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { limit: number; offset: number }
  pagination: { returned: number; total: number; limit: number; offset: number }
  launches: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

type LaunchLibrary2EventsResult = Record<string, unknown> & {
  kind: 'launchlibrary2.events'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { limit: number; offset: number }
  pagination: { returned: number; total: number; limit: number; offset: number }
  events: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Launch Library 2 live e2e covers launches, events, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const launches = await runJson<LaunchLibrary2LaunchesResult>([
      'apis',
      'run',
      'launchlibrary2.launches',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--limit',
      '1',
      '--offset',
      '0',
    ], env)
    assert.equal(launches.kind, 'launchlibrary2.launches')
    assert.equal(launches.api.provider, 'launchlibrary2')
    assert.equal(launches.api.authentication, 'none')
    assert.equal(launches.api.usesBrowserClickstream, false)
    assert.equal(launches.query.limit, 1)
    assert.equal(launches.pagination.returned, 1)
    assert.equal(launches.launches.length > 0, true)
    assert.equal(launches.storage.persisted, true)

    const offlineLaunches = await runJson<LaunchLibrary2LaunchesResult>([
      'apis',
      'run',
      'launchlibrary2.launches',
      '--offline',
      '--format',
      'json',
      '--',
      '--limit',
      '1',
      '--offset',
      '0',
    ], env)
    assert.equal(offlineLaunches.storage.mode, 'offline')
    assert.deepEqual(offlineLaunches.launches, launches.launches)

    const events = await runJson<LaunchLibrary2EventsResult>([
      'apis',
      'run',
      'launchlibrary2.events',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--limit',
      '1',
      '--offset',
      '0',
    ], env)
    assert.equal(events.kind, 'launchlibrary2.events')
    assert.equal(events.api.provider, 'launchlibrary2')
    assert.equal(events.api.authentication, 'none')
    assert.equal(events.api.usesBrowserClickstream, false)
    assert.equal(events.pagination.returned, 1)
    assert.equal(events.events.length > 0, true)
    assert.equal(events.storage.persisted, true)

    const offlineEvents = await runJson<LaunchLibrary2EventsResult>([
      'apis',
      'run',
      'launchlibrary2.events',
      '--offline',
      '--format',
      'json',
      '--',
      '--limit',
      '1',
      '--offset',
      '0',
    ], env)
    assert.equal(offlineEvents.storage.mode, 'offline')
    assert.deepEqual(offlineEvents.events, events.events)

    const text = await runCli([
      'apis',
      'run',
      'launchlibrary2.launches',
      '--offline',
      '--format',
      'text',
      '--',
      '--limit',
      '1',
      '--offset',
      '0',
    ], env)
    assert.match(text.stdout, /Launch Library 2 Upcoming Launches/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ll2-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
