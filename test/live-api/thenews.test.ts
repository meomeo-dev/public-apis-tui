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
const hasTheNewsKey = readConfiguredTheNewsKey() !== undefined

type TheNewsResult = Record<string, unknown> & {
  kind: 'thenews.all'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { search: string; language: string; limit?: number | undefined; page: number }
  articles: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('TheNewsAPI live e2e covers all-news text and offline replay', {
  skip: liveEnabled && hasTheNewsKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure THENEWSAPI_API_KEY env, project .env, or local provider config',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const key = readConfiguredTheNewsKey()
    assert.ok(key)
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    if (env.THENEWSAPI_API_KEY === undefined) env.THENEWSAPI_API_KEY = key
    const args = ['apis', 'run', 'thenews.all', '--online', '--persist', '--format', 'json', '--', '--search', 'public api', '--language', 'en', '--limit', '1', '--page', '1']
    const online = await runJson<TheNewsResult>(args, env)
    assert.equal(online.kind, 'thenews.all')
    assert.equal(online.api.provider, 'thenews')
    assert.match(online.api.authentication, /THENEWSAPI_API_KEY/)
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.search, 'public api')
    assert.equal(online.query.limit, 1)
    assert.equal(online.storage.persisted, true)
    assert.doesNotMatch(JSON.stringify(online), new RegExp(escapeRegExp(key)))
    const offline = await runJson<TheNewsResult>(['apis', 'run', 'thenews.all', '--offline', '--format', 'json', '--', '--search', 'public api', '--language', 'en', '--limit', '1', '--page', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)
    const text = await runCli(['apis', 'run', 'thenews.all', '--offline', '--format', 'text', '--', '--search', 'public api', '--language', 'en', '--limit', '1', '--page', '1'], env)
    assert.match(text.stdout, /TheNewsAPI All News/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /API token via local config\/env/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.doesNotMatch(text.stdout, new RegExp(escapeRegExp(key)))
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-thenews-'))
  try { await run(publicApisHome) } finally { await rm(publicApisHome, { recursive: true, force: true }) }
}

function readConfiguredTheNewsKey(): string | undefined {
  const envKey = process.env.THENEWSAPI_API_KEY?.trim()
  if (envKey) return envKey
  const projectEnvKey = readEnvFileKey(join(process.cwd(), '.env'), 'THENEWSAPI_API_KEY')
  if (projectEnvKey !== undefined) return projectEnvKey
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.cdp-cli', 'public-apis-tui', 'public-apis', 'thenews', 'config.json'), 'utf8')) as { secrets?: Record<string, string> }
    const configKey = config.secrets?.THENEWSAPI_API_KEY?.trim()
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

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
