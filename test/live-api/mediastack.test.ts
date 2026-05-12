import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'
const hasMediastackKey = hasConfiguredMediastackKey()

type PublicApiMeta = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type MediastackNewsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  pagination: { limit: number }
  articles: unknown[]
  storage: StorageMeta
}

test('Mediastack live e2e covers news operation', {
  skip: liveEnabled && hasMediastackKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure MEDIASTACK_API_KEY env or local provider config',
}, async () => {
  const json = await runJson<MediastackNewsResult>(['apis', 'run', 'mediastack.news', '--format', 'json', '--', '--limit', '1'])
  assert.equal(json.kind, 'mediastack.news')
  assert.equal(json.api.provider, 'mediastack')
  assert.match(json.api.authentication, /access_key/)
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.pagination.limit, 1)
  assert.ok(Array.isArray(json.articles))

  const text = await runCli(['apis', 'run', 'mediastack.news', '--format', 'text', '--', '--limit', '1'])
  assert.match(text.stdout, /Mediastack News/)
  assert.match(text.stdout, /open REST API only/)
  assert.match(text.stdout, /no Chrome clickstream/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const secretArgs = process.env.MEDIASTACK_API_KEY === undefined
      ? ['apis', 'config', 'mediastack', '--set-secret', `MEDIASTACK_API_KEY=${readConfiguredMediastackKey()}`]
      : undefined
    if (secretArgs !== undefined) {
      await runCli(secretArgs, env)
    }

    const online = await runJson<MediastackNewsResult>(['apis', 'run', 'mediastack.news', '--online', '--persist', '--format', 'json', '--', '--limit', '1'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<MediastackNewsResult>(['apis', 'run', 'mediastack.news', '--offline', '--format', 'json', '--', '--limit', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)
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

function hasConfiguredMediastackKey(): boolean {
  return readConfiguredMediastackKey() !== undefined
}

function readConfiguredMediastackKey(): string | undefined {
  const envKey = process.env.MEDIASTACK_API_KEY?.trim()
  if (envKey) {
    return envKey
  }

  try {
    const config = JSON.parse(readFileSync(join(
      homedir(),
      '.cdp-cli',
      'public-apis-tui',
      'public-apis',
      'mediastack',
      'config.json',
    ), 'utf8')) as { secrets?: Record<string, string> }
    const configKey = config.secrets?.MEDIASTACK_API_KEY?.trim()
    return configKey ? configKey : undefined
  } catch {
    return undefined
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
