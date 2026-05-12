import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupIpApi } from '../src/application/usecases/ipApi.js'
import { IpApiClient, normalizeIpApiLookupInput } from '../src/infrastructure/openApis/ipApiClient.js'

const fixture = {
  status: 'success',
  country: 'United States',
  countryCode: 'US',
  region: 'VA',
  regionName: 'Virginia',
  city: 'Ashburn',
  zip: '20149',
  lat: 39.03,
  lon: -77.5,
  timezone: 'America/New_York',
  isp: 'Google LLC',
  org: 'Google Public DNS',
  as: 'AS15169 Google LLC',
  query: '8.8.8.8',
}

test('ip-api client fetches explicit HTTP JSON lookup', async () => {
  const requests: string[] = []
  const client = new IpApiClient('http://ip-api.test', (async input => {
    const url = new URL(String(input))
    requests.push(url.href)
    return jsonResponse(fixture, 200, { 'x-rl': '44', 'x-ttl': '60' })
  }) as typeof fetch)
  const response = await client.lookup({ query: '8.8.8.8' })
  assert.deepEqual(requests, ['http://ip-api.test/json/8.8.8.8?fields=status%2Cmessage%2Ccountry%2CcountryCode%2Cregion%2CregionName%2Ccity%2Czip%2Clat%2Clon%2Ctimezone%2Cisp%2Corg%2Cas%2Cquery'])
  assert.equal(response.lookup.countryCode, 'US')
  assert.equal(response.lookup.latitude, 39.03)
  assert.equal(response.lookup.longitude, -77.5)
  assert.equal(response.lookup.organization, 'Google Public DNS')
  assert.equal(response.rateLimit.remaining, '44')
  assert.equal(response.rateLimit.resetSeconds, '60')
})

test('ip-api usecase projects HTTP-only no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await lookupIpApi()
    assert.equal(result.kind, 'ipapi.lookup')
    assert.equal(result.api.providerId, 'ip-api')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.transport, 'HTTP JSON REST')
    assert.equal(result.query.query, '8.8.8.8')
    assert.equal(result.lookup.country, 'United States')
    assert.equal(result.transport.security, 'http-only')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ip-api normalizer validates IP addresses and domains', () => {
  assert.deepEqual(normalizeIpApiLookupInput({}), { query: '8.8.8.8' })
  assert.deepEqual(normalizeIpApiLookupInput({ query: ' Example.COM ' }), { query: 'example.com' })
  assert.deepEqual(normalizeIpApiLookupInput({ query: '2001:4860:4860::8888' }), { query: '2001:4860:4860::8888' })
  assert.throws(() => normalizeIpApiLookupInput({ query: 'https://example.com' }), /plain IP address or domain/u)
  assert.throws(() => normalizeIpApiLookupInput({ query: 'not-a-domain' }), /IPv4\/IPv6 address or domain/u)
})

test('ip-api client rejects provider JSON failure statuses', async () => {
  const client = new IpApiClient('http://ip-api.test', (async () => jsonResponse({ status: 'fail', message: 'invalid query', query: 'bad.invalid' })) as typeof fetch)
  await assert.rejects(() => client.lookup({ query: 'bad.invalid' }), /invalid query/u)
})

test('ip-api client explains Cloudflare HTML challenges', async () => {
  const client = new IpApiClient('http://ip-api.test', (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
    status: 403,
    headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
  })) as typeof fetch)

  await assert.rejects(
    () => client.lookup({ query: '8.8.8.8' }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}
