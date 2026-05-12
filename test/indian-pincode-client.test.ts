import assert from 'node:assert/strict'
import test from 'node:test'
import { searchIndianPincode } from '../src/application/usecases/indianPincode.js'
import { IndianPincodeClient, normalizeIndianPincodeSearchInput } from '../src/infrastructure/openApis/indianPincodeClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Indian Pincode client searches public JSON endpoint', async () => {
  const client = new IndianPincodeClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.origin, 'https://indianpincode.com')
      assert.equal(url.pathname, '/api/search')
      assert.equal(url.searchParams.get('q'), 'mumbai')
      return jsonResponse(createSearchFixture())
    }) as typeof fetch,
  })

  const response = await client.search({ query: 'mumbai', limit: 10, type: 'all' })
  assert.equal(response.upstreamCount, 3)
  assert.equal(response.results[0]?.type, 'district')
  assert.equal(response.results[2]?.type, 'pincode')
})

test('Indian Pincode usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createSearchFixture())) as typeof fetch

  try {
    const result = await searchIndianPincode({ query: 'mumbai', limit: 10, type: 'pincode' })
    assert.equal(result.kind, 'indianpincode.search')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.match(result.api.detailPolicy, /not scraped/)
    assert.equal(result.pagination.upstreamCount, 3)
    assert.equal(result.results.length, 1)
    assert.equal(result.results[0]?.type, 'pincode')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Indian Pincode normalizer enforces observed search bounds', () => {
  assert.deepEqual(normalizeIndianPincodeSearchInput({}), { query: 'mumbai', limit: 10, type: 'all' })
  assert.deepEqual(normalizeIndianPincodeSearchInput({ query: ' 110001 ', limit: 1, type: 'pincode' }), { query: '110001', limit: 1, type: 'pincode' })
  assert.throws(() => normalizeIndianPincodeSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeIndianPincodeSearchInput({ limit: 11 }), RuntimeFailure)
  assert.throws(() => normalizeIndianPincodeSearchInput({ type: 'office' as never }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createSearchFixture(): Record<string, unknown> {
  return {
    results: [
      {
        type: 'district',
        districtName: 'Mumbai',
        districtSlug: 'mumbai',
        stateName: 'Maharashtra',
        stateSlug: 'maharashtra',
        pincodesCount: 111,
      },
      {
        type: 'district',
        districtName: 'Mumbai Suburban',
        districtSlug: 'mumbai-suburban',
        stateName: 'Maharashtra',
        stateSlug: 'maharashtra',
        pincodesCount: 118,
      },
      {
        type: 'pincode',
        code: '400001',
        postOfficeName: 'Mumbai GPO',
        districtName: 'Mumbai',
        districtSlug: 'mumbai',
        stateName: 'Maharashtra',
        stateSlug: 'maharashtra',
        area: '',
        officeType: 'HO',
      },
    ],
  }
}
