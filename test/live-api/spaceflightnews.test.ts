import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type SpaceflightNewsResult = Record<string, unknown> & {
  kind: 'spaceflightnews.articles'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { limit: number; offset: number }
  pagination: { returned: number; total: number; limit: number; offset: number }
  articles: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Spaceflight News live e2e covers articles and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<SpaceflightNewsResult>(['apis', 'run', 'spaceflightnews.articles', '--online', '--persist', '--format', 'json', '--', '--limit', '1', '--offset', '0'], env)
    assert.equal(online.kind, 'spaceflightnews.articles')
    assert.equal(online.api.provider, 'spaceflightnews')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.limit, 1)
    assert.equal(online.query.offset, 0)
    assert.ok(online.articles.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<SpaceflightNewsResult>(['apis', 'run', 'spaceflightnews.articles', '--offline', '--format', 'json', '--', '--limit', '1', '--offset', '0'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.articles, online.articles)

    const text = await runCli(['apis', 'run', 'spaceflightnews.articles', '--offline', '--format', 'text', '--', '--limit', '1', '--offset', '0'], env)
    assert.match(text.stdout, /Spaceflight News Articles/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 64 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-spaceflightnews-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
