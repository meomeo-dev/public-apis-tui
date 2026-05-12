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

type LectServeDateResult = Record<string, unknown> & {
  kind: 'lectserve.date'
  api: PublicApiMeta
  query: { date: string; lectionary: string }
  daily?: { date: string } | undefined
  sunday?: { date: string; services: Array<Record<string, unknown>> } | undefined
  storage: StorageMeta
}

type LectServeSundayResult = Record<string, unknown> & {
  kind: 'lectserve.sunday'
  api: PublicApiMeta
  query: { lectionary: string; scope: string }
  sunday: { date: string; services: Array<Record<string, unknown>> }
  storage: StorageMeta
}

test('LectServe live e2e covers date, Sunday, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const date = await runJson<LectServeDateResult>([
      'apis',
      'run',
      'lectserve.date',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--date',
      '2026-05-10',
      '--lectionary',
      'rcl',
    ], env)
    assert.equal(date.kind, 'lectserve.date')
    assert.equal(date.api.provider, 'lectserve')
    assert.equal(date.api.authentication, 'none')
    assert.equal(date.api.usesBrowserClickstream, false)
    assert.equal(date.api.transport, 'HTTPS JSON')
    assert.equal(date.query.date, '2026-05-10')
    assert.equal(date.query.lectionary, 'rcl')
    assert.equal(date.daily?.date, '2026-05-10')
    assert.equal((date.sunday?.services.length ?? 0) > 0, true)
    assert.equal(date.storage.persisted, true)

    const offlineDate = await runJson<LectServeDateResult>([
      'apis',
      'run',
      'lectserve.date',
      '--offline',
      '--format',
      'json',
      '--',
      '--date',
      '2026-05-10',
      '--lectionary',
      'rcl',
    ], env)
    assert.equal(offlineDate.storage.mode, 'offline')
    assert.deepEqual(offlineDate.daily, date.daily)
    assert.deepEqual(offlineDate.sunday, date.sunday)

    const sunday = await runJson<LectServeSundayResult>([
      'apis',
      'run',
      'lectserve.sunday',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--lectionary',
      'acna',
    ], env)
    assert.equal(sunday.kind, 'lectserve.sunday')
    assert.equal(sunday.api.provider, 'lectserve')
    assert.equal(sunday.api.authentication, 'none')
    assert.equal(sunday.api.usesBrowserClickstream, false)
    assert.equal(sunday.query.scope, 'upcoming-server-relative-sunday')
    assert.equal(sunday.sunday.services.length > 0, true)
    assert.equal(sunday.storage.persisted, true)

    const offlineSunday = await runJson<LectServeSundayResult>([
      'apis',
      'run',
      'lectserve.sunday',
      '--offline',
      '--format',
      'json',
      '--',
      '--lectionary',
      'acna',
    ], env)
    assert.equal(offlineSunday.storage.mode, 'offline')
    assert.deepEqual(offlineSunday.sunday, sunday.sunday)

    const text = await runCli([
      'apis',
      'run',
      'lectserve.date',
      '--offline',
      '--format',
      'text',
      '--',
      '--date',
      '2026-05-10',
      '--lectionary',
      'rcl',
    ], env)
    assert.match(text.stdout, /LectServe Date/)
    assert.match(text.stdout, /HTTPS JSON · open API only · no auth/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ls-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
