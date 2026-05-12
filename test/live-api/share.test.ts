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

type ShareSearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; type?: string; limit: number; offset: number }
  pagination: { returned: number; limit: number; offset: number }
  works: Array<{ id: string; title: string; sources: string[] }>
  storage: StorageMeta
}

type ShareSourcesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; limit: number; offset: number }
  pagination: { returned: number; upstreamReturned: number }
  sources: Array<{ id: string; name: string }>
  storage: StorageMeta
}

test('SHARE live e2e covers search json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<ShareSearchResult>([
    'apis',
    'run',
    'share.search',
    '--format',
    'json',
    '--',
    '--query',
    'reproducibility',
    '--type',
    'preprint',
    '--source',
    'OSF',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'share.search')
  assert.equal(json.api.provider, 'share')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.query, 'reproducibility')
  assert.equal(json.query.type, 'preprint')
  assert.equal(json.query.limit, 2)
  assert.ok(json.works.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'share.search',
    '--format',
    'text',
    '--',
    '--query',
    'reproducibility',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /SHARE Creative Works/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ShareSearchResult>([
      'apis',
      'run',
      'share.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'reproducibility',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ShareSearchResult>([
      'apis',
      'run',
      'share.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'reproducibility',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.works, online.works)
  })
})

test('SHARE live e2e covers sources json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<ShareSourcesResult>([
    'apis',
    'run',
    'share.sources',
    '--format',
    'json',
    '--',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'share.sources')
  assert.equal(json.api.provider, 'share')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.limit, 2)
  assert.ok(json.pagination.upstreamReturned > 0)
  assert.ok(json.sources.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'share.sources',
    '--format',
    'text',
    '--',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /SHARE Sources/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ShareSourcesResult>([
      'apis',
      'run',
      'share.sources',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ShareSourcesResult>([
      'apis',
      'run',
      'share.sources',
      '--offline',
      '--format',
      'json',
      '--',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.sources, online.sources)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-share-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
