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

type NekosBestResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: Record<string, unknown>
  count: number
  assets: Array<{ url: string; contentType: string }>
  storage: StorageMeta
}

test('NekosBest live e2e covers random and search json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const randomJson = await runJson<NekosBestResult>(['apis', 'run', 'nekosbest.random', '--format', 'json', '--', '--category', 'neko', '--amount', '2'])
  assert.equal(randomJson.kind, 'nekosbest.random')
  assert.equal(randomJson.api.provider, 'nekosbest')
  assert.equal(randomJson.api.authentication, 'none')
  assert.equal(randomJson.api.usesBrowserClickstream, false)
  assert.equal(randomJson.query.category, 'neko')
  assert.equal(randomJson.query.amount, 2)
  assert.equal(randomJson.count, 2)
  assert.ok(randomJson.assets.every(asset => asset.url.startsWith('https://nekos.best/api/v2/')))

  const searchJson = await runJson<NekosBestResult>(['apis', 'run', 'nekosbest.search', '--format', 'json', '--', '--query', 'saber', '--type', 'image', '--amount', '2'])
  assert.equal(searchJson.kind, 'nekosbest.search')
  assert.equal(searchJson.api.provider, 'nekosbest')
  assert.equal(searchJson.query.query, 'saber')
  assert.equal(searchJson.query.type, 'image')
  assert.equal(searchJson.query.typeCode, 1)
  assert.ok(searchJson.assets.every(asset => asset.url.startsWith('https://nekos.best/api/v2/')))

  const text = await runCli(['apis', 'run', 'nekosbest.random', '--format', 'text', '--', '--category', 'neko', '--amount', '2'])
  assert.match(text.stdout, /NekosBest Random/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /category=neko amount=2/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NekosBestResult>(['apis', 'run', 'nekosbest.random', '--online', '--persist', '--format', 'json', '--', '--category', 'neko', '--amount', '2'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<NekosBestResult>(['apis', 'run', 'nekosbest.random', '--offline', '--format', 'json', '--', '--category', 'neko', '--amount', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.assets, online.assets)
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
