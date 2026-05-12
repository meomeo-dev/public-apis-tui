import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listNewsDataLatest } from '../src/application/usecases/newsData.js'
import {
  NEWSDATA_DEFAULT_SIZE,
  NewsDataClient,
  normalizeNewsDataLatestInput,
} from '../src/infrastructure/openApis/newsDataClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'

test('NewsData.io client sends api key and latest filters', async () => {
  let requestedUrl: string | undefined
  const client = new NewsDataClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  const result = await client.latest({
    query: 'public api',
    searchIn: 'title',
    language: 'en',
    country: 'us,gb',
    category: 'business,technology',
    domain: 'bbc',
    sort: 'relevancy',
    dedupe: true,
    size: 5,
    page: 'next-token',
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/api/1/latest')
  assert.equal(url.searchParams.get('apikey'), 'test-key')
  assert.equal(url.searchParams.get('qInTitle'), 'public api')
  assert.equal(url.searchParams.get('q'), null)
  assert.equal(url.searchParams.get('language'), 'en')
  assert.equal(url.searchParams.get('country'), 'us,gb')
  assert.equal(url.searchParams.get('category'), 'business,technology')
  assert.equal(url.searchParams.get('domain'), 'bbc')
  assert.equal(url.searchParams.get('sort'), 'relevancy')
  assert.equal(url.searchParams.get('removeduplicate'), '1')
  assert.equal(url.searchParams.get('size'), '5')
  assert.equal(url.searchParams.get('page'), 'next-token')
  assert.equal(result.results[0]?.title, 'NewsData headline')
})

test('NewsData.io usecase projects keyed metadata and reads local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({ providerId: 'newsdata', secrets: { NEWSDATAIO_API_KEY: 'config-key' } })
    const previousFetch = globalThis.fetch
    const previousEnv = process.env.NEWSDATAIO_API_KEY
    let requestedUrl: string | undefined
    delete process.env.NEWSDATAIO_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    }) as typeof fetch
    try {
      const latest = await listNewsDataLatest({ language: 'EN', size: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('apikey'), 'config-key')
      assert.equal(latest.kind, 'newsdata.latest')
      assert.equal(latest.api.provider, 'newsdata')
      assert.equal(latest.api.usesBrowserClickstream, false)
      assert.match(latest.api.authentication, /NEWSDATAIO_API_KEY/)
      assert.equal(latest.query.language, 'en')
      assert.equal(latest.query.size, 1)
      assert.equal(latest.pagination.maxFreeSize, NEWSDATA_DEFAULT_SIZE)
      assert.equal(latest.articles[0]?.source.name, 'Example News')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.NEWSDATAIO_API_KEY
      } else {
        process.env.NEWSDATAIO_API_KEY = previousEnv
      }
    }
  })
})

test('NewsData.io normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeNewsDataLatestInput({ apiKey: 'secret-key', query: 'API', searchIn: 'meta', language: 'EN', country: 'US', size: 1 }),
    { query: 'API', searchIn: 'meta', language: 'en', country: 'us', size: 1 },
  )
})

function createEnvelopeFixture() {
  return {
    status: 'success',
    totalResults: 1,
    nextPage: 'next-token',
    results: [{
      article_id: 'article-1',
      title: 'NewsData headline',
      link: 'https://example.com/newsdata',
      description: 'A short article description.',
      content: null,
      keywords: ['api'],
      creator: ['Reporter'],
      language: 'en',
      country: ['us'],
      category: ['technology'],
      datatype: 'news',
      pubDate: '2026-05-04T08:00:00Z',
      pubDateTZ: 'UTC',
      fetched_at: '2026-05-04T08:01:00Z',
      image_url: null,
      video_url: null,
      duplicate: false,
      sentiment: 'neutral',
      source_id: 'example',
      source_name: 'Example News',
      source_url: 'https://example.com',
      source_icon: 'https://example.com/icon.png',
      source_priority: 10,
    }],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-newsdata-'))
  const previous = process.env.PUBLIC_APIS_HOME_DIR
  process.env.PUBLIC_APIS_HOME_DIR = root
  try {
    await run()
  } finally {
    if (previous === undefined) {
      delete process.env.PUBLIC_APIS_HOME_DIR
    } else {
      process.env.PUBLIC_APIS_HOME_DIR = previous
    }
    rmSync(root, { recursive: true, force: true })
  }
}
