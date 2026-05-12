import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type RigVedaResult = Record<string, unknown> & {
  kind: 'rigveda.book' | 'rigveda.search'
  api: {
    provider: 'rigveda'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: string
  }
  query: Record<string, unknown>
  pagination: { total: number; returned: number; limit: number; offset: number }
  verses: Array<{
    mandal: number
    sukta: number
    meter: string
    sungby: string
    sungfor: string
  }>
  storage: { mode?: string; persisted?: boolean }
}

test('Rig Veda live e2e covers book JSON, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<RigVedaResult>([
    'apis',
    'run',
    'rigveda.book',
    '--format',
    'json',
    '--',
    '--mandal',
    '4',
    '--limit',
    '2',
  ])
  assert.equal(json.kind, 'rigveda.book')
  assert.equal(json.api.provider, 'rigveda')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.mandal, 4)
  assert.equal(json.pagination.limit, 2)
  assert.ok(json.verses.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'rigveda.book',
    '--format',
    'text',
    '--',
    '--mandal',
    '4',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /Rig Veda Book Metadata/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<RigVedaResult>([
      'apis',
      'run',
      'rigveda.book',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--mandal',
      '4',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<RigVedaResult>([
      'apis',
      'run',
      'rigveda.book',
      '--offline',
      '--format',
      'json',
      '--',
      '--mandal',
      '4',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.verses, online.verses)
  })
})

test('Rig Veda live e2e covers search JSON, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<RigVedaResult>([
    'apis',
    'run',
    'rigveda.search',
    '--format',
    'json',
    '--',
    '--field',
    'god',
    '--value',
    'ganga',
    '--limit',
    '5',
  ])
  assert.equal(json.kind, 'rigveda.search')
  assert.equal(json.api.provider, 'rigveda')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.field, 'god')
  assert.equal(json.query.value, 'ganga')
  assert.ok(json.verses.some(verse => verse.sungfor === 'Ganga'))

  const text = await runCli([
    'apis',
    'run',
    'rigveda.search',
    '--format',
    'text',
    '--',
    '--field',
    'god',
    '--value',
    'ganga',
    '--limit',
    '5',
  ])
  assert.match(text.stdout, /Rig Veda Metadata Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /Ganga/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<RigVedaResult>([
      'apis',
      'run',
      'rigveda.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--field',
      'god',
      '--value',
      'ganga',
      '--limit',
      '5',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<RigVedaResult>([
      'apis',
      'run',
      'rigveda.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--field',
      'god',
      '--value',
      'ganga',
      '--limit',
      '5',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.verses, online.verses)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-rigveda-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
