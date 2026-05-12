import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type ItisSearchResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  names: Array<{ tsn: string; combinedName: string }>
  storage: { mode?: string; persisted?: boolean }
}

type ItisRecordResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
  }
  record: {
    tsn: string
    scientificName?: { combinedName?: string }
    commonNames: Array<Record<string, unknown>>
    synonyms: Array<Record<string, unknown>>
  }
  storage: { mode?: string; persisted?: boolean }
}

test('ITIS live e2e covers search, record, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const search = await runJson<ItisSearchResult>([
    'apis',
    'run',
    'itis.search',
    '--format',
    'json',
    '--',
    '--query',
    'Quercus robur',
    '--limit',
    '5',
  ])
  assert.equal(search.kind, 'itis.search')
  assert.equal(search.api.provider, 'itis')
  assert.equal(search.api.authentication, 'none')
  assert.equal(search.api.usesBrowserClickstream, false)
  assert.equal(search.api.transport, 'HTTPS JSON REST')
  assert.equal(search.names.some(name => name.tsn === '19405'), true)

  const record = await runJson<ItisRecordResult>([
    'apis',
    'run',
    'itis.record',
    '--format',
    'json',
    '--',
    '--tsn',
    '19405',
  ])
  assert.equal(record.kind, 'itis.record')
  assert.equal(record.api.authentication, 'none')
  assert.equal(record.record.tsn, '19405')
  assert.equal(record.record.scientificName?.combinedName, 'Quercus robur')

  const text = await runCli([
    'apis',
    'run',
    'itis.record',
    '--format',
    'text',
    '--',
    '--tsn',
    '19405',
    '--common-limit',
    '3',
  ])
  assert.match(text.stdout, /ITIS Taxonomy Record/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /Quercus robur/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ItisSearchResult>([
      'apis',
      'run',
      'itis.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'Quercus robur',
      '--limit',
      '5',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ItisSearchResult>([
      'apis',
      'run',
      'itis.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'Quercus robur',
      '--limit',
      '5',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.names, online.names)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-itis-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
