import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { searchGuardianContent } from '../src/application/usecases/guardian.js'
import { GUARDIAN_DEFAULT_PAGE_SIZE, GuardianClient, normalizeGuardianSearchInput } from '../src/infrastructure/openApis/guardianClient.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'

test('Guardian client sends api key and content search filters', async () => {
  let requestedUrl: string | undefined
  const client = new GuardianClient({
    apiKey: 'test-key',
    fetchImpl: async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    },
  })

  const result = await client.search({
    query: 'public api',
    section: 'technology',
    tag: 'technology/apple',
    fromDate: '2026-05-01',
    toDate: '2026-05-04',
    orderBy: 'relevance',
    pageSize: 5,
    page: 2,
    showFields: 'headline,trailText,thumbnail,shortUrl,byline',
  })

  assert.ok(requestedUrl)
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/search')
  assert.equal(url.searchParams.get('api-key'), 'test-key')
  assert.equal(url.searchParams.get('format'), 'json')
  assert.equal(url.searchParams.get('q'), 'public api')
  assert.equal(url.searchParams.get('section'), 'technology')
  assert.equal(url.searchParams.get('tag'), 'technology/apple')
  assert.equal(url.searchParams.get('from-date'), '2026-05-01')
  assert.equal(url.searchParams.get('to-date'), '2026-05-04')
  assert.equal(url.searchParams.get('order-by'), 'relevance')
  assert.equal(url.searchParams.get('page-size'), '5')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(result.results[0]?.title, 'Guardian headline')
})

test('Guardian usecase projects keyed metadata and reads local provider config', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({ providerId: 'guardian', secrets: { GUARDIAN_API_KEY: 'config-key' } })
    const previousFetch = globalThis.fetch
    const previousEnv = process.env.GUARDIAN_API_KEY
    let requestedUrl: string | undefined
    delete process.env.GUARDIAN_API_KEY
    globalThis.fetch = (async input => {
      requestedUrl = String(input)
      return jsonResponse(createEnvelopeFixture())
    }) as typeof fetch
    try {
      const result = await searchGuardianContent({ query: 'Public API', pageSize: 1 })
      assert.ok(requestedUrl)
      assert.equal(new URL(requestedUrl).searchParams.get('api-key'), 'config-key')
      assert.equal(result.kind, 'guardian.search')
      assert.equal(result.api.provider, 'guardian')
      assert.equal(result.api.usesBrowserClickstream, false)
      assert.match(result.api.authentication, /GUARDIAN_API_KEY/)
      assert.equal(result.query.query, 'Public API')
      assert.equal(result.pagination.maxPageSize, GUARDIAN_DEFAULT_PAGE_SIZE)
      assert.equal(result.articles[0]?.fields.byline, 'Reporter')
    } finally {
      globalThis.fetch = previousFetch
      if (previousEnv === undefined) {
        delete process.env.GUARDIAN_API_KEY
      } else {
        process.env.GUARDIAN_API_KEY = previousEnv
      }
    }
  })
})

test('Guardian normalization excludes secrets from cache key params', () => {
  assert.deepEqual(
    normalizeGuardianSearchInput({ apiKey: 'secret-key', query: 'API', section: 'Technology', pageSize: 1, page: 2 }),
    { query: 'API', section: 'technology', pageSize: 1, page: 2, showFields: 'headline,trailText,thumbnail,shortUrl,byline' },
  )
})

function createEnvelopeFixture() {
  return {
    response: {
      status: 'ok',
      userTier: 'developer',
      total: 1,
      startIndex: 1,
      pageSize: 1,
      currentPage: 1,
      pages: 1,
      orderBy: 'relevance',
      results: [{
        id: 'technology/2026/may/04/example',
        type: 'article',
        sectionId: 'technology',
        sectionName: 'Technology',
        webPublicationDate: '2026-05-04T08:00:00Z',
        webTitle: 'Guardian headline',
        webUrl: 'https://www.theguardian.com/technology/example',
        apiUrl: 'https://content.guardianapis.com/technology/example',
        pillarId: 'pillar/news',
        pillarName: 'News',
        isHosted: false,
        fields: { headline: 'Guardian headline', trailText: '<p>A short trail text.</p>', thumbnail: 'https://example.com/thumb.jpg', shortUrl: 'https://gu.com/p/example', byline: 'Reporter' },
      }],
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function withPublicApisHome(run: () => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-guardian-'))
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
