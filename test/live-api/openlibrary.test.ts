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
  documentedDefaultLimit?: number | undefined
  cliLimitCap?: number | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type OpenLibrarySearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; language?: string | undefined; limit: number }
  count: number
  works: Array<{ key: string; title: string; authors: string[]; url: string }>
  storage: StorageMeta
}

type OpenLibraryWorkResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { workKey: string }
  work: { key: string; title: string; authors: string[]; url: string }
  storage: StorageMeta
}

test('Open Library live e2e covers search json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const args = ['apis', 'run', 'openlibrary.search', '--format', 'json', '--', '--query', 'pride and prejudice', '--language', 'eng', '--limit', '5']
  const json = await runJson<OpenLibrarySearchResult>(args)
  assert.equal(json.kind, 'openlibrary.search')
  assert.equal(json.api.provider, 'openlibrary')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedDefaultLimit, 100)
  assert.equal(json.api.cliLimitCap, 100)
  assert.equal(json.query.limit, 5)
  assert.ok(json.count > 0)
  assert.ok(json.works.every(work => work.key.startsWith('/works/') && work.title.length > 0))

  const text = await runCli(['apis', 'run', 'openlibrary.search', '--format', 'text', '--', '--query', 'pride and prejudice', '--language', 'eng', '--limit', '5'])
  assert.match(text.stdout, /Open Library Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /open first.*openlibrary\.work.*--work-key \/works\//u)
  assert.match(text.stdout, /next page.*openlibrary\.search.*--query "pride and prejudice" --language eng --offset 5 --limit 5/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<OpenLibrarySearchResult>(['apis', 'run', 'openlibrary.search', '--online', '--persist', '--format', 'json', '--', '--query', 'pride and prejudice', '--language', 'eng', '--limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<OpenLibrarySearchResult>(['apis', 'run', 'openlibrary.search', '--offline', '--format', 'json', '--', '--query', 'pride and prejudice', '--language', 'eng', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.works, online.works)
  })
})

test('Open Library live e2e covers work json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<OpenLibraryWorkResult>(['apis', 'run', 'openlibrary.work', '--format', 'json', '--', '--work-key', 'OL66554W'])
  assert.equal(json.kind, 'openlibrary.work')
  assert.equal(json.api.provider, 'openlibrary')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.workKey, '/works/OL66554W')
  assert.equal(json.work.key, '/works/OL66554W')
  assert.match(json.work.title, /Pride and Prejudice/u)

  const text = await runCli(['apis', 'run', 'openlibrary.work', '--format', 'text', '--', '--work-key', 'OL66554W'])
  assert.match(text.stdout, /Open Library Work/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /character development of Elizabeth Bennet/u)
  assert.match(text.stdout, /related search.*openlibrary\.search.*--query "Pride and Prejudice" --limit 100/u)
  assert.doesNotMatch(text.stdout, /character development of Elizabeth Bennet.*…/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<OpenLibraryWorkResult>(['apis', 'run', 'openlibrary.work', '--online', '--persist', '--format', 'json', '--', '--work-key', 'OL66554W'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<OpenLibraryWorkResult>(['apis', 'run', 'openlibrary.work', '--offline', '--format', 'json', '--', '--work-key', 'OL66554W'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.work, online.work)
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
