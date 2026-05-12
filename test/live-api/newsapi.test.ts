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
const hasNewsApiKey = hasConfiguredNewsApiKey()

type NewsApiResult = Record<string, unknown> & {
  kind: 'newsapi.headlines' | 'newsapi.everything'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { pageSize: number; page: number }
  articles: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('NewsAPI live e2e covers headlines and offline replay', { skip: liveEnabled && hasNewsApiKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure NEWSAPI_API_KEY' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const key = readConfiguredNewsApiKey()
    assert.ok(key)
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    if (env.NEWSAPI_API_KEY === undefined) env.NEWSAPI_API_KEY = key
    const online = await runJson<NewsApiResult>(['apis', 'run', 'newsapi.headlines', '--online', '--persist', '--format', 'json', '--', '--country', 'us', '--page-size', '1', '--page', '1'], env)
    assert.equal(online.kind, 'newsapi.headlines')
    assert.equal(online.api.provider, 'newsapi')
    assert.match(online.api.authentication, /NEWSAPI_API_KEY/)
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.pageSize, 1)
    assert.equal(online.storage.persisted, true)
    assert.doesNotMatch(JSON.stringify(online), new RegExp(escapeRegExp(key)))
    const offline = await runJson<NewsApiResult>(['apis', 'run', 'newsapi.headlines', '--offline', '--format', 'json', '--', '--country', 'us', '--page-size', '1', '--page', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)
  })
})

test('NewsAPI live e2e covers everything and offline replay', { skip: liveEnabled && hasNewsApiKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure NEWSAPI_API_KEY' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const key = readConfiguredNewsApiKey()
    assert.ok(key)
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    if (env.NEWSAPI_API_KEY === undefined) env.NEWSAPI_API_KEY = key
    const online = await runJson<NewsApiResult>(['apis', 'run', 'newsapi.everything', '--online', '--persist', '--format', 'json', '--', '--query', 'public api', '--page-size', '1', '--page', '1'], env)
    assert.equal(online.kind, 'newsapi.everything')
    assert.equal(online.api.provider, 'newsapi')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.pageSize, 1)
    assert.equal(online.storage.persisted, true)
    assert.doesNotMatch(JSON.stringify(online), new RegExp(escapeRegExp(key)))
    const offline = await runJson<NewsApiResult>(['apis', 'run', 'newsapi.everything', '--offline', '--format', 'json', '--', '--query', 'public api', '--page-size', '1', '--page', '1'], env)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-newsapi-'))
  try { await run(publicApisHome) } finally { await rm(publicApisHome, { recursive: true, force: true }) }
}

function hasConfiguredNewsApiKey(): boolean { return readConfiguredNewsApiKey() !== undefined }
function readConfiguredNewsApiKey(): string | undefined {
  const envKey = process.env.NEWSAPI_API_KEY?.trim()
  if (envKey) return envKey
  const projectEnvKey = readEnvFileKey(join(process.cwd(), '.env'), 'NEWSAPI_API_KEY')
  if (projectEnvKey !== undefined) return projectEnvKey
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.cdp-cli', 'public-apis-tui', 'public-apis', 'newsapi', 'config.json'), 'utf8')) as { secrets?: Record<string, string> }
    const configKey = config.secrets?.NEWSAPI_API_KEY?.trim()
    return configKey ? configKey : undefined
  } catch { return undefined }
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
function stripAnsi(value: string): string { return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '') }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&') }
