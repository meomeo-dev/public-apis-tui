import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import { getNamedaysDefaultDateParts } from '../../src/infrastructure/openApis/namedaysClient.js'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type NamedaysDateResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  warningMessage?: string | undefined
  query: { day: number; month: number; country?: string | undefined; limit: number }
  count: number
  totalCountries?: number | undefined
  suppressedCountries?: string[] | undefined
  countries: Array<{ country: string; names: string }>
  storage: StorageMeta
}

type NamedaysNameResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { name: string; country?: string | undefined; limit: number }
  count: number
  matches: Array<{ country: string; day: number; month: number; names: string }>
  storage: StorageMeta
}

test('Namedays live e2e covers date json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<NamedaysDateResult>(['apis', 'run', 'namedays.date', '--format', 'json', '--', '--day', '3', '--month', '5', '--country', 'us'])
  assert.equal(json.kind, 'namedays.date')
  assert.equal(json.api.provider, 'namedays')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.day, 3)
  assert.equal(json.query.month, 5)
  assert.equal(json.countries[0]?.country, 'us')
  assert.match(json.countries[0]?.names ?? '', /Viola|Violet/u)

  const text = await runCli(['apis', 'run', 'namedays.date', '--format', 'text', '--', '--day', '3', '--month', '5', '--country', 'us'])
  assert.match(text.stdout, /Namedays Calendar Date/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NamedaysDateResult>(['apis', 'run', 'namedays.date', '--online', '--persist', '--format', 'json', '--', '--day', '3', '--month', '5', '--country', 'us'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<NamedaysDateResult>(['apis', 'run', 'namedays.date', '--offline', '--format', 'json', '--', '--day', '3', '--month', '5', '--country', 'us'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.countries, online.countries)
  })
})

test('Namedays live e2e default date hides unstable ru date entries', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const today = getNamedaysDefaultDateParts()
  const json = await runJson<NamedaysDateResult>(['apis', 'run', 'namedays.date', '--format', 'json'])
  assert.equal(json.query.day, today.day)
  assert.equal(json.query.month, today.month)
  assert.ok(json.countries.every(country => country.country !== 'ru'))
  assert.ok(Array.isArray(json.suppressedCountries))
  assert.ok(json.suppressedCountries?.includes('ru'))

  const text = await runCli(['apis', 'run', 'namedays.date', '--format', 'text'])
  assert.match(text.stdout, /warning .*Hidden unstable upstream date entries for ru/u)
})

test('Namedays live e2e covers name json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<NamedaysNameResult>(['apis', 'run', 'namedays.name', '--format', 'json', '--', '--name', 'John', '--country', 'us'])
  assert.equal(json.kind, 'namedays.name')
  assert.equal(json.api.provider, 'namedays')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.name, 'John')
  assert.equal(json.matches[0]?.country, 'us')
  assert.ok(json.matches.some(match => match.names.includes('John')))

  const text = await runCli(['apis', 'run', 'namedays.name', '--format', 'text', '--', '--name', 'John', '--country', 'us'])
  assert.match(text.stdout, /Namedays Calendar Name Search/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NamedaysNameResult>(['apis', 'run', 'namedays.name', '--online', '--persist', '--format', 'json', '--', '--name', 'John', '--country', 'us'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<NamedaysNameResult>(['apis', 'run', 'namedays.name', '--offline', '--format', 'json', '--', '--name', 'John', '--country', 'us'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.matches, online.matches)
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
