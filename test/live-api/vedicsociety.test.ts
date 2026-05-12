import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type VedicSocietyResult = Record<string, unknown> & {
  kind: 'vedicsociety.words'
    | 'vedicsociety.descriptions'
    | 'vedicsociety.category'
  api: {
    provider: 'vedicsociety'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: string
  }
  query: Record<string, unknown>
  pagination: { total: number; returned: number; limit: number; offset: number }
  entries: Array<{
    word: string
    nagari: string
    description: string
    category: string
  }>
  storage: { mode?: string; persisted?: boolean }
}

test('Vedic Society live e2e covers word JSON, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<VedicSocietyResult>([
    'apis',
    'run',
    'vedicsociety.words',
    '--format',
    'json',
    '--',
    '--word',
    'agni',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'vedicsociety.words')
  assert.equal(json.api.provider, 'vedicsociety')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.word, 'agni')
  assert.equal(json.pagination.limit, 2)
  assert.ok(json.entries.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'vedicsociety.words',
    '--format',
    'text',
    '--',
    '--word',
    'agni',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /Vedic Society Word Lookup/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<VedicSocietyResult>([
      'apis',
      'run',
      'vedicsociety.words',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--word',
      'agni',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<VedicSocietyResult>([
      'apis',
      'run',
      'vedicsociety.words',
      '--offline',
      '--format',
      'json',
      '--',
      '--word',
      'agni',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.entries, online.entries)
  })
})

test('Vedic Society live e2e covers descriptions JSON and replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<VedicSocietyResult>([
    'apis',
    'run',
    'vedicsociety.descriptions',
    '--format',
    'json',
    '--',
    '--description',
    'fire',
    '--limit',
    '3',
  ])
  assert.equal(json.kind, 'vedicsociety.descriptions')
  assert.equal(json.api.provider, 'vedicsociety')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.description, 'fire')
  assert.ok(json.entries.some(entry => entry.description.includes('fire')))

  const text = await runCli([
    'apis',
    'run',
    'vedicsociety.descriptions',
    '--format',
    'text',
    '--',
    '--description',
    'fire',
    '--limit',
    '3',
  ])
  assert.match(text.stdout, /Vedic Society Description Search/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<VedicSocietyResult>([
      'apis',
      'run',
      'vedicsociety.descriptions',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--description',
      'fire',
      '--limit',
      '3',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<VedicSocietyResult>([
      'apis',
      'run',
      'vedicsociety.descriptions',
      '--offline',
      '--format',
      'json',
      '--',
      '--description',
      'fire',
      '--limit',
      '3',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.entries, online.entries)
  })
})

test('Vedic Society live e2e covers category JSON, text, and replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<VedicSocietyResult>([
    'apis',
    'run',
    'vedicsociety.category',
    '--format',
    'json',
    '--',
    '--category',
    'river',
    '--limit',
    '3',
  ])
  assert.equal(json.kind, 'vedicsociety.category')
  assert.equal(json.api.provider, 'vedicsociety')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.category, 'river')
  assert.ok(json.entries.some(entry => entry.category === 'river'))

  const text = await runCli([
    'apis',
    'run',
    'vedicsociety.category',
    '--format',
    'text',
    '--',
    '--category',
    'river',
    '--limit',
    '3',
  ])
  assert.match(text.stdout, /Vedic Society Category Browser/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /river/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<VedicSocietyResult>([
      'apis',
      'run',
      'vedicsociety.category',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--category',
      'river',
      '--limit',
      '3',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<VedicSocietyResult>([
      'apis',
      'run',
      'vedicsociety.category',
      '--offline',
      '--format',
      'json',
      '--',
      '--category',
      'river',
      '--limit',
      '3',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.entries, online.entries)
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
  return execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024 * 8,
  })
}

async function withPublicApisHome(
  callback: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-vedic-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
