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
  documentedMaximumResult: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type GitaTeluguVerseResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { language: string; chapter?: number | undefined; verse?: number | undefined; serial?: number | undefined }
  verse: { chapterNo: number; verseNo: number | number[]; language: string; text: string[]; translation: string }
  navigation: { next?: { command: string } | undefined; alternateLanguage: { command: string } }
  storage: StorageMeta
}

test('Bhagavad Gita Telugu live e2e covers verse json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<GitaTeluguVerseResult>(['apis', 'run', 'gitatelugu.verse', '--format', 'json', '--', '--language', 'tel', '--chapter', '1', '--verse', '1'])
  assert.equal(json.kind, 'gitatelugu.verse')
  assert.equal(json.api.provider, 'gita-telugu')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedMaximumResult, 'Single verse lookup only; no pagination maximum applies.')
  assert.equal(json.query.language, 'tel')
  assert.equal(json.verse.chapterNo, 1)
  assert.ok(json.verse.text.length > 0)
  assert.match(json.navigation.next?.command ?? '', /--language tel --chapter 1 --verse 2/u)
  assert.match(json.navigation.alternateLanguage.command, /--language odi --chapter 1 --verse 1/u)

  const text = await runCli(['apis', 'run', 'gitatelugu.verse', '--format', 'text', '--', '--language', 'tel', '--chapter', '1', '--verse', '1'])
  assert.match(text.stdout, /Bhagavad Gita Telugu Verse/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /previous already at the first verse/)
  assert.match(text.stdout, /next.*gitatelugu\.verse.*--language tel --chapter 1 --verse 2/u)
  assert.match(text.stdout, /switch language.*gitatelugu\.verse.*--language odi --chapter 1 --verse 1/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<GitaTeluguVerseResult>(['apis', 'run', 'gitatelugu.verse', '--online', '--persist', '--format', 'json', '--', '--language', 'tel', '--chapter', '1', '--verse', '1'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<GitaTeluguVerseResult>(['apis', 'run', 'gitatelugu.verse', '--offline', '--format', 'json', '--', '--language', 'tel', '--chapter', '1', '--verse', '1'], env)
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
