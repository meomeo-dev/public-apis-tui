import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listNyTimesTopStories, searchNyTimes } from '../src/application/usecases/nytimes.js'
import { NyTimesClient, normalizeNyTimesSearchInput } from '../src/infrastructure/openApis/nytimesClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'

test('NYTimes client sends api key and article search filters', async () => {
  let requestedUrl: string | undefined
  const client = new NyTimesClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createSearchFixture())
    },
  })

  const result = await client.search({ query: 'public api', filterQuery: 'section_name:("Technology")', beginDate: '20260501', endDate: '20260504', sort: 'newest', page: 2 })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/svc/search/v2/articlesearch.json')
  assert.equal(url.searchParams.get('api-key'), 'test-key')
  assert.equal(url.searchParams.get('q'), 'public api')
  assert.equal(url.searchParams.get('fq'), 'section_name:("Technology")')
  assert.equal(url.searchParams.get('begin_date'), '20260501')
  assert.equal(url.searchParams.get('end_date'), '20260504')
  assert.equal(url.searchParams.get('sort'), 'newest')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(result.articles[0]?.title, 'NYTimes headline')
})

test('NYTimes client accepts empty article search docs as empty results', async () => {
  const client = new NyTimesClient({
    apiKey: 'test-key',
    fetchImpl: async () => jsonResponse({
      status: 'OK',
      response: {
        docs: null,
        metadata: { hits: 0, offset: 0 },
      },
    }),
  })

  const result = await client.search({ query: 'missing topic', page: 0 })

  assert.equal(result.hits, 0)
  assert.equal(result.offset, 0)
  assert.deepEqual(result.articles, [])
})

test('NYTimes client sends top-stories section and local limit', async () => {
  let requestedUrl: string | undefined
  const client = new NyTimesClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createTopStoriesFixture())
    },
  })

  const result = await client.topStories({ section: 'technology', limit: 1 })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/svc/topstories/v2/technology.json')
  assert.equal(url.searchParams.get('api-key'), 'test-key')
  assert.equal(result.articles.length, 1)
})

test('NYTimes usecases project keyed metadata and can read local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({ providerId: 'nytimes', secrets: { NYTIMES_API_KEY: 'config-key' } })
    const previousFetch = globalThis.fetch
    const previousEnv = process.env.NYTIMES_API_KEY
    let requestedUrl: string | undefined
    delete process.env.NYTIMES_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return String(input).includes('/topstories/')
        ? jsonResponse(createTopStoriesFixture())
        : jsonResponse(createSearchFixture())
    }) as typeof fetch
    try {
      const search = await searchNyTimes({ query: 'public api' })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('api-key'), 'config-key')
      assert.equal(search.kind, 'nytimes.search')
      assert.equal(search.api.provider, 'nytimes')
      assert.equal(search.api.usesBrowserClickstream, false)
      assert.equal(search.query.query, 'public api')
      const top = await listNyTimesTopStories({ section: 'technology', limit: 1 })
      assert.equal(top.kind, 'nytimes.topStories')
      assert.equal(top.query.section, 'technology')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.NYTIMES_API_KEY
      } else {
        process.env.NYTIMES_API_KEY = previousEnv
      }
    }
  })
})

test('NYTimes normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeNyTimesSearchInput({ apiKey: 'secret-key', query: 'API', page: 0 }),
    { query: 'API', page: 0 },
  )
})

function createSearchFixture() {
  return {
    status: 'OK',
    response: {
      metadata: { hits: 1, offset: 20 },
      docs: [{
        _id: 'nyt://article/1',
        headline: { main: 'NYTimes headline' },
        abstract: 'A short abstract.',
        web_url: 'https://www.nytimes.com/example',
        source: 'The New York Times',
        byline: { original: 'By Reporter' },
        section_name: 'Technology',
        subsection_name: 'Internet',
        pub_date: '2026-05-04T08:00:00Z',
        document_type: 'article',
      }],
    },
  }
}

function createTopStoriesFixture() {
  return {
    status: 'OK',
    section: 'technology',
    num_results: 2,
    results: [
      { uri: 'nyt://article/1', title: 'Top story', abstract: 'A top story.', url: 'https://www.nytimes.com/top', byline: 'By Reporter', section: 'technology', subsection: '', published_date: '2026-05-04T08:00:00Z', updated_date: '2026-05-04T09:00:00Z', item_type: 'Article' },
      { uri: 'nyt://article/2', title: 'Second story', abstract: 'Another top story.', url: 'https://www.nytimes.com/top2', byline: 'By Reporter', section: 'technology', subsection: '', published_date: '2026-05-04T08:00:00Z', updated_date: '2026-05-04T09:00:00Z', item_type: 'Article' },
    ],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-nytimes-config-'))
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
