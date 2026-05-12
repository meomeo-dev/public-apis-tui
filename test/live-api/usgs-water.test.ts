import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type UsgsWaterApi = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
  transport: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type UsgsWaterResult = Record<string, unknown> & {
  kind: 'usgswater.instantaneous' | 'usgswater.daily'
  api: UsgsWaterApi
  query: Record<string, unknown>
  pagination: { returnedSeries: number; returnedValues: number; limit: number }
  series: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('USGS Water live e2e covers values and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const instantaneousArgs = [
      '--site',
      '01646500',
      '--parameter-codes',
      '00060,00065',
      '--limit',
      '2',
    ]
    const instantaneous = await runJson<UsgsWaterResult>([
      'apis',
      'run',
      'usgswater.instantaneous',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...instantaneousArgs,
    ], env)
    assert.equal(instantaneous.kind, 'usgswater.instantaneous')
    assert.equal(instantaneous.api.provider, 'usgswater')
    assert.equal(instantaneous.api.authentication, 'none')
    assert.equal(instantaneous.api.usesBrowserClickstream, false)
    assert.equal(instantaneous.api.transport, 'HTTPS WaterML JSON REST')
    assert.equal(instantaneous.query.site, '01646500')
    assert.equal(instantaneous.pagination.limit, 2)
    assert.equal(instantaneous.storage.persisted, true)
    assert.equal(Array.isArray(instantaneous.series), true)
    assert.equal(hasUnsafeDump(instantaneous), false)

    const offlineInstantaneous = await runJson<UsgsWaterResult>([
      'apis',
      'run',
      'usgswater.instantaneous',
      '--offline',
      '--format',
      'json',
      '--',
      ...instantaneousArgs,
    ], env)
    assert.equal(offlineInstantaneous.storage.mode, 'offline')
    assert.deepEqual(offlineInstantaneous.series, instantaneous.series)

    const dailyArgs = [
      '--site',
      '01646500',
      '--parameter-codes',
      '00060',
      '--start-date',
      '2026-05-01',
      '--end-date',
      '2026-05-11',
      '--limit',
      '5',
    ]
    const daily = await runJson<UsgsWaterResult>([
      'apis',
      'run',
      'usgswater.daily',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...dailyArgs,
    ], env)
    assert.equal(daily.kind, 'usgswater.daily')
    assert.equal(daily.api.provider, 'usgswater')
    assert.equal(daily.api.authentication, 'none')
    assert.equal(daily.api.usesBrowserClickstream, false)
    assert.equal(daily.query.startDate, '2026-05-01')
    assert.equal(daily.query.endDate, '2026-05-11')
    assert.equal(daily.pagination.limit, 5)
    assert.equal(hasUnsafeDump(daily), false)

    const offlineDaily = await runJson<UsgsWaterResult>([
      'apis',
      'run',
      'usgswater.daily',
      '--offline',
      '--format',
      'json',
      '--',
      ...dailyArgs,
    ], env)
    assert.equal(offlineDaily.storage.mode, 'offline')
    assert.deepEqual(offlineDaily.series, daily.series)

    const text = await runCli([
      'apis',
      'run',
      'usgswater.daily',
      '--offline',
      '--format',
      'text',
      '--',
      ...dailyArgs,
    ], env)
    assert.match(text.stdout, /USGS Water Daily Values/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /bulk exports omitted/)
    assert.doesNotMatch(text.stdout, /application\/octet-stream/)
    assert.doesNotMatch(text.stdout, /<html/i)
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
    maxBuffer: 2 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-usgs-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function hasUnsafeDump(value: unknown): boolean {
  const encoded = JSON.stringify(value)
  return /"timeSeries"|"queryInfo"|application\/octet-stream|<html/iu
    .test(encoded)
}

function stripAnsi(value: string): string {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'),
    '',
  )
}
