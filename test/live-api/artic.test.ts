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
  endpoint: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type ArticArtworksResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query?: string | undefined; limit: number; page: number }
  count: number
  artworks: Array<{ id: number; title: string; artworkUrl: string; apiUrl: string }>
  storage: StorageMeta
}

test('Art Institute of Chicago live e2e covers artworks json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<ArticArtworksResult>(['apis', 'run', 'artic.artworks', '--format', 'json', '--', '--query', 'cats', '--limit', '3'])
  assert.equal(json.kind, 'artic.artworks')
  assert.equal(json.api.provider, 'art-institute-chicago')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.endpoint, 'GET /artworks/search')
  assert.equal(json.query.query, 'cats')
  assert.equal(json.query.limit, 3)
  assert.equal(json.query.page, 1)
  assert.ok(json.count > 0)
  assert.ok(json.artworks.every(entry => entry.artworkUrl.startsWith('https://www.artic.edu/artworks/')))
  assert.ok(json.artworks.every(entry => entry.apiUrl.startsWith('https://api.artic.edu/api/v1/artworks/')))

  const text = await runCli(['apis', 'run', 'artic.artworks', '--format', 'text', '--', '--query', 'cats', '--limit', '3'])
  assert.match(text.stdout, /Art Institute of Chicago Artworks/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /query=cats/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ArticArtworksResult>(['apis', 'run', 'artic.artworks', '--online', '--persist', '--format', 'json', '--', '--query', 'cats', '--limit', '3'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ArticArtworksResult>(['apis', 'run', 'artic.artworks', '--offline', '--format', 'json', '--', '--query', 'cats', '--limit', '3'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.artworks, online.artworks)
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
