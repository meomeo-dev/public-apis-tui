import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { searchTheNews } from '../src/application/usecases/theNews.js'
import { TheNewsClient, normalizeTheNewsAllInput } from '../src/infrastructure/openApis/theNewsClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'

test('TheNewsAPI client sends token and all-news filters', async () => {
  let requestedUrl: string | undefined
  const client = new TheNewsClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  const result = await client.all({
    search: 'public api',
    language: 'en',
    locale: 'us',
    categories: 'business,tech',
    domains: 'example.com',
    publishedAfter: '2026-05-01',
    sort: 'relevance_score',
    limit: 5,
    page: 2,
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/v1/news/all')
  assert.equal(url.searchParams.get('api_token'), 'test-key')
  assert.equal(url.searchParams.get('search'), 'public api')
  assert.equal(url.searchParams.get('language'), 'en')
  assert.equal(url.searchParams.get('locale'), 'us')
  assert.equal(url.searchParams.get('categories'), 'business,tech')
  assert.equal(url.searchParams.get('domains'), 'example.com')
  assert.equal(url.searchParams.get('published_after'), '2026-05-01')
  assert.equal(url.searchParams.get('sort'), 'relevance_score')
  assert.equal(url.searchParams.get('limit'), '5')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(result.data[0]?.title, 'TheNews headline')
})

test('TheNewsAPI usecase projects keyed metadata and reads local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({ providerId: 'thenews', secrets: { THENEWSAPI_API_KEY: 'config-key' } })
    const previousFetch = globalThis.fetch
    const previousEnv = process.env.THENEWSAPI_API_KEY
    let requestedUrl: string | undefined
    delete process.env.THENEWSAPI_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    }) as typeof fetch
    try {
      const result = await searchTheNews({ search: 'Public API', language: 'EN', limit: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('api_token'), 'config-key')
      assert.equal(result.kind, 'thenews.all')
      assert.equal(result.api.provider, 'thenews')
      assert.equal(result.api.usesBrowserClickstream, false)
      assert.match(result.api.authentication, /THENEWSAPI_API_KEY/)
      assert.equal(result.query.language, 'en')
      assert.equal(result.pagination.limit, 1)
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) delete process.env.THENEWSAPI_API_KEY
      else process.env.THENEWSAPI_API_KEY = previousEnv
    }
  })
})

test('TheNewsAPI normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeTheNewsAllInput({ apiKey: 'secret-key', search: 'API', language: 'EN', limit: 1 }),
    { search: 'API', language: 'en', limit: 1, page: 1 },
  )
})

function createEnvelopeFixture() {
  return {
    data: [{
      uuid: 'article-1',
      title: 'TheNews headline',
      description: 'A short article description.',
      keywords: 'api,news',
      snippet: 'A short snippet.',
      url: 'https://example.com/thenews',
      image_url: null,
      language: 'en',
      published_at: '2026-05-04T08:00:00Z',
      source: 'example.com',
      categories: ['business'],
      locale: 'us',
      relevance_score: 42.5,
    }],
    meta: { found: 1, returned: 1, limit: 1, page: 1 },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-thenews-'))
  const previous = process.env.PUBLIC_APIS_HOME_DIR
  process.env.PUBLIC_APIS_HOME_DIR = root
  try {
    await run()
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_APIS_HOME_DIR
    else process.env.PUBLIC_APIS_HOME_DIR = previous
    rmSync(root, { recursive: true, force: true })
  }
}
