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
  freeRateLimit?: string | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type AnimeChanRandomResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: Record<string, unknown>
  quote: {
    content: string
    anime: { id: number; name: string; altName?: string | undefined }
    character: { id: number; name: string }
  }
  storage: StorageMeta
}

test('AnimeChan live e2e covers random quote json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<AnimeChanRandomResult>(['apis', 'run', 'animechan.random', '--format', 'json'])
  assert.equal(json.kind, 'animechan.random')
  assert.equal(json.api.provider, 'animechan')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.freeRateLimit, '5 requests/hour')
  assert.equal(typeof json.quote.content, 'string')
  assert.ok(json.quote.content.length > 0)
  assert.ok(json.quote.anime.name.length > 0)
  assert.ok(json.quote.character.name.length > 0)

  const text = await runCli(['apis', 'run', 'animechan.random', '--format', 'text'])
  assert.match(text.stdout, /AnimeChan Random Quote/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<AnimeChanRandomResult>(['apis', 'run', 'animechan.random', '--online', '--persist', '--format', 'json', '--', '--anime', 'ReLIFE'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(online.query.anime, 'ReLIFE')
    const offline = await runJson<AnimeChanRandomResult>(['apis', 'run', 'animechan.random', '--offline', '--format', 'json', '--', '--anime', 'ReLIFE'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.quote, online.quote)
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
