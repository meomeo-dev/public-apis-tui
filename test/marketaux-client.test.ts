import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listMarketAuxNews } from '../src/application/usecases/marketaux.js'
import { MARKETAUX_DEFAULT_LIMIT, MarketAuxClient, normalizeMarketAuxNewsInput } from '../src/infrastructure/openApis/marketauxClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('MarketAux client sends api token and curated news filters', async () => {
  let requestedUrl: string | undefined
  const client = new MarketAuxClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  const result = await client.listNews({
    search: 'tesla',
    symbols: 'TSLA,MSFT',
    countries: 'us,ca',
    industries: 'Technology',
    language: 'en',
    sentimentMin: 0,
    sentimentMax: 1,
    publishedAfter: '2026-05-01',
    publishedBefore: '2026-05-04',
    limit: 5,
    page: 2,
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(`${url.origin}${url.pathname}`, 'https://api.marketaux.com/v1/news/all')
  assert.equal(url.searchParams.get('api_token'), 'test-key')
  assert.equal(url.searchParams.get('search'), 'tesla')
  assert.equal(url.searchParams.get('symbols'), 'TSLA,MSFT')
  assert.equal(url.searchParams.get('countries'), 'us,ca')
  assert.equal(url.searchParams.get('industries'), 'Technology')
  assert.equal(url.searchParams.get('language'), 'en')
  assert.equal(url.searchParams.get('sentiment_gte'), '0')
  assert.equal(url.searchParams.get('sentiment_lte'), '1')
  assert.equal(url.searchParams.get('limit'), '5')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(result.meta.limit, 5)
  assert.equal(result.articles[0]?.title, 'MarketAux headline')
})

test('MarketAux client redacts api token from provider failures', async () => {
  const client = new MarketAuxClient({
    apiKey: 'bad-key',
    fetchImpl: async () => jsonResponse({ error: { message: 'Invalid token' }, api_token: 'bad-key' }, 401),
  })

  await assert.rejects(
    () => client.listNews({ limit: 1, page: 1 }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeFailure)
      assert.equal(error.code, 'OPEN_API_FAILED')
      assert.match(String(error.details.endpoint), /api_token=<redacted>/)
      assert.equal((error.details.response as { api_token?: string }).api_token, '<redacted>')
      assert.doesNotMatch(JSON.stringify(error.details), /bad-key/)
      return true
    },
  )
})

test('MarketAux usecase projects keyed metadata and defaults to documented request cap', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return jsonResponse(createEnvelopeFixture({ limit: 3, returned: 1 }))
  }) as typeof fetch

  try {
    const result = await listMarketAuxNews({ apiKey: 'test-key', symbols: 'TSLA' })
    assert.ok(requestedUrl)
    assert.equal(new URL(requestedUrl).searchParams.get('limit'), String(MARKETAUX_DEFAULT_LIMIT))
    assert.equal(result.kind, 'marketaux.news')
    assert.equal(result.api.provider, 'marketaux')
    assert.match(result.api.authentication, /MARKETAUX_API_KEY/)
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.limit, MARKETAUX_DEFAULT_LIMIT)
    assert.equal(result.pagination.limit, 3)
    assert.equal(result.pagination.requestedLimit, MARKETAUX_DEFAULT_LIMIT)
    assert.equal(result.articles[0]?.entities[0]?.symbol, 'TSLA')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('MarketAux usecase can read api key from local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({
      providerId: 'marketaux',
      secrets: { MARKETAUX_API_KEY: 'config-key' },
    })

    const previousFetch = globalThis.fetch
    const previousEnv = process.env.MARKETAUX_API_KEY
    let requestedUrl: string | undefined
    delete process.env.MARKETAUX_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture({ found: 0, returned: 0, data: [] }))
    }) as typeof fetch

    try {
      await listMarketAuxNews({ limit: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('api_token'), 'config-key')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.MARKETAUX_API_KEY
      } else {
        process.env.MARKETAUX_API_KEY = previousEnv
      }
    }
  })
})

test('MarketAux normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeMarketAuxNewsInput({ apiKey: 'secret-key', symbols: 'TSLA', countries: 'US', limit: 1, page: 2 }),
    { symbols: 'TSLA', countries: 'us', limit: 1, page: 2 },
  )
})

function createEnvelopeFixture(options: { found?: number; returned?: number; limit?: number; page?: number; data?: unknown[] } = {}) {
  return {
    meta: {
      found: options.found ?? 1,
      returned: options.returned ?? 1,
      limit: options.limit ?? 5,
      page: options.page ?? 2,
    },
    data: options.data ?? [
      {
        uuid: 'article-1',
        title: 'MarketAux headline',
        description: 'A short article description.',
        snippet: 'A short article snippet.',
        url: 'https://example.com/news/marketaux',
        image_url: 'https://example.com/image.jpg',
        language: 'en',
        published_at: '2026-05-04T08:00:00Z',
        source: 'Example News',
        keywords: 'markets,tesla',
        relevance_score: 12.5,
        entities: [{ symbol: 'TSLA', name: 'Tesla Inc', exchange: 'NASDAQ', country: 'us', type: 'equity', industry: 'Automobiles', sentiment_score: 0.42 }],
        similar: [],
      },
    ],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-marketaux-config-'))
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
