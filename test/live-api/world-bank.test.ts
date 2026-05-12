import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type WorldBankCountriesResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  query: { page: number; perPage: number }
  pagination: { page: number; total: number }
  countries: Array<Record<string, unknown>>
  storage: { mode?: string; persisted?: boolean }
}

type WorldBankIndicatorResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  query: { country: string; indicator: string; date: string; perPage: number }
  points: Array<Record<string, unknown>>
  storage: { mode?: string; persisted?: boolean }
}

test('World Bank live e2e covers countries json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<WorldBankCountriesResult>([
    'apis',
    'run',
    'worldbank.countries',
    '--format',
    'json',
    '--',
    '--page',
    '1',
    '--per-page',
    '3',
  ])
  assert.equal(json.kind, 'worldbank.countries')
  assert.equal(json.api.provider, 'worldbank')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.page, 1)
  assert.equal(json.query.perPage, 3)
  assert.equal(json.countries.length > 0, true)

  const text = await runCli([
    'apis',
    'run',
    'worldbank.countries',
    '--format',
    'text',
    '--',
    '--page',
    '1',
    '--per-page',
    '3',
  ])
  assert.match(text.stdout, /World Bank Countries/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WorldBankCountriesResult>([
      'apis',
      'run',
      'worldbank.countries',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--page',
      '1',
      '--per-page',
      '3',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WorldBankCountriesResult>([
      'apis',
      'run',
      'worldbank.countries',
      '--offline',
      '--format',
      'json',
      '--',
      '--page',
      '1',
      '--per-page',
      '3',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.countries, online.countries)
    assert.deepEqual(offline.pagination, online.pagination)
  })
})

test('World Bank live e2e covers indicator json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const queryArgs = [
    '--country',
    'US',
    '--indicator',
    'SP.POP.TOTL',
    '--date',
    '2020:2022',
    '--per-page',
    '3',
  ]
  const json = await runJson<WorldBankIndicatorResult>([
    'apis',
    'run',
    'worldbank.indicator',
    '--format',
    'json',
    '--',
    ...queryArgs,
  ])
  assert.equal(json.kind, 'worldbank.indicator')
  assert.equal(json.api.provider, 'worldbank')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.country, 'US')
  assert.equal(json.query.indicator, 'SP.POP.TOTL')
  assert.equal(json.query.date, '2020:2022')
  assert.equal(json.points.length > 0, true)

  const text = await runCli([
    'apis',
    'run',
    'worldbank.indicator',
    '--format',
    'text',
    '--',
    ...queryArgs,
  ])
  assert.match(text.stdout, /World Bank Indicator/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /Population/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WorldBankIndicatorResult>([
      'apis',
      'run',
      'worldbank.indicator',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...queryArgs,
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WorldBankIndicatorResult>([
      'apis',
      'run',
      'worldbank.indicator',
      '--offline',
      '--format',
      'json',
      '--',
      ...queryArgs,
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.points, online.points)
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
    maxBuffer: 1024 * 1024 * 8,
  })
  return result
}

async function withPublicApisHome(
  callback: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-world-bank-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
