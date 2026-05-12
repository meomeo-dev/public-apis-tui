import assert from 'node:assert/strict'
import test from 'node:test'
import { getJsonPlaceholderPost, listJsonPlaceholderPosts } from '../src/application/usecases/jsonPlaceholder.js'
import { JsonPlaceholderClient, normalizeJsonPlaceholderPostInput, normalizeJsonPlaceholderPostsInput } from '../src/infrastructure/openApis/jsonPlaceholderClient.js'

test('JSONPlaceholder client reads posts list and detail with rate metadata', async () => {
  const requests: string[] = []
  const client = new JsonPlaceholderClient({
    baseUrl: 'https://jsonplaceholder.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname === '/posts') {
        assert.equal(url.searchParams.get('_limit'), '2')
        assert.equal(url.searchParams.get('userId'), '1')
        return jsonResponse([createPost(1), createPost(2)], { 'x-total-count': '100', 'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '999' })
      }
      assert.equal(url.pathname, '/posts/1')
      return jsonResponse(createPost(1), { 'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '998' })
    }) as typeof fetch,
  })

  const posts = await client.listPosts({ limit: 2, userId: 1 })
  const post = await client.getPost({ id: 1 })

  assert.deepEqual(requests, ['https://jsonplaceholder.test/posts?_limit=2&userId=1', 'https://jsonplaceholder.test/posts/1'])
  assert.equal(posts.posts.length, 2)
  assert.equal(posts.rateLimit.totalCount, '100')
  assert.ok(post.post)
  assert.equal(post.post.title, 'Post 1')
})

test('JSONPlaceholder client treats an empty 404 post response as a missing post', async () => {
  const client = new JsonPlaceholderClient({
    baseUrl: 'https://jsonplaceholder.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/posts/999999')
      return jsonResponse({}, {}, 404)
    }) as typeof fetch,
  })

  const post = await client.getPost({ id: 999999 })

  assert.equal(post.post, undefined)
})

test('JSONPlaceholder usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname === '/posts'
      ? jsonResponse([createPost(1), createPost(2)], { 'x-total-count': '100' })
      : jsonResponse(createPost(1))
  }) as typeof fetch
  try {
    const posts = await listJsonPlaceholderPosts({ limit: 2 })
    assert.equal(posts.kind, 'jsonplaceholder.posts')
    assert.equal(posts.api.authentication, 'none')
    assert.equal(posts.api.usesBrowserClickstream, false)
    assert.equal(posts.pagination.total, '100')

    const post = await getJsonPlaceholderPost({ id: 1 })
    assert.equal(post.kind, 'jsonplaceholder.post')
    assert.equal(post.post.title, 'Post 1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('JSONPlaceholder usecase projects missing post as an empty result', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/posts/999999')
    return jsonResponse({}, {}, 404)
  }) as typeof fetch
  try {
    const post = await getJsonPlaceholderPost({ id: 999999 })
    assert.equal(post.kind, 'jsonplaceholder.post')
    assert.deepEqual(post.post, {})
    assert.equal(post.pagination.returned, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('JSONPlaceholder normalizers enforce documented posts bounds', () => {
  assert.deepEqual(normalizeJsonPlaceholderPostsInput({}), { limit: 100 })
  assert.deepEqual(normalizeJsonPlaceholderPostsInput({ limit: 1, userId: 2 }), { limit: 1, userId: 2 })
  assert.deepEqual(normalizeJsonPlaceholderPostInput({}), { id: 1 })
  assert.throws(() => normalizeJsonPlaceholderPostsInput({ limit: 101 }), /--limit/u)
  assert.throws(() => normalizeJsonPlaceholderPostsInput({ userId: 0 }), /--user-id/u)
  assert.throws(() => normalizeJsonPlaceholderPostInput({ id: 0 }), /--id/u)
})

function createPost(id: number): Record<string, unknown> {
  return {
    userId: 1,
    id,
    title: `Post ${id}`,
    body: `Body for post ${id}`,
  }
}

function jsonResponse(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
