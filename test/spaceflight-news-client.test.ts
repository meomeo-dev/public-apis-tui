import assert from 'node:assert/strict'
import test from 'node:test'
import { listSpaceflightNewsArticles } from '../src/application/usecases/spaceflightNews.js'
import { SpaceflightNewsClient, normalizeSpaceflightNewsArticlesInput } from '../src/infrastructure/openApis/spaceflightNewsClient.js'

test('Spaceflight News client reads articles envelope', async () => {
  const client = new SpaceflightNewsClient({
    baseUrl: 'https://example.test/v4',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/v4/articles/')
      assert.equal(url.searchParams.get('limit'), '2')
      assert.equal(url.searchParams.get('offset'), '10')
      assert.equal(url.searchParams.get('ordering'), '-published_at')
      assert.equal(url.searchParams.get('search'), 'mars')
      assert.equal(url.searchParams.get('news_site'), 'ESA')
      return new Response(JSON.stringify(createSpaceflightNewsFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch,
  })

  const response = await client.listArticles({ limit: 2, offset: 10, ordering: '-published_at', search: 'mars', newsSite: 'ESA' })
  assert.equal(response.count, 33980)
  assert.equal(response.articles.length, 1)
  assert.equal(response.articles[0]?.title, 'Launch boosts European Earth monitoring and connectivity')
  assert.equal(response.articles[0]?.authors[0]?.name, 'ESA')
})

test('Spaceflight News usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify(createSpaceflightNewsFixture()), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch
  try {
    const result = await listSpaceflightNewsArticles({ limit: 2 })
    assert.equal(result.kind, 'spaceflightnews.articles')
    assert.equal(result.api.provider, 'spaceflightnews')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.limit, 2)
    assert.equal(result.pagination.maxLimit, 500)
    assert.equal(result.articles[0]?.newsSite, 'ESA')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Spaceflight News normalizer enforces bounds and curated ordering', () => {
  assert.deepEqual(normalizeSpaceflightNewsArticlesInput(), { limit: 500, offset: 0, ordering: '-published_at' })
  assert.deepEqual(normalizeSpaceflightNewsArticlesInput({ limit: 1, offset: 5, ordering: 'updated_at' }), { limit: 1, offset: 5, ordering: 'updated_at' })
  assert.throws(() => normalizeSpaceflightNewsArticlesInput({ limit: 501 }), /--limit must be an integer/)
  assert.throws(() => normalizeSpaceflightNewsArticlesInput({ ordering: 'title' }), /--ordering/)
})

function createSpaceflightNewsFixture(): Record<string, unknown> {
  return {
    count: 33980,
    next: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=2&offset=12',
    previous: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=2&offset=8',
    results: [
      {
        id: 37763,
        title: 'Launch boosts European Earth monitoring and connectivity',
        authors: [{ name: 'ESA', socials: null }],
        url: 'https://www.esa.int/Applications/Observing_the_Earth/Launch_boosts_European_Earth_monitoring_and_connectivity',
        image_url: 'https://www.esa.int/example.jpg',
        news_site: 'ESA',
        summary: 'Thirteen European satellites reached orbit.',
        published_at: '2026-05-04T08:01:00Z',
        updated_at: '2026-05-04T08:30:00Z',
        featured: false,
        launches: [{ id: 'launch-1', provider: 'Launch Library 2' }],
        events: [],
      },
    ],
  }
}
