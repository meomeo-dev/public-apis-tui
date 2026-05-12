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

type IdigbioRecordsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { scientificName: string; limit: number; offset: number }
  pagination: { total: number; returned: number; limit: number; offset: number }
  records: Array<{ scientificName?: string }>
  storage: StorageMeta
}

type IdigbioMediaResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { scientificName: string; mediaType?: string; limit: number }
  pagination: { total: number; returned: number; limit: number; offset: number }
  media: Array<{ mediaType?: string; accessUri?: string }>
  storage: StorageMeta
}

test('iDigBio live e2e covers records json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<IdigbioRecordsResult>([
    'apis',
    'run',
    'idigbio.records',
    '--format',
    'json',
    '--',
    '--scientific-name',
    'Quercus robur',
    '--family',
    'Fagaceae',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'idigbio.records')
  assert.equal(json.api.provider, 'idigbio')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.limit, 2)
  assert.ok(json.pagination.total > 0)
  assert.ok(json.records.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'idigbio.records',
    '--format',
    'text',
    '--',
    '--scientific-name',
    'Quercus robur',
    '--family',
    'Fagaceae',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /iDigBio Records Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<IdigbioRecordsResult>([
      'apis',
      'run',
      'idigbio.records',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--scientific-name',
      'Quercus robur',
      '--family',
      'Fagaceae',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<IdigbioRecordsResult>([
      'apis',
      'run',
      'idigbio.records',
      '--offline',
      '--format',
      'json',
      '--',
      '--scientific-name',
      'Quercus robur',
      '--family',
      'Fagaceae',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.records, online.records)
  })
})

test('iDigBio live e2e covers media json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<IdigbioMediaResult>([
    'apis',
    'run',
    'idigbio.media',
    '--format',
    'json',
    '--',
    '--scientific-name',
    'Quercus robur',
    '--media-type',
    'images',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'idigbio.media')
  assert.equal(json.api.provider, 'idigbio')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.mediaType, 'images')
  assert.equal(json.query.limit, 2)
  assert.ok(json.pagination.total > 0)
  assert.ok(json.media.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'idigbio.media',
    '--format',
    'text',
    '--',
    '--scientific-name',
    'Quercus robur',
    '--media-type',
    'images',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /iDigBio Media Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<IdigbioMediaResult>([
      'apis',
      'run',
      'idigbio.media',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--scientific-name',
      'Quercus robur',
      '--media-type',
      'images',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<IdigbioMediaResult>([
      'apis',
      'run',
      'idigbio.media',
      '--offline',
      '--format',
      'json',
      '--',
      '--scientific-name',
      'Quercus robur',
      '--media-type',
      'images',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.media, online.media)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-idigbio-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
