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

type OsfNodesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { title: string; public: boolean; limit: number; page: number }
  pagination: { total?: number; returned: number; limit: number; page: number }
  nodes: Array<{ id: string; title: string }>
  storage: StorageMeta
}

type OsfPreprintsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { provider: string; isPublished: boolean; limit: number; page: number }
  pagination: { total?: number; returned: number; limit: number; page: number }
  preprints: Array<{ id: string; title: string; provider?: string }>
  storage: StorageMeta
}

test('OSF live e2e covers nodes json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<OsfNodesResult>([
    'apis',
    'run',
    'osf.nodes',
    '--format',
    'json',
    '--',
    '--title',
    'reproducibility',
    '--category',
    'project',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'osf.nodes')
  assert.equal(json.api.provider, 'osf')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON:API REST')
  assert.equal(json.query.title, 'reproducibility')
  assert.equal(json.query.public, true)
  assert.equal(json.query.limit, 2)
  assert.ok(json.nodes.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'osf.nodes',
    '--format',
    'text',
    '--',
    '--title',
    'reproducibility',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /OSF Public Nodes/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<OsfNodesResult>([
      'apis',
      'run',
      'osf.nodes',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--title',
      'reproducibility',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<OsfNodesResult>([
      'apis',
      'run',
      'osf.nodes',
      '--offline',
      '--format',
      'json',
      '--',
      '--title',
      'reproducibility',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.nodes, online.nodes)
  })
})

test('OSF live e2e covers preprints json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<OsfPreprintsResult>([
    'apis',
    'run',
    'osf.preprints',
    '--format',
    'json',
    '--',
    '--provider',
    'psyarxiv',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'osf.preprints')
  assert.equal(json.api.provider, 'osf')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.provider, 'psyarxiv')
  assert.equal(json.query.isPublished, true)
  assert.equal(json.query.limit, 2)
  assert.ok(json.preprints.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'osf.preprints',
    '--format',
    'text',
    '--',
    '--provider',
    'psyarxiv',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /OSF Public Preprints/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<OsfPreprintsResult>([
      'apis',
      'run',
      'osf.preprints',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--provider',
      'psyarxiv',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<OsfPreprintsResult>([
      'apis',
      'run',
      'osf.preprints',
      '--offline',
      '--format',
      'json',
      '--',
      '--provider',
      'psyarxiv',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.preprints, online.preprints)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-osf-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
