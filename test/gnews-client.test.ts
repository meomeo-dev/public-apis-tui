import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listGNewsHeadlines, searchGNews } from '../src/application/usecases/gnews.js'
import { GNEWS_DEFAULT_MAX, GNewsClient, normalizeGNewsSearchInput } from '../src/infrastructure/openApis/gnewsClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('GNews client sends apikey and curated search filters', async () => {
  let requestedUrl: string | undefined
  const client = new GNewsClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse({ totalArticles: 1, articles: [createArticleFixture()], information: 'fixture info' })
    },
  })

  const result = await client.search({
    query: 'public api',
    language: 'en',
    country: 'us',
    max: 5,
    page: 2,
    searchIn: 'title,description',
    nullable: 'image',
    from: '2026-05-01T00:00:00Z',
    to: '2026-05-04T00:00:00Z',
    sortBy: 'relevance',
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(`${url.origin}${url.pathname}`, 'https://gnews.io/api/v4/search')
  assert.equal(url.searchParams.get('apikey'), 'test-key')
  assert.equal(url.searchParams.get('q'), 'public api')
  assert.equal(url.searchParams.get('lang'), 'en')
  assert.equal(url.searchParams.get('country'), 'us')
  assert.equal(url.searchParams.get('max'), '5')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('in'), 'title,description')
  assert.equal(url.searchParams.get('nullable'), 'image')
  assert.equal(url.searchParams.get('sortby'), 'relevance')
  assert.equal(result.articles[0]?.title, 'GNews headline')
})

test('GNews client sends top-headlines filters', async () => {
  let requestedUrl: string | undefined
  const client = new GNewsClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse({ totalArticles: 1, articles: [createArticleFixture()] })
    },
  })

  await client.topHeadlines({ category: 'technology', query: 'ai', language: 'en', country: 'us', max: 1, page: 1 })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(`${url.origin}${url.pathname}`, 'https://gnews.io/api/v4/top-headlines')
  assert.equal(url.searchParams.get('apikey'), 'test-key')
  assert.equal(url.searchParams.get('category'), 'technology')
  assert.equal(url.searchParams.get('q'), 'ai')
  assert.equal(url.searchParams.get('max'), '1')
})

test('GNews client redacts api key from provider failures', async () => {
  const client = new GNewsClient({
    apiKey: 'bad-key',
    fetchImpl: async () => jsonResponse({ errors: ['You did not provide an API key.'], apikey: 'bad-key' }, 401),
  })

  await assert.rejects(
    () => client.search({ query: 'test', max: 1, page: 1 }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeFailure)
      assert.equal(error.code, 'OPEN_API_FAILED')
      assert.match(String(error.details.endpoint), /apikey=<redacted>/)
      assert.equal((error.details.response as { apikey?: string }).apikey, '<redacted>')
      assert.doesNotMatch(JSON.stringify(error.details), /bad-key/)
      return true
    },
  )
})

test('GNews usecases project keyed metadata and default to documented max', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return jsonResponse({ totalArticles: 1, articles: [createArticleFixture()] })
  }) as typeof fetch

  try {
    const search = await searchGNews({ apiKey: 'test-key', query: 'public api' })
    assert.ok(requestedUrl)
    assert.equal(new URL(requestedUrl).searchParams.get('max'), String(GNEWS_DEFAULT_MAX))
    assert.equal(search.kind, 'gnews.search')
    assert.equal(search.api.provider, 'gnews')
    assert.match(search.api.authentication, /GNEWS_API_KEY/)
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.query.max, GNEWS_DEFAULT_MAX)
    const headlines = await listGNewsHeadlines({ apiKey: 'test-key', max: 1, category: 'technology' })
    assert.equal(headlines.kind, 'gnews.headlines')
    assert.equal(headlines.query.category, 'technology')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('GNews usecase can read api key from local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({
      providerId: 'gnews',
      secrets: { GNEWS_API_KEY: 'config-key' },
    })

    const previousFetch = globalThis.fetch
    const previousEnv = process.env.GNEWS_API_KEY
    let requestedUrl: string | undefined
    delete process.env.GNEWS_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse({ totalArticles: 0, articles: [] })
    }) as typeof fetch

    try {
      await searchGNews({ max: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('apikey'), 'config-key')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.GNEWS_API_KEY
      } else {
        process.env.GNEWS_API_KEY = previousEnv
      }
    }
  })
})

test('GNews normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeGNewsSearchInput({ apiKey: 'secret-key', query: 'API', language: 'EN', country: 'US', max: 1, page: 2 }),
    { query: 'API', language: 'en', country: 'us', max: 1, page: 2 },
  )
})

function createArticleFixture() {
  return {
    id: 'article-1',
    title: 'GNews headline',
    description: 'A short article description.',
    content: 'A short content preview.',
    url: 'https://example.com/news/gnews',
    image: 'https://example.com/image.jpg',
    publishedAt: '2026-05-04T08:00:00Z',
    lang: 'en',
    source: { id: 'example', name: 'Example News', url: 'https://example.com', country: 'us' },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-gnews-config-'))
  const previousHome = process.env.PUBLIC_APIS_HOME_DIR
  try {
    process.env.PUBLIC_APIS_HOME_DIR = root
    await run()
  } finally {
    if (previousHome === undefined) {
      delete process.env.PUBLIC_APIS_HOME_DIR
    } else {
      process.env.PUBLIC_APIS_HOME_DIR = previousHome
    }
    rmSync(root, { recursive: true, force: true })
  }
}
