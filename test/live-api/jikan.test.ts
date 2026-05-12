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
  rateLimit?: string | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type JikanAnimeResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query?: string | undefined; limit: number; sfw: boolean }
  count: number
  anime: Array<{ id: number; title: string; url: string }>
  storage: StorageMeta
}

test('Jikan live e2e covers anime search json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<JikanAnimeResult>(['apis', 'run', 'jikan.anime', '--format', 'json', '--', '--query', 'naruto', '--limit', '3'])
  assert.equal(json.kind, 'jikan.anime')
  assert.equal(json.api.provider, 'jikan')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.rateLimit, '3 requests/second and 60 requests/minute')
  assert.equal(json.query.query, 'naruto')
  assert.equal(json.query.limit, 3)
  assert.equal(json.query.sfw, true)
  assert.ok(json.count > 0)
  assert.ok(json.anime.every(entry => entry.url.startsWith('https://myanimelist.net/anime/')))

  const text = await runCli(['apis', 'run', 'jikan.anime', '--format', 'text', '--', '--query', 'naruto', '--limit', '3'])
  assert.match(text.stdout, /Jikan Anime/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /naruto/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<JikanAnimeResult>(['apis', 'run', 'jikan.anime', '--online', '--persist', '--format', 'json', '--', '--query', 'naruto', '--limit', '3'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<JikanAnimeResult>(['apis', 'run', 'jikan.anime', '--offline', '--format', 'json', '--', '--query', 'naruto', '--limit', '3'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.anime, online.anime)
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
