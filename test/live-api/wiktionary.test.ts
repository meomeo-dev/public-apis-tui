import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Wiktionary live search verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<WiktionarySearchLiveResult>(['apis', 'run', 'wiktionary.search', '--format', 'json', '--', '--query', 'hello', '--limit', '3'])
  assert.equal(json.kind, 'wiktionary.search')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.query, 'hello')
  assert.ok(json.pagination.returned > 0)
  assert.ok(json.results.length > 0)

  const text = await runCli(['apis', 'run', 'wiktionary.search', '--format', 'text', '--', '--query', 'hello', '--limit', '3'])
  assert.match(text.stdout, /Wiktionary Search/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WiktionarySearchLiveResult>(['apis', 'run', 'wiktionary.search', '--online', '--persist', '--format', 'json', '--', '--query', 'hello', '--limit', '3'], env)
    const offline = await runJson<WiktionarySearchLiveResult>(['apis', 'run', 'wiktionary.search', '--offline', '--format', 'json', '--', '--query', 'hello', '--limit', '3'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.results, online.results)
  })
})

test('Wiktionary live extract verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<WiktionaryExtractLiveResult>(['apis', 'run', 'wiktionary.extract', '--format', 'json', '--', '--title', 'hello', '--chars', '1000'])
  assert.equal(json.kind, 'wiktionary.extract')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.page.title, 'hello')
  assert.equal(json.page.missing, false)
  assert.ok(json.page.extractChars > 100)

  const text = await runCli(['apis', 'run', 'wiktionary.extract', '--format', 'text', '--', '--title', 'hello', '--chars', '1000'])
  assert.match(text.stdout, /Wiktionary Extract/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WiktionaryExtractLiveResult>(['apis', 'run', 'wiktionary.extract', '--online', '--persist', '--format', 'json', '--', '--title', 'hello', '--chars', '1000'], env)
    const offline = await runJson<WiktionaryExtractLiveResult>(['apis', 'run', 'wiktionary.extract', '--offline', '--format', 'json', '--', '--title', 'hello', '--chars', '1000'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.page, online.page)
  })
})

type WiktionarySearchLiveResult = {
  kind: 'wiktionary.search'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { query: string }
  pagination: { returned: number }
  results: unknown[]
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type WiktionaryExtractLiveResult = {
  kind: 'wiktionary.extract'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  page: { title: string; missing: boolean; extractChars: number }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

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
