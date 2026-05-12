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

type AnimeNewsNetworkTitlesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { limit: number; namePrefix?: string | undefined }
  count: number
  titles: Array<{ id: number; name: string; url: string }>
  storage: StorageMeta
}

test('AnimeNewsNetwork live e2e covers title report json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<AnimeNewsNetworkTitlesResult>(['apis', 'run', 'animenewsnetwork.titles', '--format', 'json', '--', '--limit', '3', '--name-prefix', 'Z'])
  assert.equal(json.kind, 'animenewsnetwork.titles')
  assert.equal(json.api.provider, 'anime-news-network')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.rateLimit, '1 request/second/IP')
  assert.equal(json.query.limit, 3)
  assert.equal(json.query.namePrefix, 'Z')
  assert.ok(json.count > 0)
  assert.ok(json.titles.every(title => title.url.startsWith('https://www.animenewsnetwork.com/encyclopedia/anime.php?id=')))

  await sleep(1_100)
  const text = await runCli(['apis', 'run', 'animenewsnetwork.titles', '--format', 'text', '--', '--limit', '3', '--name-prefix', 'Z'])
  assert.match(text.stdout, /AnimeNewsNetwork Titles/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /Anime News Network source\/link attribution/)

  await sleep(1_100)
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<AnimeNewsNetworkTitlesResult>(['apis', 'run', 'animenewsnetwork.titles', '--online', '--persist', '--format', 'json', '--', '--limit', '3', '--name-prefix', 'Z'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<AnimeNewsNetworkTitlesResult>(['apis', 'run', 'animenewsnetwork.titles', '--offline', '--format', 'json', '--', '--limit', '3', '--name-prefix', 'Z'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.titles, online.titles)
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

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
