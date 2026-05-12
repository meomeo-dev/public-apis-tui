import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type SpaceXResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('SpaceX live e2e covers company, rockets, launchpads, and launches', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }

    const company = await runJson<SpaceXResult>([
      'apis',
      'run',
      'spacex.company',
      '--online',
      '--persist',
      '--format',
      'json',
    ], env)
    assert.equal(company.kind, 'spacex.company')
    assert.equal(company.api.provider, 'spacex')
    assert.equal(company.api.authentication, 'none')
    assert.equal(company.api.usesBrowserClickstream, false)
    assert.equal(company.storage.persisted, true)

    const offlineCompany = await runJson<SpaceXResult>([
      'apis',
      'run',
      'spacex.company',
      '--offline',
      '--format',
      'json',
    ], env)
    assert.equal(offlineCompany.storage.mode, 'offline')
    assert.deepEqual(offlineCompany.company, company.company)

    const rockets = await runJson<SpaceXResult & {
      rockets: Array<Record<string, unknown>>
      pagination: { returned: number }
    }>([
      'apis',
      'run',
      'spacex.rockets',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--search',
      'Falcon',
      '--active',
      'true',
      '--limit',
      '2',
    ], env)
    assert.equal(rockets.kind, 'spacex.rockets')
    assert.equal(rockets.api.authentication, 'none')
    assert.ok(rockets.pagination.returned > 0)
    assert.ok(rockets.rockets.length > 0)

    const launchpads = await runJson<SpaceXResult & {
      launchpads: Array<Record<string, unknown>>
    }>([
      'apis',
      'run',
      'spacex.launchpads',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--status',
      'active',
      '--limit',
      '2',
    ], env)
    assert.equal(launchpads.kind, 'spacex.launchpads')
    assert.ok(launchpads.launchpads.length > 0)

    const launches = await runJson<SpaceXResult & {
      launches: Array<Record<string, unknown>>
      pagination: { returned: number }
    }>([
      'apis',
      'run',
      'spacex.launches',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--name',
      'Crew',
      '--upcoming',
      'false',
      '--limit',
      '2',
    ], env)
    assert.equal(launches.kind, 'spacex.launches')
    assert.equal(launches.api.usesBrowserClickstream, false)
    assert.ok(launches.pagination.returned > 0)

    const offlineLaunches = await runJson<SpaceXResult & {
      launches: Array<Record<string, unknown>>
    }>([
      'apis',
      'run',
      'spacex.launches',
      '--offline',
      '--format',
      'json',
      '--',
      '--name',
      'Crew',
      '--upcoming',
      'false',
      '--limit',
      '2',
    ], env)
    assert.equal(offlineLaunches.storage.mode, 'offline')
    assert.deepEqual(offlineLaunches.launches, launches.launches)

    const text = await runCli([
      'apis',
      'run',
      'spacex.launches',
      '--offline',
      '--format',
      'text',
      '--',
      '--name',
      'Crew',
      '--upcoming',
      'false',
      '--limit',
      '2',
    ], env)
    assert.match(text.stdout, /SpaceX Launches/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-spacex-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
