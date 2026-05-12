import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listNewsApiEverything, listNewsApiHeadlines } from '../src/application/usecases/newsApi.js'
import { NEWSAPI_DEFAULT_PAGE_SIZE, NewsApiClient, normalizeNewsApiEverythingInput, normalizeNewsApiHeadlinesInput } from '../src/infrastructure/openApis/newsApiClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'

test('NewsAPI client sends api key and top-headlines filters', async () => {
  let requestedUrl: string | undefined
  const client = new NewsApiClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  const result = await client.topHeadlines({ country: 'us', category: 'technology', query: 'ai', pageSize: 5, page: 2 })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/v2/top-headlines')
  assert.equal(url.searchParams.get('apiKey'), 'test-key')
  assert.equal(url.searchParams.get('country'), 'us')
  assert.equal(url.searchParams.get('category'), 'technology')
  assert.equal(url.searchParams.get('q'), 'ai')
  assert.equal(url.searchParams.get('pageSize'), '5')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(result.articles[0]?.title, 'NewsAPI headline')
})

test('NewsAPI client sends everything filters', async () => {
  let requestedUrl: string | undefined
  const client = new NewsApiClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  await client.everything({
    query: 'public api',
    searchIn: 'title,description',
    sources: 'bbc-news',
    domains: 'example.com',
    excludeDomains: 'bad.example',
    from: '2026-05-01',
    to: '2026-05-04',
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: 1,
    page: 1,
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/v2/everything')
  assert.equal(url.searchParams.get('q'), 'public api')
  assert.equal(url.searchParams.get('searchIn'), 'title,description')
  assert.equal(url.searchParams.get('sources'), 'bbc-news')
  assert.equal(url.searchParams.get('domains'), 'example.com')
  assert.equal(url.searchParams.get('excludeDomains'), 'bad.example')
  assert.equal(url.searchParams.get('sortBy'), 'publishedAt')
})

test('NewsAPI usecases project keyed metadata and read local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({ providerId: 'newsapi', secrets: { NEWSAPI_API_KEY: 'config-key' } })
    const previousFetch = globalThis.fetch
    const previousEnv = process.env.NEWSAPI_API_KEY
    let requestedUrl: string | undefined
    delete process.env.NEWSAPI_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    }) as typeof fetch
    try {
      const headlines = await listNewsApiHeadlines({ country: 'us' })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('apiKey'), 'config-key')
      assert.equal(headlines.kind, 'newsapi.headlines')
      assert.equal(headlines.api.provider, 'newsapi')
      assert.equal(headlines.api.usesBrowserClickstream, false)
      assert.equal(headlines.query.pageSize, NEWSAPI_DEFAULT_PAGE_SIZE)
      const everything = await listNewsApiEverything({ query: 'public api', pageSize: 1 })
      assert.equal(everything.kind, 'newsapi.everything')
      assert.equal(everything.query.query, 'public api')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.NEWSAPI_API_KEY
      } else {
        process.env.NEWSAPI_API_KEY = previousEnv
      }
    }
  })
})

test('NewsAPI normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeNewsApiEverythingInput({ apiKey: 'secret-key', query: 'API', language: 'EN', pageSize: 1, page: 2 }),
    { query: 'API', language: 'en', pageSize: 1, page: 2 },
  )
})

test('NewsAPI headlines sources do not inherit default country', async () => {
  let requestedUrl: string | undefined
  const client = new NewsApiClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  const normalized = normalizeNewsApiHeadlinesInput({ sources: 'bbc-news', pageSize: 1, page: 1 })
  assert.deepEqual(normalized, { sources: 'bbc-news', pageSize: 1, page: 1 })

  await client.topHeadlines(normalized)

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.searchParams.get('sources'), 'bbc-news')
  assert.equal(url.searchParams.has('country'), false)
})

function createEnvelopeFixture() {
  return {
    status: 'ok',
    totalResults: 1,
    articles: [{
      source: { id: 'example', name: 'Example News' },
      author: 'Reporter',
      title: 'NewsAPI headline',
      description: 'A short article description.',
      url: 'https://example.com/newsapi',
      urlToImage: 'https://example.com/image.jpg',
      publishedAt: '2026-05-04T08:00:00Z',
      content: 'A short article preview.',
    }],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-newsapi-config-'))
  const previousHome = process.env.PUBLIC_APIS_HOME_DIR
  try {
    process.env.PUBLIC_APIS_HOME_DIR = root
    await run()
  } finally {
    if (previousHome === undefined) delete process.env.PUBLIC_APIS_HOME_DIR
    else process.env.PUBLIC_APIS_HOME_DIR = previousHome
    rmSync(root, { recursive: true, force: true })
  }
}
