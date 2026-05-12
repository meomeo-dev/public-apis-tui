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
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type EmojiHubSearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query?: string | undefined; category?: string | undefined; limit: number }
  count: number
  emojis: Array<{ name: string; character: string; unicode: string[] }>
  storage: StorageMeta
}

type EmojiHubRandomResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  emoji: { name: string; character: string; unicode: string[] }
}

type EmojiHubTaxonomyResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { limit: number }
  count: number
  categories?: string[] | undefined
  groups?: string[] | undefined
}

test('EmojiHub live e2e covers random/search/taxonomy json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const random = await runJson<EmojiHubRandomResult>(['apis', 'run', 'emojihub.random', '--format', 'json'])
  assert.equal(random.kind, 'emojihub.random')
  assert.equal(random.api.provider, 'emojihub')
  assert.equal(random.api.authentication, 'none')
  assert.equal(random.api.usesBrowserClickstream, false)
  assert.ok(random.emoji.name.length > 0)
  assert.ok(random.emoji.unicode.length > 0)

  const search = await runJson<EmojiHubSearchResult>(['apis', 'run', 'emojihub.search', '--format', 'json', '--', '--query', 'cat', '--limit', '5'])
  assert.equal(search.kind, 'emojihub.search')
  assert.equal(search.query.query, 'cat')
  assert.equal(search.query.limit, 5)
  assert.ok(search.count > 0)
  assert.ok(search.emojis.every(emoji => emoji.name.toLowerCase().includes('cat')))

  const text = await runCli(['apis', 'run', 'emojihub.search', '--format', 'text', '--', '--query', 'cat', '--limit', '5'])
  assert.match(text.stdout, /EmojiHub Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /cat/)

  const categories = await runJson<EmojiHubTaxonomyResult>(['apis', 'run', 'emojihub.categories', '--format', 'json', '--', '--limit', '10'])
  assert.equal(categories.kind, 'emojihub.categories')
  assert.ok(categories.categories?.includes('animals and nature'))

  const groups = await runJson<EmojiHubTaxonomyResult>(['apis', 'run', 'emojihub.groups', '--format', 'json', '--', '--limit', '50'])
  assert.equal(groups.kind, 'emojihub.groups')
  assert.ok(groups.groups?.includes('cat face'))

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<EmojiHubSearchResult>(['apis', 'run', 'emojihub.search', '--online', '--persist', '--format', 'json', '--', '--query', 'cat', '--limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<EmojiHubSearchResult>(['apis', 'run', 'emojihub.search', '--offline', '--format', 'json', '--', '--query', 'cat', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.emojis, online.emojis)
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
    maxBuffer: 1024 * 1024,
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
