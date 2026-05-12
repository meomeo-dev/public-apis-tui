import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getOpenBreweryDbMeta,
  listOpenBreweryDbBreweries,
  searchOpenBreweryDbBreweries,
} from '../src/application/usecases/openBreweryDb.js'
import {
  normalizeOpenBreweryDbListInput,
  normalizeOpenBreweryDbMetaInput,
  normalizeOpenBreweryDbSearchInput,
  OpenBreweryDbClient,
} from '../src/infrastructure/openApis/openBreweryDbClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Brewery DB client reads list, search, and meta with rate metadata', async () => {
  const client = new OpenBreweryDbClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/breweries/meta')) {
        assert.equal(url.searchParams.get('by_city'), 'san_diego')
        return jsonResponse(createMetaFixture())
      }
      if (url.pathname.endsWith('/breweries/search')) {
        assert.equal(url.searchParams.get('query'), 'dogfish')
        assert.equal(url.searchParams.get('per_page'), '2')
        return jsonResponse([createBreweryFixture('search-1')])
      }
      assert.equal(url.searchParams.get('by_city'), 'san_diego')
      assert.equal(url.searchParams.get('per_page'), '2')
      assert.equal(url.searchParams.get('page'), '1')
      return jsonResponse([createBreweryFixture('list-1'), createBreweryFixture('list-2')])
    }) as typeof fetch,
  })

  const list = await client.listBreweries({ city: 'san_diego', perPage: 2, page: 1 })
  assert.equal(list.breweries[0]?.name, 'Example Brewery')
  assert.equal(list.rateLimit.limit, '120')

  const search = await client.searchBreweries({ query: 'dogfish', perPage: 2, page: 1 })
  assert.equal(search.breweries[0]?.id, 'search-1')

  const meta = await client.getMeta({ city: 'san_diego' })
  assert.equal(meta.meta.total, 91)
  assert.equal(meta.meta.byType.micro, 45)
})

test('Open Brewery DB usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/breweries/meta')) {
      return jsonResponse(createMetaFixture())
    }
    return jsonResponse([createBreweryFixture('brewery-1')])
  }) as typeof fetch

  try {
    const list = await listOpenBreweryDbBreweries({ city: 'san_diego', perPage: 1 })
    assert.equal(list.kind, 'openbrewerydb.breweries')
    assert.equal(list.api.authentication, 'none')
    assert.equal(list.api.usesBrowserClickstream, false)
    assert.equal(list.pagination.maxPerPage, 200)
    assert.equal(list.breweries[0]?.city, 'San Diego')

    const search = await searchOpenBreweryDbBreweries({ query: 'dogfish', perPage: 1 })
    assert.equal(search.kind, 'openbrewerydb.search')
    assert.equal(search.query.query, 'dogfish')
    assert.equal(search.breweries[0]?.websiteUrl, 'https://example.com')

    const meta = await getOpenBreweryDbMeta({ city: 'san_diego' })
    assert.equal(meta.kind, 'openbrewerydb.meta')
    assert.equal(meta.api.authentication, 'none')
    assert.equal(meta.api.usesBrowserClickstream, false)
    assert.equal(meta.meta.byState.California, 91)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Brewery DB normalizers enforce documented bounds', () => {
  assert.deepEqual(normalizeOpenBreweryDbListInput({}), { perPage: 200, page: 1 })
  assert.deepEqual(normalizeOpenBreweryDbSearchInput({}), { query: 'dogfish', perPage: 200, page: 1 })
  assert.deepEqual(normalizeOpenBreweryDbMetaInput({ city: ' san_diego ' }), { city: 'san_diego' })
  assert.throws(() => normalizeOpenBreweryDbListInput({ perPage: 201 }), RuntimeFailure)
  assert.throws(() => normalizeOpenBreweryDbListInput({ page: 0 }), RuntimeFailure)
  assert.throws(() => normalizeOpenBreweryDbSearchInput({ query: ' ' }), RuntimeFailure)
  assert.throws(() => normalizeOpenBreweryDbMetaInput({ city: ' ' }), /--city must not be empty/u)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '120', 'x-ratelimit-remaining': '119' },
  })
}

function createBreweryFixture(id: string): Record<string, unknown> {
  return {
    id,
    name: 'Example Brewery',
    brewery_type: 'micro',
    address_1: '1 Beer Way',
    address_2: null,
    address_3: null,
    city: 'San Diego',
    state_province: 'California',
    postal_code: '92101',
    country: 'United States',
    longitude: -117.1,
    latitude: 32.7,
    phone: '6195550100',
    website_url: 'https://example.com',
    state: 'California',
    street: '1 Beer Way',
  }
}

function createMetaFixture(): Record<string, unknown> {
  return {
    total: 91,
    by_state: { California: 91 },
    by_type: { micro: 45, brewpub: 23 },
    page: 1,
    per_page: 50,
  }
}
