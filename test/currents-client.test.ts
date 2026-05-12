import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { listCurrentsNews } from '../src/application/usecases/currentsNews.js'
import { CURRENTS_DEFAULT_PAGE_SIZE, CurrentsClient, normalizeCurrentsNewsInput } from '../src/infrastructure/openApis/currentsClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Currents client sends api key and curated latest-news filters', async () => {
  let requestedUrl: string | undefined
  const client = new CurrentsClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse({
        status: 'ok',
        news: [createArticleFixture()],
        page: 2,
      }, 200, {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '999',
        'x-ratelimit-burst-limit': '20',
        'x-ratelimit-burst-remaining': '19',
      })
    },
  })

  const result = await client.latestNews({
    language: 'en',
    country: 'us',
    category: 'technology',
    keywords: 'public api',
    pageSize: 5,
    page: 2,
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(`${url.origin}${url.pathname}`, 'https://api.currentsapi.services/v1/latest-news')
  assert.equal(url.searchParams.get('apiKey'), 'test-key')
  assert.equal(url.searchParams.get('language'), 'en')
  assert.equal(url.searchParams.get('country'), 'us')
  assert.equal(url.searchParams.get('category'), 'technology')
  assert.equal(url.searchParams.get('keywords'), 'public api')
  assert.equal(url.searchParams.get('page_size'), '5')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(result.page, 2)
  assert.equal(result.articles[0]?.title, 'Public API headline')
  assert.equal(result.rateLimit.remaining, '999')
})

test('Currents client redacts api key from provider failures', async () => {
  const client = new CurrentsClient({
    apiKey: 'bad-key',
    fetchImpl: async () => jsonResponse({ status: 'error', message: 'Invalid API key', apiKey: 'bad-key' }, 401),
  })

  await assert.rejects(
    () => client.latestNews({ language: 'en', pageSize: 1, page: 1 }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeFailure)
      assert.equal(error.code, 'OPEN_API_FAILED')
      assert.equal(error.details.endpoint, 'https://api.currentsapi.services/v1/latest-news?apiKey=<redacted>&language=en&page_size=1&page=1')
      assert.equal((error.details.response as { apiKey?: string }).apiKey, '<redacted>')
      assert.doesNotMatch(JSON.stringify(error.details), /bad-key/)
      return true
    },
  )
})

test('Currents news usecase projects keyed open API metadata and defaults to max page size', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return jsonResponse({
      status: 'ok',
      news: [createArticleFixture()],
      page: 1,
    })
  }) as typeof fetch

  try {
    const result = await listCurrentsNews({ apiKey: 'test-key', keywords: 'public api' })

    assert.ok(requestedUrl)
    assert.equal(new URL(requestedUrl).searchParams.get('page_size'), String(CURRENTS_DEFAULT_PAGE_SIZE))
    assert.equal(result.kind, 'currents.news')
    assert.equal(result.api.provider, 'currents')
    assert.match(result.api.authentication, /CURRENTS_API_KEY/)
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.keywords, 'public api')
    assert.equal(result.query.pageSize, CURRENTS_DEFAULT_PAGE_SIZE)
    assert.equal(result.articles[0]?.id, 'article-1')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Currents news usecase can read api key from local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({
      providerId: 'currents',
      secrets: { CURRENTS_API_KEY: 'config-key' },
    })

    const previousFetch = globalThis.fetch
    const previousEnv = process.env.CURRENTS_API_KEY
    let requestedUrl: string | undefined
    delete process.env.CURRENTS_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse({ status: 'ok', news: [], page: 1 })
    }) as typeof fetch

    try {
      await listCurrentsNews({ pageSize: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('apiKey'), 'config-key')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.CURRENTS_API_KEY
      } else {
        process.env.CURRENTS_API_KEY = previousEnv
      }
    }
  })
})

test('Currents normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeCurrentsNewsInput({ apiKey: 'secret-key', language: 'EN', country: 'US', pageSize: 1, page: 2 }),
    { language: 'en', country: 'us', pageSize: 1, page: 2 },
  )
})

function createArticleFixture() {
  return {
    id: 'article-1',
    title: 'Public API headline',
    description: 'A short article description.',
    url: 'https://example.com/news/public-api',
    author: 'Reporter',
    image: 'https://example.com/image.jpg',
    language: 'en',
    category: ['technology'],
    published: '2026-05-04T08:00:00+00:00',
  }
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-currents-config-'))
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
