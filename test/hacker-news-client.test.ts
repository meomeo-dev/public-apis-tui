import assert from 'node:assert/strict'
import test from 'node:test'
import { getHackerNewsItem, getHackerNewsStories, getHackerNewsThread } from '../src/application/usecases/hackerNews.js'
import { HackerNewsClient, normalizeHackerNewsItemInput, normalizeHackerNewsStoriesInput, normalizeHackerNewsThreadInput } from '../src/infrastructure/openApis/hackerNewsClient.js'

test('Hacker News client reads story ids and item details', async () => {
  const requests: string[] = []
  const client = new HackerNewsClient({
    baseUrl: 'https://hn.test/v0',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname.endsWith('/topstories.json')) {
        return jsonResponse([1001, 1002])
      }
      return jsonResponse(createItem(Number(url.pathname.match(/item\/(\d+)\.json/u)?.[1] ?? 1001)))
    }) as typeof fetch,
  })

  const ids = await client.getStoryIds('top')
  const item = await client.getItem(ids[0] ?? 1001)

  assert.deepEqual(requests, ['https://hn.test/v0/topstories.json', 'https://hn.test/v0/item/1001.json'])
  assert.deepEqual(ids, [1001, 1002])
  assert.equal(item.title, 'Example story 1001')
})

test('Hacker News usecases project TUI-ready JSON and bounded fan-out', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/beststories.json')) {
      return jsonResponse([1001, 1002, 1003])
    }
    if (url.pathname.endsWith('/item/1003.json')) {
      return jsonResponse(null)
    }
    return jsonResponse(createItem(Number(url.pathname.match(/item\/(\d+)\.json/u)?.[1] ?? 1001)))
  }) as typeof fetch
  try {
    const stories = await getHackerNewsStories({ list: 'best', limit: 2 })
    assert.equal(stories.kind, 'hackernews.stories')
    assert.equal(stories.api.authentication, 'none')
    assert.equal(stories.api.usesBrowserClickstream, false)
    assert.equal(stories.stories.length, 2)
    assert.equal(stories.pagination.upstreamTotal, 3)

    const item = await getHackerNewsItem({ id: 1002 })
    assert.equal(item.kind, 'hackernews.item')
    assert.equal(item.item.title, 'Example story 1002')

    const missingItem = await getHackerNewsItem({ id: 1003 })
    assert.equal(missingItem.kind, 'hackernews.item')
    assert.equal(missingItem.pagination.returned, 0)
    assert.deepEqual(missingItem.item, {})
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Hacker News thread fetches full tree and computes scroll windows', async () => {
  const originalFetch = globalThis.fetch
  const fixtures = new Map<number, Record<string, unknown>>([
    [1001, { id: 1001, type: 'story', by: 'pg', time: 1, title: 'Example story 1001', score: 57, descendants: 3, kids: [2001, 2002] }],
    [2001, { id: 2001, type: 'comment', by: 'alice', time: 2, parent: 1001, text: 'first<p>reply', kids: [3001] }],
    [3001, { id: 3001, type: 'comment', by: 'carol', time: 3, parent: 2001, text: 'nested &amp; complete' }],
    [2002, { id: 2002, type: 'comment', by: 'bob', time: 4, parent: 1001, text: 'second reply' }],
  ])
  globalThis.fetch = (async input => {
    const id = Number(new URL(String(input)).pathname.match(/item\/(\d+)\.json/u)?.[1] ?? 1001)
    return jsonResponse(fixtures.get(id) ?? null)
  }) as typeof fetch
  try {
    const firstPage = await getHackerNewsThread({ id: 1001, pageSize: 2 })
    assert.equal(firstPage.kind, 'hackernews.thread')
    assert.equal(firstPage.api.authentication, 'none')
    assert.equal(firstPage.api.usesBrowserClickstream, false)
    assert.deepEqual(firstPage.items.map(item => item.id), [1001, 2001, 3001, 2002])
    assert.deepEqual(firstPage.items.map(item => item.depth), [0, 1, 2, 1])
    assert.deepEqual(firstPage.visibleItems.map(item => item.id), [1001, 2001])
    assert.equal(firstPage.scroll.nextCursor, 2)
    assert.equal(firstPage.scroll.atTop, true)
    assert.equal(firstPage.scroll.atBottom, false)

    const downAtBottom = await getHackerNewsThread({ id: 1001, cursor: 3, pageSize: 2, direction: 'down' })
    assert.deepEqual(downAtBottom.visibleItems.map(item => item.id), [2002])
    assert.equal(downAtBottom.scroll.atBottom, true)
    assert.equal(downAtBottom.scroll.notice, 'Already at the bottom of this Hacker News thread.')

    const upPage = await getHackerNewsThread({ id: 1001, cursor: 3, pageSize: 2, direction: 'up' })
    assert.deepEqual(upPage.visibleItems.map(item => item.id), [2001, 3001])
    assert.equal(upPage.scroll.previousCursor, 1)
    assert.equal(upPage.scroll.nextCursor, 3)

    const missingThread = await getHackerNewsThread({ id: 9999, pageSize: 2 })
    assert.equal(missingThread.kind, 'hackernews.thread')
    assert.equal(missingThread.root.id, 9999)
    assert.equal(missingThread.scroll.total, 0)
    assert.deepEqual(missingThread.visibleItems, [])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Hacker News normalizers enforce curated list and fan-out limits', () => {
  assert.deepEqual(normalizeHackerNewsStoriesInput({}), { list: 'top', limit: 10 })
  assert.deepEqual(normalizeHackerNewsStoriesInput({ list: 'SHOW', limit: 1 }), { list: 'show', limit: 1 })
  assert.deepEqual(normalizeHackerNewsItemInput({}), { id: 8863 })
  assert.deepEqual(normalizeHackerNewsThreadInput({}), { id: 8863, cursor: 0, pageSize: 25, direction: 'down' })
  assert.throws(() => normalizeHackerNewsStoriesInput({ list: 'front' }), /--list/u)
  assert.throws(() => normalizeHackerNewsStoriesInput({ limit: 31 }), /--limit/u)
  assert.throws(() => normalizeHackerNewsItemInput({ id: 0 }), /--id/u)
  assert.throws(() => normalizeHackerNewsThreadInput({ cursor: -1 }), /--cursor/u)
  assert.throws(() => normalizeHackerNewsThreadInput({ pageSize: 101 }), /--page-size/u)
  assert.throws(() => normalizeHackerNewsThreadInput({ direction: 'sideways' }), /--direction/u)
})

function createItem(id: number): Record<string, unknown> {
  return {
    id,
    type: 'story',
    by: 'pg',
    time: 1175714200,
    title: `Example story ${id}`,
    url: `https://example.com/${id}`,
    score: 57,
    descendants: 15,
    kids: [2001, 2002],
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
