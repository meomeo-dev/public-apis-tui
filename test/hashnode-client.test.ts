import assert from 'node:assert/strict'
import test from 'node:test'
import { listHashnodePosts } from '../src/application/usecases/hashnode.js'
import { HashnodeClient, normalizeHashnodePostsInput } from '../src/infrastructure/openApis/hashnodeClient.js'

test('Hashnode client posts GraphQL publication query without auth', async () => {
  let body = ''
  const client = new HashnodeClient({
    fetchImpl: async (_input, init) => {
      body = String(init?.body)
      return jsonResponse(createFixture())
    },
  })
  const result = await client.posts({ host: 'blog.developerdao.com', first: 1 })
  const parsed = JSON.parse(body) as { variables: Record<string, unknown> }
  assert.equal(parsed.variables.host, 'blog.developerdao.com')
  assert.equal(parsed.variables.first, 1)
  assert.equal(result.posts[0]?.title, 'Hashnode headline')
})

test('Hashnode usecase projects no-auth metadata', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createFixture())) as typeof fetch
  try {
    const result = await listHashnodePosts({ host: 'blog.developerdao.com', first: 1 })
    assert.equal(result.kind, 'hashnode.posts')
    assert.equal(result.api.authentication, 'none for public publication reads')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxFirst, 20)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Hashnode normalizer bounds first and cursor', () => {
  assert.deepEqual(normalizeHashnodePostsInput({ host: 'BLOG.DeveloperDAO.com', first: 1, after: 'cursor' }), { host: 'blog.developerdao.com', first: 1, after: 'cursor' })
  assert.deepEqual(normalizeHashnodePostsInput({ host: 'my-blog.hashnode.dev', first: 20 }), { host: 'my-blog.hashnode.dev', first: 20 })
  assert.throws(() => normalizeHashnodePostsInput({ host: '-bad.hashnode.dev' }), /--host/)
})

function createFixture() {
  return {
    data: {
      publication: {
        id: 'pub-1',
        title: 'Developer DAO',
        url: 'https://blog.developerdao.com',
        posts: {
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
          edges: [{ node: { id: 'post-1', title: 'Hashnode headline', brief: 'Short brief.', url: 'https://blog.developerdao.com/post', slug: 'post', publishedAt: '2026-05-04T08:00:00Z', readTimeInMinutes: 3, author: { name: 'Reporter', username: 'reporter' }, tags: [{ name: 'API', slug: 'api' }] } }],
        },
      },
    },
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
