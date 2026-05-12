import assert from 'node:assert/strict'
import test from 'node:test'
import { getOpenFoodFactsProduct, searchOpenFoodFactsProducts } from '../src/application/usecases/openFoodFacts.js'
import {
  normalizeOpenFoodFactsProductInput,
  normalizeOpenFoodFactsSearchInput,
  OpenFoodFactsClient,
  OPEN_FOOD_FACTS_USER_AGENT,
} from '../src/infrastructure/openApis/openFoodFactsClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Food Facts client reads product and search with User-Agent', async () => {
  const client = new OpenFoodFactsClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal((init?.headers as Record<string, string>)['user-agent'], OPEN_FOOD_FACTS_USER_AGENT)
      if (url.pathname.includes('/product/')) {
        assert.equal(url.searchParams.has('fields'), true)
        return jsonResponse(createProductEnvelope())
      }
      assert.equal(url.pathname, '/cgi/search.pl')
      assert.equal(url.searchParams.get('json'), '1')
      assert.equal(url.searchParams.get('search_terms'), 'nutella')
      assert.equal(url.searchParams.get('page_size'), '2')
      assert.equal(url.searchParams.get('page'), '1')
      return jsonResponse(createSearchEnvelope())
    }) as typeof fetch,
  })

  const product = await client.getProduct({ barcode: '737628064502' })
  assert.equal(product.product?.name, 'Thai peanut noodle kit')

  const search = await client.searchProducts({ query: 'nutella', pageSize: 2, page: 1 })
  assert.equal(search.products[0]?.brands, 'Ferrero')
  assert.equal(search.pageSize, 2)
})

test('Open Food Facts usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.includes('/product/') ? createProductEnvelope() : createSearchEnvelope())
  }) as typeof fetch

  try {
    const product = await getOpenFoodFactsProduct({ barcode: '737628064502' })
    assert.equal(product.kind, 'openfoodfacts.product')
    assert.equal(product.api.authentication, 'none')
    assert.equal(product.api.usesBrowserClickstream, false)
    assert.equal(product.found, true)
    assert.equal(product.product?.nutriscoreGrade, 'd')

    const search = await searchOpenFoodFactsProducts({ query: 'nutella', pageSize: 2 })
    assert.equal(search.kind, 'openfoodfacts.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxPageSize, 100)
    assert.equal(search.products[0]?.code, '3017620422003')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Food Facts normalizers enforce barcode and search bounds', () => {
  assert.deepEqual(normalizeOpenFoodFactsProductInput({}), { barcode: '737628064502' })
  assert.deepEqual(normalizeOpenFoodFactsSearchInput({}), { query: 'nutella', pageSize: 100, page: 1 })
  assert.deepEqual(normalizeOpenFoodFactsSearchInput({ query: ' milk ', pageSize: 2, page: 3, tagType: 'brands', tag: 'Ferrero' }), {
    query: 'milk',
    pageSize: 2,
    page: 3,
    tagType: 'brands',
    tag: 'Ferrero',
  })
  assert.throws(() => normalizeOpenFoodFactsProductInput({ barcode: 'abc' }), RuntimeFailure)
  assert.throws(() => normalizeOpenFoodFactsSearchInput({ pageSize: 101 }), RuntimeFailure)
  assert.throws(() => normalizeOpenFoodFactsSearchInput({ tagType: 'brands' }), RuntimeFailure)
  assert.throws(() => normalizeOpenFoodFactsSearchInput({ tagType: 'bad', tag: 'x' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createProductEnvelope(): Record<string, unknown> {
  return {
    code: '737628064502',
    status: 1,
    status_verbose: 'product found',
    product: createProductFixture('737628064502'),
  }
}

function createSearchEnvelope(): Record<string, unknown> {
  return {
    count: 1000,
    page: 1,
    page_count: 2,
    page_size: 2,
    products: [createProductFixture('3017620422003'), createProductFixture('8000500310427')],
  }
}

function createProductFixture(code: string): Record<string, unknown> {
  return {
    code,
    product_name: code === '737628064502' ? 'Thai peanut noodle kit' : 'Nutella',
    brands: code === '737628064502' ? 'Simply Asia' : 'Ferrero',
    quantity: '400 g',
    nutriscore_grade: 'd',
    nova_group: 4,
    categories_tags: ['en:spreads', 'en:sweet-spreads'],
    labels_tags: ['en:vegetarian'],
    ingredients_text: 'Sugar, palm oil, hazelnuts, cocoa.',
    nutriments: { energy_kcal_100g: 539 },
    url: `https://world.openfoodfacts.org/product/${code}`,
  }
}
