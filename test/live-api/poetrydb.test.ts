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
  cliCountCap: number
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type PoetryDbResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: Record<string, unknown>
  count: number
  poems: Array<{ title: string; author: string; lines: string[] }>
  storage: StorageMeta
}

test('PoetryDB live e2e covers search json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<PoetryDbResult>(['apis', 'run', 'poetrydb.search', '--format', 'json', '--', '--field', 'title', '--term', 'Ozymandias', '--exact', 'true', '--count', '2', '--include-lines', 'true', '--line-limit', '4'])
  assert.equal(json.kind, 'poetrydb.search')
  assert.equal(json.api.provider, 'poetrydb')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.cliCountCap, 20)
  assert.ok(json.count > 0)
  assert.ok(json.poems.some(poem => /Ozymandias/u.test(poem.title)))

  const text = await runCli(['apis', 'run', 'poetrydb.search', '--format', 'text', '--', '--field', 'title', '--term', 'Ozymandias', '--exact', 'true', '--count', '2', '--include-lines', 'true', '--line-limit', '4'])
  assert.match(text.stdout, /PoetryDB Search/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<PoetryDbResult>(['apis', 'run', 'poetrydb.search', '--online', '--persist', '--format', 'json', '--', '--field', 'title', '--term', 'Ozymandias', '--exact', 'true', '--count', '2', '--include-lines', 'true', '--line-limit', '4'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<PoetryDbResult>(['apis', 'run', 'poetrydb.search', '--offline', '--format', 'json', '--', '--field', 'title', '--term', 'Ozymandias', '--exact', 'true', '--count', '2', '--include-lines', 'true', '--line-limit', '4'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.poems, online.poems)
  })
})

test('PoetryDB live e2e covers random json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<PoetryDbResult>(['apis', 'run', 'poetrydb.random', '--format', 'json', '--', '--count', '1', '--include-lines', 'false'])
  assert.equal(json.kind, 'poetrydb.random')
  assert.equal(json.api.provider, 'poetrydb')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.count, 1)
  assert.ok((json.poems[0]?.title ?? '').length > 0)

  const text = await runCli(['apis', 'run', 'poetrydb.random', '--format', 'text', '--', '--count', '1', '--include-lines', 'false'])
  assert.match(text.stdout, /PoetryDB Random/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<PoetryDbResult>(['apis', 'run', 'poetrydb.random', '--online', '--persist', '--format', 'json', '--', '--count', '1', '--include-lines', 'false'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<PoetryDbResult>(['apis', 'run', 'poetrydb.random', '--offline', '--format', 'json', '--', '--count', '1', '--include-lines', 'false'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.poems, online.poems)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
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
