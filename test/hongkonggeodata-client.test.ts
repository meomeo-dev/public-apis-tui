import assert from 'node:assert/strict'
import test from 'node:test'
import { searchHongKongGeoDataLocations } from '../src/application/usecases/hongKongGeoData.js'
import { HongKongGeoDataClient, normalizeHongKongGeoDataSearchInput } from '../src/infrastructure/openApis/hongKongGeoDataClient.js'

const fixture = [
  {
    nameEN: 'Hong Kong Cultural Centre',
    nameZH: '香港文化中心',
    addressEN: '10 Salisbury Road',
    addressZH: '梳士巴利道10號',
    districtEN: 'Yau Tsim Mong District',
    districtZH: '油尖旺區',
    x: 835599,
    y: 817190,
  },
  {
    nameEN: 'East Kowloon Cultural Centre',
    addressEN: '60 Ngau Tau Kok Road',
    districtEN: 'Kwun Tong District',
    x: '840181.0',
    y: '820583.0',
  },
]

test('Hong Kong GeoData client searches current map.gov.hk endpoint', async () => {
  const requests: string[] = []
  const client = new HongKongGeoDataClient({
    baseUrl: 'https://hkgeodata.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      return jsonResponse(fixture)
    }) as typeof fetch,
  })

  const result = await client.searchLocations({ query: 'cultural centre', limit: 1 })
  assert.deepEqual(requests, ['https://hkgeodata.test/gs/api/v1.0.0/locationSearch?q=cultural+centre'])
  assert.equal(result.totalReturned, 2)
  assert.equal(result.locations.length, 1)
  assert.equal(result.locations[0]?.nameEnglish, 'Hong Kong Cultural Centre')
  assert.equal(result.locations[0]?.x, 835599)
})

test('Hong Kong GeoData usecase projects no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await searchHongKongGeoDataLocations({ query: 'park', limit: 2 })
    assert.equal(result.kind, 'hongkonggeodata.locationSearch')
    assert.equal(result.api.providerId, 'hongkonggeodata')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.query, 'park')
    assert.equal(result.count, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Hong Kong GeoData normalizer validates query and limit', () => {
  assert.deepEqual(normalizeHongKongGeoDataSearchInput({}), { query: 'cultural centre', limit: 10 })
  assert.deepEqual(normalizeHongKongGeoDataSearchInput({ query: ' park ', limit: 1 }), { query: 'park', limit: 1 })
  assert.throws(() => normalizeHongKongGeoDataSearchInput({ query: '' }), /between 2 and 120/u)
  assert.throws(() => normalizeHongKongGeoDataSearchInput({ query: 'a'.repeat(121) }), /between 2 and 120/u)
  assert.throws(() => normalizeHongKongGeoDataSearchInput({ limit: 51 }), /between 1 and 50/u)
})

test('Hong Kong GeoData client rejects provider error JSON', async () => {
  const client = new HongKongGeoDataClient({
    fetchImpl: (async () => jsonResponse({ status: 500, error: 'Internal Server Error' }, 500)) as typeof fetch,
  })
  await assert.rejects(() => client.searchLocations({ query: 'park', limit: 10 }), /upstream HTTP 500 JSON/u)
})

test('Hong Kong GeoData client explains Cloudflare HTML challenges', async () => {
  const client = new HongKongGeoDataClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.searchLocations({ query: 'park', limit: 10 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
