import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('JSONPlaceholder live posts verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-jsonplaceholder-posts-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<JsonPlaceholderPostsLiveResult>(['apis', 'run', 'jsonplaceholder.posts', '--online', '--persist', '--format', 'json', '--', '--limit', '5'], env)
    assert.equal(online.kind, 'jsonplaceholder.posts')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.limit, 5)
    assert.equal(online.posts.length, 5)
    assert.equal(typeof online.posts[0]?.title, 'string')

    const offline = await runJson<JsonPlaceholderPostsLiveResult>(['apis', 'run', 'jsonplaceholder.posts', '--offline', '--format', 'json', '--', '--limit', '5'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.posts, online.posts)

    const text = await runCli(['apis', 'run', 'jsonplaceholder.posts', '--offline', '--format', 'text', '--', '--limit', '5'], env)
    assert.match(text, /JSONPlaceholder Posts/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

test('JSONPlaceholder live post verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-jsonplaceholder-post-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<JsonPlaceholderPostLiveResult>(['apis', 'run', 'jsonplaceholder.post', '--online', '--persist', '--format', 'json', '--', '--id', '1'], env)
    assert.equal(online.kind, 'jsonplaceholder.post')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.id, 1)
    assert.equal(online.post.id, 1)

    const offline = await runJson<JsonPlaceholderPostLiveResult>(['apis', 'run', 'jsonplaceholder.post', '--offline', '--format', 'json', '--', '--id', '1'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.post, online.post)

    const text = await runCli(['apis', 'run', 'jsonplaceholder.post', '--offline', '--format', 'text', '--', '--id', '1'], env)
    assert.match(text, /JSONPlaceholder Post/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

async function runJson<T>(args: string[], extraEnv: Record<string, string> = {}): Promise<T> {
  const output = await runCli(args, extraEnv)
  return JSON.parse(output) as T
}

async function runCli(args: string[], extraEnv: Record<string, string> = {}): Promise<string> {
  const { stdout } = await execFileAsync('node', ['--import', 'tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv, NO_COLOR: '1' },
    maxBuffer: 1024 * 1024,
  })
  return stdout
}

type JsonPlaceholderPostsLiveResult = {
  kind: 'jsonplaceholder.posts'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { limit: number }
  posts: Array<{ id?: number; title?: string }>
  storage?: { mode: string; persisted?: boolean }
}

type JsonPlaceholderPostLiveResult = {
  kind: 'jsonplaceholder.post'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { id: number }
  post: { id: number }
  storage?: { mode: string; persisted?: boolean }
}
