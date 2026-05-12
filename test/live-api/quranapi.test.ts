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
  cliChapterLimitCap?: number | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type QuranApiVerseResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { edition: string; chapter: number; verse: number }
  verse: { chapter: number; verse: number; text: string }
  storage: StorageMeta
}

type QuranApiChapterResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { edition: string; chapter: number; offset: number; limit: number }
  count: number
  totalVerses: number
  verses: Array<{ chapter: number; verse: number; text: string }>
  storage: StorageMeta
}

test('Quran-api live e2e covers verse json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const args = ['apis', 'run', 'quranapi.verse', '--format', 'json', '--', '--edition', 'eng-ummmuhammad', '--chapter', '4', '--verse', '157']
  const json = await runJson<QuranApiVerseResult>(args)
  assert.equal(json.kind, 'quranapi.verse')
  assert.equal(json.api.provider, 'quranapi')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.verse.chapter, 4)
  assert.equal(json.verse.verse, 157)
  assert.match(json.verse.text, /kill|crucify/u)

  const text = await runCli(['apis', 'run', 'quranapi.verse', '--format', 'text', '--', '--edition', 'eng-ummmuhammad', '--chapter', '4', '--verse', '157'])
  assert.match(text.stdout, /Quran-api Verse/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<QuranApiVerseResult>(['apis', 'run', 'quranapi.verse', '--online', '--persist', '--format', 'json', '--', '--edition', 'eng-ummmuhammad', '--chapter', '4', '--verse', '157'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<QuranApiVerseResult>(['apis', 'run', 'quranapi.verse', '--offline', '--format', 'json', '--', '--edition', 'eng-ummmuhammad', '--chapter', '4', '--verse', '157'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.verse, online.verse)
  })
})

test('Quran-api live e2e covers chapter json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<QuranApiChapterResult>(['apis', 'run', 'quranapi.chapter', '--format', 'json', '--', '--edition', 'eng-ummmuhammad', '--chapter', '1', '--limit', '7'])
  assert.equal(json.kind, 'quranapi.chapter')
  assert.equal(json.api.provider, 'quranapi')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.cliChapterLimitCap, 286)
  assert.equal(json.query.offset, 0)
  assert.equal(json.count, 7)
  assert.equal(json.totalVerses, 7)
  assert.equal(json.verses[0]?.verse, 1)

  const text = await runCli(['apis', 'run', 'quranapi.chapter', '--format', 'text', '--', '--edition', 'eng-ummmuhammad', '--chapter', '1', '--limit', '7'])
  assert.match(text.stdout, /Quran-api Chapter/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<QuranApiChapterResult>(['apis', 'run', 'quranapi.chapter', '--online', '--persist', '--format', 'json', '--', '--edition', 'eng-ummmuhammad', '--chapter', '1', '--limit', '7'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<QuranApiChapterResult>(['apis', 'run', 'quranapi.chapter', '--offline', '--format', 'json', '--', '--edition', 'eng-ummmuhammad', '--chapter', '1', '--limit', '7'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.verses, online.verses)
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
