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
  documentedPageSize: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type GutendexBooksResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { search?: string | undefined; languages?: string | undefined; page: number }
  count: number
  books: Array<{ id: number; title: string; authors: string[] }>
  storage: StorageMeta
}

type GutendexBookResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { id: number }
  book: { id: number; title: string; authors: string[] }
  storage: StorageMeta
}

test('Gutendex live e2e covers books json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<GutendexBooksResult>(['apis', 'run', 'gutendex.books', '--format', 'json', '--', '--search', 'great expectations', '--languages', 'en', '--page', '1'])
  assert.equal(json.kind, 'gutendex.books')
  assert.equal(json.api.provider, 'gutendex')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedPageSize, '0-32 books per page, controlled by Gutendex')
  assert.equal(json.query.page, 1)
  assert.ok(json.books.length > 0)
  assert.ok(json.books.every(book => book.id > 0 && book.title.length > 0))

  const text = await runCli(['apis', 'run', 'gutendex.books', '--format', 'text', '--', '--search', 'great expectations', '--languages', 'en', '--page', '1'])
  assert.match(text.stdout, /Gutendex Books/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /open first.*gutendex\.book.*--id/u)

  const pagedText = await runCli(['apis', 'run', 'gutendex.books', '--format', 'text', '--', '--search', 'austen', '--languages', 'en', '--page', '1'])
  assert.match(pagedText.stdout, /next page.*gutendex\.books.*--search austen --languages en --page 2/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GutendexBooksResult>(['apis', 'run', 'gutendex.books', '--online', '--persist', '--format', 'json', '--', '--search', 'great expectations', '--languages', 'en', '--page', '1'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GutendexBooksResult>(['apis', 'run', 'gutendex.books', '--offline', '--format', 'json', '--', '--search', 'great expectations', '--languages', 'en', '--page', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.books, online.books)
  })
})

test('Gutendex live e2e covers book json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<GutendexBookResult>(['apis', 'run', 'gutendex.book', '--format', 'json', '--', '--id', '1342'])
  assert.equal(json.kind, 'gutendex.book')
  assert.equal(json.api.provider, 'gutendex')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.id, 1342)
  assert.equal(json.book.id, 1342)
  assert.match(json.book.title, /Pride and Prejudice/u)

  const text = await runCli(['apis', 'run', 'gutendex.book', '--format', 'text', '--', '--id', '1342'])
  assert.match(text.stdout, /Gutendex Book/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /first impressions/u)
  assert.match(text.stdout, /related search.*gutendex\.books.*--search "Pride and Prejudice" --languages en --page 1/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GutendexBookResult>(['apis', 'run', 'gutendex.book', '--online', '--persist', '--format', 'json', '--', '--id', '1342'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GutendexBookResult>(['apis', 'run', 'gutendex.book', '--offline', '--format', 'json', '--', '--id', '1342'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.book, online.book)
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
