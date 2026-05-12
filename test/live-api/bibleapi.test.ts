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
  rateLimit: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type BibleApiPassageResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { reference: string; translation: string; maxVerses: number }
  reference: string
  count: number
  verses: Array<{ bookName: string; chapter: number; verse: number; text: string }>
  storage: StorageMeta
}

type BibleApiRandomResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { translation: string; book?: string | undefined; chapter?: number | undefined }
  translation: { id: string; name: string; license: string }
  verse: { bookName: string; chapter: number; verse: number; text: string }
  storage: StorageMeta
}

test('Bible-api live e2e covers passage json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<BibleApiPassageResult>(['apis', 'run', 'bibleapi.passage', '--format', 'json', '--', '--reference', 'John 3:16', '--translation', 'web', '--max-verses', '1'])
  assert.equal(json.kind, 'bibleapi.passage')
  assert.equal(json.api.provider, 'bible-api')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.rateLimit, '15 requests / 30 seconds / IP')
  assert.equal(json.query.translation, 'web')
  assert.equal(json.count, 1)
  assert.equal(json.verses[0]?.bookName, 'John')

  const text = await runCli(['apis', 'run', 'bibleapi.passage', '--format', 'text', '--', '--reference', 'John 3:16', '--translation', 'web', '--max-verses', '1'])
  assert.match(text.stdout, /Bible-api Passage/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /eternal life\./)
  assert.match(text.stdout, /random same book.*bibleapi\.random.*--translation web --book JHN/u)
  assert.doesNotMatch(text.stdout, /For God so loved[^\n]+…/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<BibleApiPassageResult>(['apis', 'run', 'bibleapi.passage', '--online', '--persist', '--format', 'json', '--', '--reference', 'John 3:16', '--translation', 'web', '--max-verses', '1'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<BibleApiPassageResult>(['apis', 'run', 'bibleapi.passage', '--offline', '--format', 'json', '--', '--reference', 'John 3:16', '--translation', 'web', '--max-verses', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.verses, online.verses)
  })
})

test('Bible-api live e2e covers random verse json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<BibleApiRandomResult>(['apis', 'run', 'bibleapi.random', '--format', 'json', '--', '--translation', 'web', '--book', 'JHN'])
  assert.equal(json.kind, 'bibleapi.random')
  assert.equal(json.api.provider, 'bible-api')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.translation, 'web')
  assert.equal(json.query.book, 'JHN')
  assert.equal(json.translation.license, 'Public Domain')
  assert.ok(json.verse.text.length > 0)

  const text = await runCli(['apis', 'run', 'bibleapi.random', '--format', 'text', '--', '--translation', 'web', '--book', 'JHN'])
  assert.match(text.stdout, /Bible-api Random Verse/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /open passage.*bibleapi\.passage.*--translation web/u)
  assert.match(text.stdout, /again.*bibleapi\.random.*--translation web --book JHN/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<BibleApiRandomResult>(['apis', 'run', 'bibleapi.random', '--online', '--persist', '--format', 'json', '--', '--translation', 'web', '--book', 'JHN'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<BibleApiRandomResult>(['apis', 'run', 'bibleapi.random', '--offline', '--format', 'json', '--', '--translation', 'web', '--book', 'JHN'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.verse, online.verse)
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
