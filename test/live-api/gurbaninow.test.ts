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

type GurbaniNowSearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; source: number; searchType: number; results: number }
  pagination: { total: number; returned: number; results: number; skip: number }
  shabads: Array<{ id?: string; line?: Record<string, unknown> }>
  storage: StorageMeta
}

type GurbaniNowBanisResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { limit: number }
  count: number
  total: number
  banis: Array<{ id?: number; english?: string }>
  storage: StorageMeta
}

type GurbaniNowBaniResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { id: number; offset: number; limit: number }
  bani: { id?: number; english?: string }
  pagination: { total: number; returned: number; offset: number; limit: number }
  lines: Array<{ id?: string; gurmukhi?: Record<string, unknown> }>
  storage: StorageMeta
}

const liveSkip = liveEnabled
  ? false
  : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs'

test('GurbaniNow live e2e covers search json, text, and offline replay', {
  skip: liveSkip,
}, async () => {
  const operationArgs = [
    '--query',
    'DDrgj',
    '--source',
    '1',
    '--search-type',
    '1',
    '--results',
    '2',
  ]
  const runArgs = ['apis', 'run', 'gurbaninow.search']
  const json = await runJson<GurbaniNowSearchResult>(
    [...runArgs, '--format', 'json', '--', ...operationArgs],
  )
  assert.equal(json.kind, 'gurbaninow.search')
  assert.equal(json.api.provider, 'gurbaninow')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.results, 2)
  assert.ok(json.pagination.total > 0)
  assert.ok(json.shabads.length > 0)

  const text = await runCli([...runArgs, '--format', 'text', '--', ...operationArgs])
  assert.match(text.stdout, /GurbaniNow Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GurbaniNowSearchResult>([
      ...runArgs,
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...operationArgs,
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GurbaniNowSearchResult>([
      ...runArgs,
      '--offline',
      '--format',
      'json',
      '--',
      ...operationArgs,
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.shabads, online.shabads)
  })
})

test('GurbaniNow live e2e covers banis json, text, and offline replay', {
  skip: liveSkip,
}, async () => {
  const operationArgs = ['--limit', '2']
  const runArgs = ['apis', 'run', 'gurbaninow.banis']
  const json = await runJson<GurbaniNowBanisResult>(
    [...runArgs, '--format', 'json', '--', ...operationArgs],
  )
  assert.equal(json.kind, 'gurbaninow.banis')
  assert.equal(json.api.provider, 'gurbaninow')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.limit, 2)
  assert.ok(json.total >= json.count)
  assert.ok(json.banis.length > 0)

  const text = await runCli([...runArgs, '--format', 'text', '--', ...operationArgs])
  assert.match(text.stdout, /GurbaniNow Banis/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /read public-apis apis run gurbaninow\.bani/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GurbaniNowBanisResult>([
      ...runArgs,
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...operationArgs,
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GurbaniNowBanisResult>([
      ...runArgs,
      '--offline',
      '--format',
      'json',
      '--',
      ...operationArgs,
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.banis, online.banis)
  })
})

test('GurbaniNow live e2e covers bani json, text, and offline replay', {
  skip: liveSkip,
}, async () => {
  const operationArgs = [
    '--id',
    '1',
    '--offset',
    '0',
    '--limit',
    '2',
  ]
  const runArgs = ['apis', 'run', 'gurbaninow.bani']
  const json = await runJson<GurbaniNowBaniResult>(
    [...runArgs, '--format', 'json', '--', ...operationArgs],
  )
  assert.equal(json.kind, 'gurbaninow.bani')
  assert.equal(json.api.provider, 'gurbaninow')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.id, 1)
  assert.equal(json.query.limit, 2)
  assert.ok(json.pagination.total > 0)
  assert.ok(json.lines.length > 0)

  const text = await runCli([...runArgs, '--format', 'text', '--', ...operationArgs])
  assert.match(text.stdout, /GurbaniNow Bani/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /Jap Ji Sahib/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GurbaniNowBaniResult>([
      ...runArgs,
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      ...operationArgs,
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GurbaniNowBaniResult>([
      ...runArgs,
      '--offline',
      '--format',
      'json',
      '--',
      ...operationArgs,
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.lines, online.lines)
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
    maxBuffer: 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
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
