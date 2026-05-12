import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type UsgsEarthquakeApi = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
  transport: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type UsgsEarthquakeSearchResult = Record<string, unknown> & {
  kind: 'usgsearthquake.search'
  api: UsgsEarthquakeApi
  query: { minMagnitude: number; limit: number; orderBy: string }
  pagination: { returned: number; limit: number; offset: number }
  events: Array<Record<string, unknown>>
  storage: StorageMeta
}

type UsgsEarthquakeEventResult = Record<string, unknown> & {
  kind: 'usgsearthquake.event'
  api: UsgsEarthquakeApi
  query: { eventId: string }
  event: Record<string, unknown>
  storage: StorageMeta
}

test('USGS Earthquake live e2e covers search, event, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const searchArgs = ['--min-magnitude', '4.5', '--limit', '2']
    const search = await runJson<UsgsEarthquakeSearchResult>([
      'apis',
      'run',
      'usgsearthquake.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...searchArgs,
    ], env)
    assert.equal(search.kind, 'usgsearthquake.search')
    assert.equal(search.api.provider, 'usgsearthquake')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.api.transport, 'HTTPS GeoJSON REST')
    assert.equal(search.query.minMagnitude, 4.5)
    assert.equal(search.query.limit, 2)
    assert.equal(search.query.orderBy, 'time')
    assert.equal(search.pagination.limit, 2)
    assert.equal(search.storage.persisted, true)
    assert.equal(Array.isArray(search.events), true)
    assert.ok(search.events.length <= 2)
    assert.equal(hasUnsafeProductDump(search), false)

    const offlineSearch = await runJson<UsgsEarthquakeSearchResult>([
      'apis',
      'run',
      'usgsearthquake.search',
      '--offline',
      '--format',
      'json',
      '--',
      ...searchArgs,
    ], env)
    assert.equal(offlineSearch.storage.mode, 'offline')
    assert.deepEqual(offlineSearch.events, search.events)

    const eventArgs = ['--event-id', 'official20110311054624120_30']
    const event = await runJson<UsgsEarthquakeEventResult>([
      'apis',
      'run',
      'usgsearthquake.event',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...eventArgs,
    ], env)
    assert.equal(event.kind, 'usgsearthquake.event')
    assert.equal(event.api.provider, 'usgsearthquake')
    assert.equal(event.api.authentication, 'none')
    assert.equal(event.api.usesBrowserClickstream, false)
    assert.equal(event.event.id, 'official20110311054624120_30')
    assert.equal(hasUnsafeProductDump(event), false)

    const offlineEvent = await runJson<UsgsEarthquakeEventResult>([
      'apis',
      'run',
      'usgsearthquake.event',
      '--offline',
      '--format',
      'json',
      '--',
      ...eventArgs,
    ], env)
    assert.equal(offlineEvent.storage.mode, 'offline')
    assert.deepEqual(offlineEvent.event, event.event)

    const text = await runCli([
      'apis',
      'run',
      'usgsearthquake.event',
      '--offline',
      '--format',
      'text',
      '--',
      ...eventArgs,
    ], env)
    assert.match(text.stdout, /USGS Earthquake Event/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /product attachments and binary assets omitted/)
    assert.doesNotMatch(text.stdout, /application\/octet-stream/)
    assert.doesNotMatch(text.stdout, /\/product\//)
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
  const publicApisHome = await mkdtemp(
    join(tmpdir(), 'public-apis-live-usgs-earthquake-'),
  )
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function hasUnsafeProductDump(value: unknown): boolean {
  const encoded = JSON.stringify(value)
  return /"products"|"contents"|application\/octet-stream|\/product\//u.test(
    encoded,
  )
}

function stripAnsi(value: string): string {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'),
    '',
  )
}
