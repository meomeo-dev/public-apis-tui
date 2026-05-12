import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Hacker News live stories verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-hackernews-stories-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<HackerNewsStoriesLiveResult>(['apis', 'run', 'hackernews.stories', '--online', '--persist', '--format', 'json', '--', '--list', 'top', '--limit', '3'], env)
    assert.equal(online.kind, 'hackernews.stories')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.list, 'top')
    assert.equal(online.query.limit, 3)
    assert.equal(online.stories.length, 3)
    assert.equal(typeof online.stories[0]?.id, 'number')

    const offline = await runJson<HackerNewsStoriesLiveResult>(['apis', 'run', 'hackernews.stories', '--offline', '--format', 'json', '--', '--list', 'top', '--limit', '3'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.ids, online.ids)

    const text = await runCli(['apis', 'run', 'hackernews.stories', '--offline', '--format', 'text', '--', '--list', 'top', '--limit', '3'], env)
    assert.match(text, /Hacker News Stories/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

test('Hacker News live item verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-hackernews-item-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<HackerNewsItemLiveResult>(['apis', 'run', 'hackernews.item', '--online', '--persist', '--format', 'json', '--', '--id', '8863'], env)
    assert.equal(online.kind, 'hackernews.item')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.id, 8863)
    assert.equal(online.item.id, 8863)

    const offline = await runJson<HackerNewsItemLiveResult>(['apis', 'run', 'hackernews.item', '--offline', '--format', 'json', '--', '--id', '8863'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.item, online.item)

    const text = await runCli(['apis', 'run', 'hackernews.item', '--offline', '--format', 'text', '--', '--id', '8863'], env)
    assert.match(text, /Hacker News Item/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

test('Hacker News live thread verifies full JSON shape and scroll replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-hackernews-thread-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const queryArgs = ['--id', '8863', '--page-size', '5', '--cursor', '0']
    const online = await runJson<HackerNewsThreadLiveResult>(['apis', 'run', 'hackernews.thread', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'hackernews.thread')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.id, 8863)
    assert.equal(online.root.id, 8863)
    assert.ok(online.items.length >= online.visibleItems.length)
    assert.equal(online.scroll.atTop, true)
    assert.equal(online.scroll.pageSize, 5)

    const offline = await runJson<HackerNewsThreadLiveResult>(['apis', 'run', 'hackernews.thread', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.items.map(item => item.id), online.items.map(item => item.id))

    const text = await runCli(['apis', 'run', 'hackernews.thread', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text, /Hacker News Thread/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
    assert.match(text, /already at top/)
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

type HackerNewsStoriesLiveResult = {
  kind: 'hackernews.stories'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { list: string; limit: number }
  ids: number[]
  stories: Array<{ id?: number }>
  storage?: { mode: string; persisted?: boolean }
}

type HackerNewsItemLiveResult = {
  kind: 'hackernews.item'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { id: number }
  item: { id: number }
  storage?: { mode: string; persisted?: boolean }
}

type HackerNewsThreadLiveResult = {
  kind: 'hackernews.thread'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { id: number }
  root: { id: number }
  items: Array<{ id: number }>
  visibleItems: Array<{ id: number }>
  scroll: { atTop: boolean; pageSize: number }
  storage?: { mode: string; persisted?: boolean }
}
