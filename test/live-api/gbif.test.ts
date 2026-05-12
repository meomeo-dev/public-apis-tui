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

type GbifSpeciesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; limit: number; offset: number }
  pagination: { total: number; returned: number; limit: number; offset: number }
  species: Array<{ scientificName?: string; canonicalName?: string }>
  storage: StorageMeta
}

type GbifOccurrencesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { scientificName: string; country?: string; limit: number; offset: number }
  pagination: { total: number; returned: number; limit: number; offset: number }
  occurrences: Array<{ scientificName?: string; mediaCount: number }>
  storage: StorageMeta
}

test('GBIF live e2e covers species json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<GbifSpeciesResult>([
    'apis',
    'run',
    'gbif.species',
    '--format',
    'json',
    '--',
    '--query',
    'Quercus robur',
    '--rank',
    'SPECIES',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'gbif.species')
  assert.equal(json.api.provider, 'gbif')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.limit, 2)
  assert.ok(json.pagination.total > 0)
  assert.ok(json.species.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'gbif.species',
    '--format',
    'text',
    '--',
    '--query',
    'Quercus robur',
    '--rank',
    'SPECIES',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /GBIF Species Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GbifSpeciesResult>([
      'apis',
      'run',
      'gbif.species',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'Quercus robur',
      '--rank',
      'SPECIES',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GbifSpeciesResult>([
      'apis',
      'run',
      'gbif.species',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'Quercus robur',
      '--rank',
      'SPECIES',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.species, online.species)
  })
})

test('GBIF live e2e covers occurrences json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<GbifOccurrencesResult>([
    'apis',
    'run',
    'gbif.occurrences',
    '--format',
    'json',
    '--',
    '--scientific-name',
    'Quercus robur',
    '--country',
    'GB',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'gbif.occurrences')
  assert.equal(json.api.provider, 'gbif')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.country, 'GB')
  assert.equal(json.query.limit, 2)
  assert.ok(json.pagination.total > 0)

  const text = await runCli([
    'apis',
    'run',
    'gbif.occurrences',
    '--format',
    'text',
    '--',
    '--scientific-name',
    'Quercus robur',
    '--country',
    'GB',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /GBIF Occurrence Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GbifOccurrencesResult>([
      'apis',
      'run',
      'gbif.occurrences',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--scientific-name',
      'Quercus robur',
      '--country',
      'GB',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GbifOccurrencesResult>([
      'apis',
      'run',
      'gbif.occurrences',
      '--offline',
      '--format',
      'json',
      '--',
      '--scientific-name',
      'Quercus robur',
      '--country',
      'GB',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.occurrences, online.occurrences)
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
