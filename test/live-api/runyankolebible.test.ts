import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type RunyankoleBibleResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: 'runyankolebible'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: string
  }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Runyankole Bible live e2e covers books, verse, and chapter', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const books = await runJson<RunyankoleBibleResult & {
    books: unknown[]
  }>([
    'apis', 'run', 'runyankolebible.books',
    '--format', 'json', '--', '--limit', '2',
  ])
  assert.equal(books.kind, 'runyankolebible.books')
  assert.equal(books.api.provider, 'runyankolebible')
  assert.equal(books.api.authentication, 'none')
  assert.equal(books.api.usesBrowserClickstream, false)
  assert.equal(books.api.transport, 'HTTPS JSON REST')
  assert.equal(Array.isArray(books.books), true)

  const verse = await runJson<RunyankoleBibleResult & {
    verse: Record<string, unknown>
  }>([
    'apis', 'run', 'runyankolebible.verse',
    '--format', 'json', '--',
    '--book', '10', '--chapter', '1', '--verse', '1',
  ])
  assert.equal(verse.kind, 'runyankolebible.verse')
  assert.equal(typeof verse.verse.text, 'string')

  const chapter = await runJson<RunyankoleBibleResult & {
    verses: unknown[]
  }>([
    'apis', 'run', 'runyankolebible.chapter',
    '--format', 'json', '--',
    '--book', '10', '--chapter', '1', '--limit', '2',
  ])
  assert.equal(chapter.kind, 'runyankolebible.chapter')
  assert.equal(Array.isArray(chapter.verses), true)

  const text = await runCli([
    'apis', 'run', 'runyankolebible.chapter',
    '--format', 'text', '--',
    '--book', '10', '--chapter', '1', '--limit', '2',
  ])
  assert.match(text.stdout, /Runyankole Bible Chapter/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /The Bible Society of Uganda/)
})

test('Runyankole Bible live e2e covers search and random', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const search = await runJson<RunyankoleBibleResult & {
    verses: unknown[]
  }>([
    'apis', 'run', 'runyankolebible.search',
    '--format', 'json', '--',
    '--query', 'Ruhanga', '--limit', '2',
  ])
  assert.equal(search.kind, 'runyankolebible.search')
  assert.equal(search.api.authentication, 'none')
  assert.equal(Array.isArray(search.verses), true)

  const randomText = await runCli([
    'apis', 'run', 'runyankolebible.random',
    '--format', 'text', '--', '--book', '10',
  ])
  assert.match(randomText.stdout, /Runyankole Bible Random Verse/)
  assert.match(randomText.stdout, /open public-apis apis run runyankolebible\.verse/)
})

test('Runyankole Bible live e2e covers persist and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    await assertOfflineReplay(
      [
        'apis', 'run', 'runyankolebible.books',
        '--online', '--persist', '--format', 'json', '--', '--limit', '2',
      ],
      [
        'apis', 'run', 'runyankolebible.books',
        '--offline', '--format', 'json', '--', '--limit', '2',
      ],
      env,
      'books',
    )
    await assertOfflineReplay(
      [
        'apis', 'run', 'runyankolebible.verse',
        '--online', '--persist', '--format', 'json', '--',
        '--book', '10', '--chapter', '1', '--verse', '1',
      ],
      [
        'apis', 'run', 'runyankolebible.verse',
        '--offline', '--format', 'json', '--',
        '--book', '10', '--chapter', '1', '--verse', '1',
      ],
      env,
      'verse',
    )
    await assertOfflineReplay(
      [
        'apis', 'run', 'runyankolebible.chapter',
        '--online', '--persist', '--format', 'json', '--',
        '--book', '10', '--chapter', '1', '--limit', '2',
      ],
      [
        'apis', 'run', 'runyankolebible.chapter',
        '--offline', '--format', 'json', '--',
        '--book', '10', '--chapter', '1', '--limit', '2',
      ],
      env,
      'verses',
    )
    await assertOfflineReplay(
      [
        'apis', 'run', 'runyankolebible.search',
        '--online', '--persist', '--format', 'json', '--',
        '--query', 'Ruhanga', '--limit', '2',
      ],
      [
        'apis', 'run', 'runyankolebible.search',
        '--offline', '--format', 'json', '--',
        '--query', 'Ruhanga', '--limit', '2',
      ],
      env,
      'verses',
    )
    await assertOfflineReplay(
      [
        'apis', 'run', 'runyankolebible.random',
        '--online', '--persist', '--format', 'json', '--', '--book', '10',
      ],
      [
        'apis', 'run', 'runyankolebible.random',
        '--offline', '--format', 'json', '--', '--book', '10',
      ],
      env,
      'verse',
    )
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

async function assertOfflineReplay(
  onlineArgs: string[],
  offlineArgs: string[],
  env: NodeJS.ProcessEnv,
  payloadKey: string,
): Promise<void> {
  const online = await runJson<Record<string, unknown> & {
    storage: { persisted?: boolean | undefined }
  }>(onlineArgs, env)
  assert.equal(online.storage.persisted, true)
  const offline = await runJson<Record<string, unknown> & {
    storage: { mode?: string | undefined }
  }>(offlineArgs, env)
  assert.equal(offline.storage.mode, 'offline')
  assert.deepEqual(offline[payloadKey], online[payloadKey])
}

async function withPublicApisHome(
  callback: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-runyankole-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
