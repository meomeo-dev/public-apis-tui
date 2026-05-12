import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupIpGeo } from '../src/application/usecases/ipGeo.js'
import { IpGeoClient, normalizeIpGeoLookupInput } from '../src/infrastructure/openApis/ipGeoClient.js'

const fixture = {
  status: 'success',
  continent: 'North America',
  country: 'United States',
  countryCode: 'US',
  regionName: 'Virginia',
  city: 'Ashburn',
  zip: '20149',
  lat: 39.03,
  lon: -77.5,
  timezone: 'America/New_York',
  currency: 'USD',
  isp: 'Google LLC',
  org: 'Google Public DNS',
  as: 'AS15169 Google LLC',
  reverse: 'dns.google',
  mobile: false,
  proxy: false,
  hosting: true,
  ip: '8.8.8.8',
  cached: true,
  cacheTimestamp: 1778195748,
}

test('IPGEO client fetches explicit HTTPS JSON lookup', async () => {
  const requests: string[] = []
  const client = new IpGeoClient('https://ipgeo.test', (async input => {
    const url = new URL(String(input))
    requests.push(url.href)
    return jsonResponse(fixture)
  }) as typeof fetch)
  const response = await client.lookup({ query: '8.8.8.8' })
  assert.deepEqual(requests, ['https://ipgeo.test/ipgeo/8.8.8.8'])
  assert.equal(response.lookup.countryCode, 'US')
  assert.equal(response.lookup.latitude, 39.03)
  assert.equal(response.lookup.longitude, -77.5)
  assert.equal(response.lookup.organization, 'Google Public DNS')
  assert.equal(response.lookup.hosting, true)
})

test('IPGEO usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await lookupIpGeo()
    assert.equal(result.kind, 'ipgeo.lookup')
    assert.equal(result.api.providerId, 'ipgeo')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.transport, 'HTTPS JSON REST')
    assert.equal(result.query.query, '8.8.8.8')
    assert.equal(result.lookup.reverse, 'dns.google')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('IPGEO normalizer validates IP addresses and domains', () => {
  assert.deepEqual(normalizeIpGeoLookupInput({}), { query: '8.8.8.8' })
  assert.deepEqual(normalizeIpGeoLookupInput({ query: ' Example.COM ' }), { query: 'example.com' })
  assert.deepEqual(normalizeIpGeoLookupInput({ query: '2001:4860:4860::8888' }), { query: '2001:4860:4860::8888' })
  assert.throws(() => normalizeIpGeoLookupInput({ query: 'https://example.com' }), /plain IP address or domain/u)
  assert.throws(() => normalizeIpGeoLookupInput({ query: 'not-a-domain' }), /IPv4\/IPv6 address or domain/u)
})

test('IPGEO client rejects provider error and fail statuses', async () => {
  const invalidClient = new IpGeoClient('https://ipgeo.test', (async () => jsonResponse({ error: 'invalid ip' }, 400)) as typeof fetch)
  await assert.rejects(() => invalidClient.lookup({ query: 'not-an-ip' }), /HTTP 400/u)

  const failClient = new IpGeoClient('https://ipgeo.test', (async () => jsonResponse({ status: 'fail', ip: '127.0.0.1' })) as typeof fetch)
  await assert.rejects(() => failClient.lookup({ query: '127.0.0.1' }), /did not return success/u)
})

test('IPGEO client explains Cloudflare HTML challenges', async () => {
  const client = new IpGeoClient('https://ipgeo.test', (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
    status: 403,
    headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
  })) as typeof fetch)

  await assert.rejects(
    () => client.lookup({ query: '8.8.8.8' }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
