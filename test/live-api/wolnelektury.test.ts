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
  cliLimitCap?: number | undefined
  cliReadLimitCap?: number | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type WolneBooksResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: Record<string, unknown>
  count: number
  books: Array<{ title: string; slug: string; href: string }>
  storage: StorageMeta
}

type WolneBookResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { slug: string }
  book: { title: string; authors: string[]; downloads: Record<string, string> }
  storage: StorageMeta
}

type WolneReadResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { slug: string; offset: number; limit: number }
  page: { slug: string; totalLines: number; lines: string[]; sourceUrl: string }
  storage: StorageMeta
}

test('Wolne Lektury live e2e covers books json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<WolneBooksResult>(['apis', 'run', 'wolnelektury.books', '--format', 'json', '--', '--query', 'studnia', '--limit', '5'])
  assert.equal(json.kind, 'wolnelektury.books')
  assert.equal(json.api.provider, 'wolnelektury')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.cliLimitCap, 100)
  assert.ok(json.count > 0)
  assert.ok(json.books.some(book => book.slug === 'studnia-i-wahadlo'))

  const text = await runCli(['apis', 'run', 'wolnelektury.books', '--format', 'text', '--', '--query', 'studnia', '--limit', '5'])
  assert.match(text.stdout, /Wolne Lektury Books/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WolneBooksResult>(['apis', 'run', 'wolnelektury.books', '--online', '--persist', '--format', 'json', '--', '--query', 'studnia', '--limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WolneBooksResult>(['apis', 'run', 'wolnelektury.books', '--offline', '--format', 'json', '--', '--query', 'studnia', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.books, online.books)
  })
})

test('Wolne Lektury live e2e covers book json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<WolneBookResult>(['apis', 'run', 'wolnelektury.book', '--format', 'json', '--', '--slug', 'studnia-i-wahadlo'])
  assert.equal(json.kind, 'wolnelektury.book')
  assert.equal(json.api.provider, 'wolnelektury')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.slug, 'studnia-i-wahadlo')
  assert.match(json.book.title, /Studnia/u)
  assert.ok(json.book.authors.includes('Edgar Allan Poe'))
  assert.match(json.book.downloads.txt ?? '', /^https:\/\/wolnelektury\.pl\/media\/book\/txt\//u)

  const text = await runCli(['apis', 'run', 'wolnelektury.book', '--format', 'text', '--', '--slug', 'studnia-i-wahadlo'])
  assert.match(text.stdout, /Wolne Lektury Book/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WolneBookResult>(['apis', 'run', 'wolnelektury.book', '--online', '--persist', '--format', 'json', '--', '--slug', 'studnia-i-wahadlo'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WolneBookResult>(['apis', 'run', 'wolnelektury.book', '--offline', '--format', 'json', '--', '--slug', 'studnia-i-wahadlo'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.book, online.book)
  })
})

test('Wolne Lektury live e2e covers read json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<WolneReadResult>(['apis', 'run', 'wolnelektury.read', '--format', 'json', '--', '--slug', 'studnia-i-wahadlo', '--offset', '0', '--limit', '20'])
  assert.equal(json.kind, 'wolnelektury.read')
  assert.equal(json.api.provider, 'wolnelektury')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.cliReadLimitCap, 200)
  assert.equal(json.query.slug, 'studnia-i-wahadlo')
  assert.equal(json.page.slug, 'studnia-i-wahadlo')
  assert.ok(json.page.totalLines > 20)
  assert.ok(json.page.lines.some(line => /Studnia|wahad/u.test(line)))
  assert.match(json.page.sourceUrl, /^https:\/\/wolnelektury\.pl\/media\/book\/txt\//u)

  const text = await runCli(['apis', 'run', 'wolnelektury.read', '--format', 'text', '--', '--slug', 'studnia-i-wahadlo', '--offset', '0', '--limit', '20'])
  assert.match(text.stdout, /Wolne Lektury Read/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.doesNotMatch(text.stdout, /<!doctype html|<html|base64/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WolneReadResult>(['apis', 'run', 'wolnelektury.read', '--online', '--persist', '--format', 'json', '--', '--slug', 'studnia-i-wahadlo', '--offset', '0', '--limit', '20'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WolneReadResult>(['apis', 'run', 'wolnelektury.read', '--offline', '--format', 'json', '--', '--slug', 'studnia-i-wahadlo', '--offset', '0', '--limit', '20'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.page, online.page)
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
