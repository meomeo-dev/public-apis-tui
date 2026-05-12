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
  documentedMaximumLimit: number
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type SteemDiscussionsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { sort: string; tag: string; limit: number; truncateBody: number }
  count: number
  discussions: Array<{ author: string; permlink: string; title: string; url: string }>
  storage: StorageMeta
}

type SteemThreadResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { author: string; permlink: string; cursor: number; pageSize: number; direction: string; truncateBody: number }
  root: { author: string; permlink: string; title: string }
  items: Array<{ author: string; permlink: string; depth: number }>
  visibleItems: Array<{ author: string; permlink: string; depth: number }>
  scroll: { cursor: number; pageSize: number; total: number; atTop: boolean; atBottom: boolean }
  storage: StorageMeta
}

test('Steem live e2e covers discussions json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<SteemDiscussionsResult>(['apis', 'run', 'steem.discussions', '--format', 'json', '--', '--sort', 'trending', '--tag', 'steem', '--limit', '2', '--truncate-body', '120'])
  assert.equal(json.kind, 'steem.discussions')
  assert.equal(json.api.provider, 'steem')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedMaximumLimit, 100)
  assert.equal(json.query.limit, 2)
  assert.ok(json.discussions.length > 0)
  assert.ok(json.discussions.every(discussion => discussion.author.length > 0 && discussion.permlink.length > 0))

  const text = await runCli(['apis', 'run', 'steem.discussions', '--format', 'text', '--', '--sort', 'trending', '--tag', 'steem', '--limit', '2', '--truncate-body', '120'])
  assert.match(text.stdout, /Steem Discussions/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /steem\.thread/)

  const firstDiscussion = json.discussions[0]
  assert.ok(firstDiscussion !== undefined)
  const thread = await runJson<SteemThreadResult>(['apis', 'run', 'steem.thread', '--format', 'json', '--', '--author', firstDiscussion.author, '--permlink', firstDiscussion.permlink, '--page-size', '3', '--truncate-body', '160'])
  assert.equal(thread.kind, 'steem.thread')
  assert.equal(thread.api.provider, 'steem')
  assert.equal(thread.api.authentication, 'none')
  assert.equal(thread.api.usesBrowserClickstream, false)
  assert.equal(thread.query.author, firstDiscussion.author)
  assert.equal(thread.query.permlink, firstDiscussion.permlink)
  assert.ok(thread.items.length >= 1)
  assert.equal(thread.items[0]?.author, firstDiscussion.author)

  const threadText = await runCli(['apis', 'run', 'steem.thread', '--format', 'text', '--', '--author', firstDiscussion.author, '--permlink', firstDiscussion.permlink, '--page-size', '3', '--truncate-body', '160'])
  assert.match(threadText.stdout, /Steem Thread/)
  assert.match(threadText.stdout, /open JSON-RPC API only · no auth/)
  assert.match(threadText.stdout, /up already at top|down already at bottom|steem\.thread/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<SteemDiscussionsResult>(['apis', 'run', 'steem.discussions', '--online', '--persist', '--format', 'json', '--', '--sort', 'trending', '--tag', 'steem', '--limit', '2', '--truncate-body', '120'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<SteemDiscussionsResult>(['apis', 'run', 'steem.discussions', '--offline', '--format', 'json', '--', '--sort', 'trending', '--tag', 'steem', '--limit', '2', '--truncate-body', '120'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.discussions, online.discussions)

    const threadOnline = await runJson<SteemThreadResult>(['apis', 'run', 'steem.thread', '--online', '--persist', '--format', 'json', '--', '--author', firstDiscussion.author, '--permlink', firstDiscussion.permlink, '--page-size', '3', '--truncate-body', '160'], env)
    assert.equal(threadOnline.storage.persisted, true)
    const threadOffline = await runJson<SteemThreadResult>(['apis', 'run', 'steem.thread', '--offline', '--format', 'json', '--', '--author', firstDiscussion.author, '--permlink', firstDiscussion.permlink, '--page-size', '3', '--truncate-body', '160'], env)
    assert.equal(threadOffline.storage.mode, 'offline')
    assert.deepEqual(threadOffline.items, threadOnline.items)
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
    maxBuffer: 4 * 1024 * 1024,
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
