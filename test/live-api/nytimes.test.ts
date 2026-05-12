import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'
const hasNyTimesKey = hasConfiguredNyTimesKey()

type NyTimesResult = Record<string, unknown> & {
  kind: 'nytimes.search' | 'nytimes.topStories'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  articles: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('NYTimes live e2e covers Article Search and offline replay', {
  skip: liveEnabled && hasNyTimesKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure NYTIMES_API_KEY env, project .env, or local provider config',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const key = readConfiguredNyTimesKey()
    assert.ok(key)
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    if (env.NYTIMES_API_KEY === undefined) {
      env.NYTIMES_API_KEY = key
    }
    const online = await runJson<NyTimesResult>(['apis', 'run', 'nytimes.search', '--online', '--persist', '--format', 'json', '--', '--query', 'public api', '--page', '0'], env)
    assert.equal(online.kind, 'nytimes.search')
    assert.equal(online.api.provider, 'nytimes')
    assert.match(online.api.authentication, /NYTIMES_API_KEY/)
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.ok(Array.isArray(online.articles))
    assert.equal(online.storage.persisted, true)
    assert.doesNotMatch(JSON.stringify(online), new RegExp(escapeRegExp(key)))

    const offline = await runJson<NyTimesResult>(['apis', 'run', 'nytimes.search', '--offline', '--format', 'json', '--', '--query', 'public api', '--page', '0'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)
  })
})

test('NYTimes live e2e covers Top Stories and offline replay', {
  skip: liveEnabled && hasNyTimesKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure NYTIMES_API_KEY env, project .env, or local provider config',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const key = readConfiguredNyTimesKey()
    assert.ok(key)
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    if (env.NYTIMES_API_KEY === undefined) {
      env.NYTIMES_API_KEY = key
    }
    const online = await runJson<NyTimesResult>(['apis', 'run', 'nytimes.topStories', '--online', '--persist', '--format', 'json', '--', '--section', 'home', '--limit', '1'], env)
    assert.equal(online.kind, 'nytimes.topStories')
    assert.equal(online.api.provider, 'nytimes')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.ok(Array.isArray(online.articles))
    assert.equal(online.storage.persisted, true)
    assert.doesNotMatch(JSON.stringify(online), new RegExp(escapeRegExp(key)))

    const offline = await runJson<NyTimesResult>(['apis', 'run', 'nytimes.topStories', '--offline', '--format', 'json', '--', '--section', 'home', '--limit', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-nytimes-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function hasConfiguredNyTimesKey(): boolean {
  return readConfiguredNyTimesKey() !== undefined
}

function readConfiguredNyTimesKey(): string | undefined {
  const envKey = process.env.NYTIMES_API_KEY?.trim()
  if (envKey) return envKey
  const projectEnvKey = readEnvFileKey(join(process.cwd(), '.env'), 'NYTIMES_API_KEY')
  if (projectEnvKey !== undefined) return projectEnvKey
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.cdp-cli', 'public-apis-tui', 'public-apis', 'nytimes', 'config.json'), 'utf8')) as { secrets?: Record<string, string> }
    const configKey = config.secrets?.NYTIMES_API_KEY?.trim()
    return configKey ? configKey : undefined
  } catch {
    return undefined
  }
}

function readEnvFileKey(path: string, key: string): string | undefined {
  if (!existsSync(path)) return undefined
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const match = new RegExp(`^${key}=([^\\r\\n#]+)`, 'u').exec(line.trim())
    const value = match?.[1]?.trim()
    if (value) return value
  }
  return undefined
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
