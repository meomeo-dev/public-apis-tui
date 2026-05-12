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
  documentedMaximumLimit?: number | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type StudioGhibliFilmsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { limit: number; title?: string | undefined }
  count: number
  films: Array<{ title: string; url: string; rtScore: number }>
  storage: StorageMeta
}

test('Studio Ghibli live e2e covers films json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<StudioGhibliFilmsResult>(['apis', 'run', 'studioghibli.films', '--format', 'json', '--', '--title', 'totoro', '--limit', '250'])
  assert.equal(json.kind, 'studioghibli.films')
  assert.equal(json.api.provider, 'studio-ghibli')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedMaximumLimit, 250)
  assert.equal(json.query.limit, 250)
  assert.equal(json.query.title, 'totoro')
  assert.ok(json.count >= 1)
  assert.ok(json.films.some(film => film.title === 'My Neighbor Totoro'))
  assert.ok(json.films.every(film => film.url.startsWith('https://ghibliapi.vercel.app/films/')))

  const text = await runCli(['apis', 'run', 'studioghibli.films', '--format', 'text', '--', '--title', 'totoro', '--limit', '250'])
  assert.match(text.stdout, /Studio Ghibli Films/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /totoro/)
  assert.match(text.stdout, /My Neighbor Totoro/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<StudioGhibliFilmsResult>(['apis', 'run', 'studioghibli.films', '--online', '--persist', '--format', 'json', '--', '--title', 'totoro', '--limit', '250'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<StudioGhibliFilmsResult>(['apis', 'run', 'studioghibli.films', '--offline', '--format', 'json', '--', '--title', 'totoro', '--limit', '250'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.films, online.films)
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
