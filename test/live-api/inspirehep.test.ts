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

type InspireHepSearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { q: string; size: number; page: number }
  pagination: { total: number; returned: number; size: number; page: number }
  papers: Array<{ recid: number; title: string }>
  storage: StorageMeta
}

type InspireHepRecordResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { recid: number }
  paper: { recid: number; title: string }
  storage: StorageMeta
}

test('INSPIRE HEP live e2e covers search json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<InspireHepSearchResult>([
    'apis',
    'run',
    'inspirehep.search',
    '--format',
    'json',
    '--',
    '--query',
    'higgs',
    '--sort',
    'mostrecent',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'inspirehep.search')
  assert.equal(json.api.provider, 'inspirehep')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.q, 'higgs')
  assert.equal(json.query.size, 2)
  assert.ok(json.pagination.total > 0)
  assert.ok(json.papers.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'inspirehep.search',
    '--format',
    'text',
    '--',
    '--query',
    'higgs',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /INSPIRE HEP Literature Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<InspireHepSearchResult>([
      'apis',
      'run',
      'inspirehep.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'higgs',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<InspireHepSearchResult>([
      'apis',
      'run',
      'inspirehep.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'higgs',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.papers, online.papers)
  })
})

test('INSPIRE HEP live e2e covers record json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<InspireHepRecordResult>([
    'apis',
    'run',
    'inspirehep.record',
    '--format',
    'json',
    '--',
    '--recid',
    '4328',
  ])
  assert.equal(json.kind, 'inspirehep.record')
  assert.equal(json.api.provider, 'inspirehep')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.paper.recid, 4328)

  const text = await runCli([
    'apis',
    'run',
    'inspirehep.record',
    '--format',
    'text',
    '--',
    '--recid',
    '4328',
  ])
  assert.match(text.stdout, /INSPIRE HEP Literature Record/)
  assert.match(text.stdout, /Partial Symmetries of Weak Interactions/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<InspireHepRecordResult>([
      'apis',
      'run',
      'inspirehep.record',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--recid',
      '4328',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<InspireHepRecordResult>([
      'apis',
      'run',
      'inspirehep.record',
      '--offline',
      '--format',
      'json',
      '--',
      '--recid',
      '4328',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.paper, online.paper)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-inspirehep-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
