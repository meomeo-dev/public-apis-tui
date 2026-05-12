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

type AwardsResult = Record<string, unknown> & {
  kind: 'usaspending.awards'
  api: PublicApiMeta
  awards: Array<{ awardId?: string | undefined; recipientName?: string | undefined }>
  storage: StorageMeta
}

type OverTimeResult = Record<string, unknown> & {
  kind: 'usaspending.overTime'
  api: PublicApiMeta
  periods: Array<{ label: string; aggregatedAmount?: number | undefined }>
  storage: StorageMeta
}

type AgenciesResult = Record<string, unknown> & {
  kind: 'usaspending.agencies'
  api: PublicApiMeta
  agencies: Array<{ agencyId: number; agencyName: string }>
  storage: StorageMeta
}

test('USAspending live e2e covers awards, over-time, agencies, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const awardsArgs = ['apis', 'run', 'usaspending.awards', '--online', '--persist', '--format', 'json', '--', '--start-date', '2024-10-01', '--end-date', '2025-09-30', '--limit', '100']
    const awards = await runJson<AwardsResult>(awardsArgs, env)
    assert.equal(awards.kind, 'usaspending.awards')
    assert.equal(awards.api.provider, 'usaspending')
    assert.equal(awards.api.authentication, 'none')
    assert.equal(awards.api.usesBrowserClickstream, false)
    assert.ok(awards.awards.length > 0)
    assert.equal(awards.storage.persisted, true)

    const awardsOffline = await runJson<AwardsResult>(['apis', 'run', 'usaspending.awards', '--offline', '--format', 'json', '--', '--start-date', '2024-10-01', '--end-date', '2025-09-30', '--limit', '100'], env)
    assert.equal(awardsOffline.storage.mode, 'offline')
    assert.deepEqual(awardsOffline.awards, awards.awards)

    const overTime = await runJson<OverTimeResult>(['apis', 'run', 'usaspending.overTime', '--online', '--persist', '--format', 'json', '--', '--start-date', '2024-10-01', '--end-date', '2025-09-30', '--group', 'fiscal_year'], env)
    assert.equal(overTime.kind, 'usaspending.overTime')
    assert.equal(overTime.api.authentication, 'none')
    assert.equal(overTime.api.usesBrowserClickstream, false)
    assert.ok(overTime.periods.length > 0)
    assert.equal(overTime.storage.persisted, true)

    const overTimeOffline = await runJson<OverTimeResult>(['apis', 'run', 'usaspending.overTime', '--offline', '--format', 'json', '--', '--start-date', '2024-10-01', '--end-date', '2025-09-30', '--group', 'fiscal_year'], env)
    assert.equal(overTimeOffline.storage.mode, 'offline')
    assert.deepEqual(overTimeOffline.periods, overTime.periods)

    const agencies = await runJson<AgenciesResult>(['apis', 'run', 'usaspending.agencies', '--online', '--persist', '--format', 'json', '--', '--limit', '100'], env)
    assert.equal(agencies.kind, 'usaspending.agencies')
    assert.equal(agencies.api.authentication, 'none')
    assert.equal(agencies.api.usesBrowserClickstream, false)
    assert.ok(agencies.agencies.length > 0)
    assert.equal(agencies.storage.persisted, true)

    const agenciesOffline = await runJson<AgenciesResult>(['apis', 'run', 'usaspending.agencies', '--offline', '--format', 'json', '--', '--limit', '100'], env)
    assert.equal(agenciesOffline.storage.mode, 'offline')
    assert.deepEqual(agenciesOffline.agencies, agencies.agencies)

    const text = await runCli(['apis', 'run', 'usaspending.agencies', '--offline', '--format', 'text', '--', '--limit', '100'], env)
    assert.match(text.stdout, /USAspending Toptier Agencies/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 64 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-usaspending-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
