import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupIpInfo } from '../src/application/usecases/ipInfo.js'
import { IpInfoClient, normalizeIpInfoLookupInput } from '../src/infrastructure/openApis/ipInfoClient.js'

const fixture = {
  ip: '8.8.8.8',
  hostname: 'dns.google',
  city: 'Mountain View',
  region: 'California',
  country: 'US',
  loc: '37.4056,-122.0775',
  org: 'AS15169 Google LLC',
  postal: '94043',
  timezone: 'America/Los_Angeles',
  readme: 'https://ipinfo.io/missingauth',
  anycast: true,
}

test('IPinfo client fetches explicit IP JSON lookup', async () => {
  const requests: string[] = []
  const client = new IpInfoClient({
    baseUrl: 'https://ipinfo.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      return jsonResponse(fixture)
    }) as typeof fetch,
  })
  const lookup = await client.lookup({ ip: '8.8.8.8' })
  assert.deepEqual(requests, ['https://ipinfo.test/8.8.8.8/json'])
  assert.equal(lookup.country, 'US')
  assert.equal(lookup.latitude, 37.4056)
  assert.equal(lookup.longitude, -122.0775)
  assert.equal(lookup.missingAuthReadme, 'https://ipinfo.io/missingauth')
})

test('IPinfo usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await lookupIpInfo()
    assert.equal(result.kind, 'ipinfo.lookup')
    assert.equal(result.api.providerId, 'ipinfo')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.ip, '8.8.8.8')
    assert.equal(result.lookup.anycast, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('IPinfo normalizer validates IPv4 and IPv6 addresses', () => {
  assert.deepEqual(normalizeIpInfoLookupInput({}), { ip: '8.8.8.8' })
  assert.deepEqual(normalizeIpInfoLookupInput({ ip: ' 2001:4860:4860::8888 ' }), { ip: '2001:4860:4860::8888' })
  assert.throws(() => normalizeIpInfoLookupInput({ ip: 'not-an-ip' }), /IPv4 or IPv6/u)
})

test('IPinfo client rejects provider JSON errors', async () => {
  const client = new IpInfoClient({
    fetchImpl: (async () => jsonResponse({ status: 404, error: { title: 'Wrong ip' } }, 404)) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ ip: '8.8.8.8' }), /HTTP 404/u)
})

test('IPinfo client explains Cloudflare HTML challenges', async () => {
  const client = new IpInfoClient({
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
