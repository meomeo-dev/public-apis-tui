import assert from 'node:assert/strict'
import test from 'node:test'
import { getGeoJsCurrentIp, lookupGeoJs } from '../src/application/usecases/geoJs.js'
import { GeoJsClient, normalizeGeoJsLookupInput } from '../src/infrastructure/openApis/geoJsClient.js'

const geoFixture = {
  accuracy: 1000,
  area_code: '0',
  asn: 15169,
  continent_code: 'NA',
  country: 'United States',
  country_code: 'US',
  country_code3: 'USA',
  ip: '8.8.8.8',
  latitude: '37.751',
  longitude: '-97.822',
  organization: 'AS15169 Google LLC',
  organization_name: 'Google LLC',
  timezone: 'America/Chicago',
}

test('GeoJS client calls explicit lookup and current IP endpoints', async () => {
  const requests: string[] = []
  const client = new GeoJsClient({
    baseUrl: 'https://geojs.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname === '/v1/ip.json') return jsonResponse({ ip: '77.1.2.3' })
      return jsonResponse(geoFixture)
    }) as typeof fetch,
  })

  const lookup = await client.lookup({ ip: '8.8.8.8' })
  const currentIp = await client.currentIp()

  assert.equal(lookup.countryCode, 'US')
  assert.equal(lookup.latitude, 37.751)
  assert.equal(lookup.organizationName, 'Google LLC')
  assert.equal(currentIp.ip, '77.1.2.3')
  assert.deepEqual(requests, ['https://geojs.test/v1/ip/geo/8.8.8.8.json', 'https://geojs.test/v1/ip.json'])
})

test('GeoJS usecases expose privacy-safe metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/v1/ip.json') return jsonResponse({ ip: '77.1.2.3' })
    return jsonResponse(geoFixture)
  }) as typeof fetch
  try {
    const lookup = await lookupGeoJs({})
    assert.equal(lookup.kind, 'geojs.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.query.ip, '8.8.8.8')
    assert.equal(lookup.lookup.asn, 15169)

    const currentIp = await getGeoJsCurrentIp()
    assert.equal(currentIp.kind, 'geojs.currentIp')
    assert.equal(currentIp.privacy.classification, 'current-client-ip')
    assert.equal(currentIp.currentIp.ip, '77.1.2.3')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GeoJS normalizer validates IPv4 and IPv6 addresses', () => {
  assert.deepEqual(normalizeGeoJsLookupInput({}), { ip: '8.8.8.8' })
  assert.deepEqual(normalizeGeoJsLookupInput({ ip: ' 2001:4860:4860::8888 ' }), { ip: '2001:4860:4860::8888' })
  assert.throws(() => normalizeGeoJsLookupInput({ ip: 'not-an-ip' }), /IPv4 or IPv6/u)
})

test('GeoJS client rejects non-JSON provider errors', async () => {
  const client = new GeoJsClient({ fetchImpl: (async () => new Response('<html>not found</html>', { status: 404, headers: { 'content-type': 'text/html' } })) as typeof fetch })
  await assert.rejects(() => client.lookup({ ip: '8.8.8.8' }), /non-JSON/u)
})

test('GeoJS client explains Cloudflare HTML challenges', async () => {
  const client = new GeoJsClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.lookup({ ip: '8.8.8.8' }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
