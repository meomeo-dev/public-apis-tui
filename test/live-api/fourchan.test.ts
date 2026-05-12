import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type FourChanBoardsResult = {
  kind: '4chan.boards'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { query?: string | undefined; limit: number }
  boards: Array<Record<string, unknown>>
  storage: StorageMeta
}

type FourChanCatalogResult = {
  kind: '4chan.catalog'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { board: string; limit: number }
  threads: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('4chan live e2e covers boards text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--query', 'technology', '--limit', '3']
    const online = await runJson<FourChanBoardsResult>(['apis', 'run', '4chan.boards', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, '4chan.boards')
    assert.equal(online.api.provider, '4chan')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.query, 'technology')
    assert.equal(online.query.limit, 3)
    assert.ok(online.boards.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<FourChanBoardsResult>(['apis', 'run', '4chan.boards', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.boards, online.boards)

    const text = await runCli(['apis', 'run', '4chan.boards', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /4chan Boards/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

test('4chan live e2e covers catalog text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--board', 'g', '--limit', '3']
    const online = await runJson<FourChanCatalogResult>(['apis', 'run', '4chan.catalog', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, '4chan.catalog')
    assert.equal(online.api.provider, '4chan')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.board, 'g')
    assert.equal(online.query.limit, 3)
    assert.ok(Array.isArray(online.threads))
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<FourChanCatalogResult>(['apis', 'run', '4chan.catalog', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.threads, online.threads)

    const text = await runCli(['apis', 'run', '4chan.catalog', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /4chan Catalog/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-fourchan-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
