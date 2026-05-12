import assert from 'node:assert/strict'
import test from 'node:test'
import { getMfApiLatest, searchMfApiSchemes } from '../src/application/usecases/mfApi.js'
import { MfApiClient, normalizeMfApiLatestInput, normalizeMfApiSearchInput } from '../src/infrastructure/openApis/mfApiClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('MFapi client reads scheme search and latest NAV JSON', async () => {
  const client = new MfApiClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/mf/search') {
        assert.equal(url.searchParams.get('q'), 'SBI')
        return jsonResponse(createSearchFixture())
      }
      assert.equal(url.pathname, '/mf/125497/latest')
      return jsonResponse(createLatestFixture())
    }) as typeof fetch,
  })

  const schemes = await client.searchSchemes({ query: 'SBI', limit: 2 })
  assert.equal(schemes.length, 2)
  assert.equal(schemes[0]?.schemeCode, 125497)

  const latest = await client.getLatest({ schemeCode: 125497 })
  assert.equal(latest.meta.schemeName, 'SBI Small Cap Fund - Direct Plan - Growth')
  assert.equal(latest.data[0]?.nav, 193.4131)
})

test('MFapi usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/mf/search' ? createSearchFixture() : createLatestFixture())
  }) as typeof fetch

  try {
    const search = await searchMfApiSchemes({ query: 'SBI', limit: 2 })
    assert.equal(search.kind, 'mfapi.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 100)
    assert.equal(search.schemes[0]?.schemeName, 'SBI Small Cap Fund - Direct Plan - Growth')

    const latest = await getMfApiLatest({ schemeCode: 125497 })
    assert.equal(latest.kind, 'mfapi.latest')
    assert.equal(latest.api.authentication, 'none')
    assert.equal(latest.api.usesBrowserClickstream, false)
    assert.equal(latest.fund.fundHouse, 'SBI Mutual Fund')
    assert.equal(latest.nav?.nav, 193.4131)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('MFapi normalizers enforce bounds', () => {
  assert.deepEqual(normalizeMfApiSearchInput({}), { query: 'SBI Small Cap', limit: 100 })
  assert.deepEqual(normalizeMfApiSearchInput({ query: ' HDFC ', limit: 5 }), { query: 'HDFC', limit: 5 })
  assert.deepEqual(normalizeMfApiLatestInput({ schemeCode: '125497' }), { schemeCode: 125497 })
  assert.throws(() => normalizeMfApiSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeMfApiSearchInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeMfApiLatestInput({ schemeCode: 0 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createSearchFixture(): Array<Record<string, unknown>> {
  return [
    { schemeCode: 125497, schemeName: 'SBI Small Cap Fund - Direct Plan - Growth' },
    { schemeCode: 100122, schemeName: 'HDFC Balanced Fund - Growth Option' },
  ]
}

function createLatestFixture(): Record<string, unknown> {
  return {
    meta: {
      fund_house: 'SBI Mutual Fund',
      scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - Small Cap Fund',
      scheme_code: 125497,
      scheme_name: 'SBI Small Cap Fund - Direct Plan - Growth',
      isin_growth: 'INF200K01T51',
      isin_div_reinvestment: null,
    },
    data: [
      { date: '30-04-2026', nav: '193.41310' },
    ],
    status: 'SUCCESS',
  }
}
