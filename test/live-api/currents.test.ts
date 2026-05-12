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
const hasCurrentsKey = hasConfiguredCurrentsKey()

type CurrentsNewsResult = Record<string, unknown> & {
  kind: 'currents.news'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { language: string; pageSize: number; page: number }
  pagination: { page: number; pageSize: number; returned: number }
  articles: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Currents live e2e covers latest news and offline replay', {
  skip: liveEnabled && hasCurrentsKey ? false : 'set PUBLIC_APIS_LIVE_E2E=1 and configure CURRENTS_API_KEY env, project .env, or local provider config',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const currentsKey = readConfiguredCurrentsKey()
    assert.ok(currentsKey)
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    if (env.CURRENTS_API_KEY === undefined) {
      env.CURRENTS_API_KEY = currentsKey
    }

    const online = await runJson<CurrentsNewsResult>([
      'apis',
      'run',
      'currents.news',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--language',
      'en',
      '--page-size',
      '1',
      '--page',
      '1',
    ], env)
    assert.equal(online.kind, 'currents.news')
    assert.equal(online.api.provider, 'currents')
    assert.match(online.api.authentication, /CURRENTS_API_KEY/)
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.language, 'en')
    assert.equal(online.query.pageSize, 1)
    assert.equal(online.query.page, 1)
    assert.equal(online.pagination.pageSize, 1)
    assert.ok(Array.isArray(online.articles))
    assert.equal(online.storage.persisted, true)
    assert.doesNotMatch(JSON.stringify(online), new RegExp(escapeRegExp(currentsKey)))

    const offline = await runJson<CurrentsNewsResult>([
      'apis',
      'run',
      'currents.news',
      '--offline',
      '--format',
      'json',
      '--',
      '--language',
      'en',
      '--page-size',
      '1',
      '--page',
      '1',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)
    assert.doesNotMatch(JSON.stringify(offline), new RegExp(escapeRegExp(currentsKey)))

    const text = await runCli([
      'apis',
      'run',
      'currents.news',
      '--offline',
      '--format',
      'text',
      '--',
      '--language',
      'en',
      '--page-size',
      '1',
      '--page',
      '1',
    ], env)
    assert.match(text.stdout, /Currents News/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /API key via local config\/env/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.doesNotMatch(text.stdout, new RegExp(escapeRegExp(currentsKey)))
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-currents-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function hasConfiguredCurrentsKey(): boolean {
  return readConfiguredCurrentsKey() !== undefined
}

function readConfiguredCurrentsKey(): string | undefined {
  const envKey = process.env.CURRENTS_API_KEY?.trim()
  if (envKey) {
    return envKey
  }

  const projectEnvKey = readEnvFileKey(join(process.cwd(), '.env'), 'CURRENTS_API_KEY')
  if (projectEnvKey !== undefined) {
    return projectEnvKey
  }

  try {
    const config = JSON.parse(readFileSync(join(
      homedir(),
      '.cdp-cli',
      'public-apis-tui',
      'public-apis',
      'currents',
      'config.json',
    ), 'utf8')) as { secrets?: Record<string, string> }
    const configKey = config.secrets?.CURRENTS_API_KEY?.trim()
    return configKey ? configKey : undefined
  } catch {
    return undefined
  }
}

function readEnvFileKey(path: string, key: string): string | undefined {
  if (!existsSync(path)) {
    return undefined
  }
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const match = new RegExp(`^${key}=([^\\r\\n#]+)`, 'u').exec(line.trim())
    const value = match?.[1]?.trim()
    if (value) {
      return value
    }
  }
  return undefined
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}
