import assert from 'node:assert/strict'
import test from 'node:test'
import { getSteemThread, listSteemDiscussions } from '../src/application/usecases/steem.js'
import { SteemClient } from '../src/infrastructure/openApis/steemClient.js'

test('Steem client posts documented condenser_api discussion request', async () => {
  const seen: { url?: string | undefined; method?: string | undefined; body?: string | undefined } = {}
  const client = new SteemClient({
    fetchImpl: (async (input, init) => {
      seen.url = String(input)
      seen.method = init?.method
      seen.body = String(init?.body)
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: [createDiscussionResponse()] })
    }) as typeof fetch,
  })

  const discussions = await client.listDiscussions({ sort: 'created', tag: 'steem', limit: 2, truncateBody: 120 })

  assert.equal(seen.url, 'https://api.steemit.com')
  assert.equal(seen.method, 'POST')
  assert.deepEqual(JSON.parse(seen.body ?? '{}'), {
    jsonrpc: '2.0',
    method: 'condenser_api.get_discussions_by_created',
    params: [{ tag: 'steem', limit: 2, truncate_body: 120 }],
    id: 1,
  })
  assert.equal(discussions[0]?.author, 'alice')
})

test('Steem client reads content and replies for thread traversal', async () => {
  const seenMethods: string[] = []
  const client = new SteemClient({
    fetchImpl: (async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string; params?: unknown[] }
      seenMethods.push(String(body.method))
      if (body.method === 'condenser_api.get_content') {
        return jsonResponse({ jsonrpc: '2.0', id: 1, result: createDiscussionResponse() })
      }
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: [{ ...createDiscussionResponse(), author: 'bob', permlink: 're-hello', title: '', url: '/dev/@alice/hello#@bob/re-hello' }] })
    }) as typeof fetch,
  })

  const content = await client.getContent('alice', 'hello')
  const replies = await client.getContentReplies('alice', 'hello')

  assert.deepEqual(seenMethods, ['condenser_api.get_content', 'condenser_api.get_content_replies'])
  assert.equal(content.title, 'Hello Steem')
  assert.equal(replies[0]?.author, 'bob')
})

test('Steem usecase projects discussions and no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ jsonrpc: '2.0', id: 1, result: [createDiscussionResponse()] })) as typeof fetch
  try {
    const result = await listSteemDiscussions({ sort: 'hot', tag: 'dev', limit: 1, truncateBody: 80 })

    assert.equal(result.kind, 'steem.discussions')
    assert.equal(result.api.provider, 'steem')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.documentedMaximumLimit, 100)
    assert.deepEqual(result.query, { sort: 'hot', tag: 'dev', limit: 1, truncateBody: 80 })
    assert.equal(result.discussions[0]?.url, 'https://steemit.com/dev/@alice/hello')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Steem usecase projects thread tree and scroll window', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string; params?: unknown[] }
    if (body.method === 'condenser_api.get_content') {
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: createDiscussionResponse() })
    }
    const author = Array.isArray(body.params) ? body.params[0] : undefined
    if (author === 'alice') {
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: [{ ...createDiscussionResponse(), author: 'bob', permlink: 're-hello', title: '', url: '/dev/@alice/hello#@bob/re-hello' }] })
    }
    return jsonResponse({ jsonrpc: '2.0', id: 1, result: [] })
  }) as typeof fetch
  try {
    const result = await getSteemThread({ author: 'alice', permlink: 'hello', pageSize: 1 })

    assert.equal(result.kind, 'steem.thread')
    assert.equal(result.api.provider, 'steem')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.author, 'alice')
    assert.equal(result.items.length, 2)
    assert.equal(result.visibleItems.length, 1)
    assert.equal(result.scroll.nextCursor, 1)
    assert.equal(result.items[1]?.depth, 1)
    assert.equal(result.items[1]?.author, 'bob')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Steem usecase validates curated inputs', async () => {
  await assert.rejects(() => listSteemDiscussions({ sort: 'votes' }), /trending, created, or hot/u)
  await assert.rejects(() => listSteemDiscussions({ tag: 'Bad Tag' }), /lowercase/u)
  await assert.rejects(() => listSteemDiscussions({ limit: 101 }), /1 to 100/u)
  await assert.rejects(() => listSteemDiscussions({ truncateBody: 501 }), /0 to 500/u)
  await assert.rejects(() => getSteemThread({ permlink: 'hello' }), /--author is required/u)
  await assert.rejects(() => getSteemThread({ author: 'alice' }), /--permlink is required/u)
  await assert.rejects(() => getSteemThread({ author: 'alice', permlink: 'hello', direction: 'sideways' }), /down or up/u)
})

test('Steem client surfaces JSON-RPC errors', async () => {
  const client = new SteemClient({
    fetchImpl: (async () => jsonResponse({ jsonrpc: '2.0', id: 1, error: { message: 'unknown method' } })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listDiscussions({ sort: 'trending', tag: 'steem', limit: 1, truncateBody: 100 }),
    /unknown method/u,
  )
})

function createDiscussionResponse(): Record<string, unknown> {
  return {
    post_id: 1,
    author: 'alice',
    permlink: 'hello',
    category: 'dev',
    title: 'Hello Steem',
    body: 'A short body preview.',
    created: '2026-05-03T01:02:03',
    children: 2,
    pending_payout_value: '0.123 SBD',
    body_length: 345,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
