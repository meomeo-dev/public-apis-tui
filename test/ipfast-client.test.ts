import assert from 'node:assert/strict'
import test from 'node:test'
import { projectIpfastLookup } from '../src/application/usecases/ipfast.js'
import { IpfastClient } from '../src/infrastructure/openApis/ipfastClient.js'

test('IPFast client calls live JSON endpoint and captures rate-limit headers', async () => {
  const requests: string[] = []
  const client = new IpfastClient('https://ipfast.test', (async input => {
    const url = new URL(String(input))
    requests.push(url.href)
    return jsonResponse({
      ip: '203.0.113.10',
      country: 'US',
      countryName: 'United States',
      city: 'Portland',
      region: 'Oregon',
      timezone: 'America/Los_Angeles',
      latitude: '45.52345',
      longitude: '-122.67621',
      asn: 16276,
      asOrganization: 'OVH US LLC',
      currency: 'USD',
    }, {
      'x-ratelimit-limit': '120',
      'x-ratelimit-remaining': '119',
      'x-ratelimit-reset': '1777826221',
    })
  }) as typeof fetch)

  const response = await client.lookup()

  assert.deepEqual(requests, ['https://ipfast.test/json'])
  assert.equal(response.body.ip, '203.0.113.10')
  assert.equal(response.body.countryName, 'United States')
  assert.equal(response.body.asn, 16276)
  assert.deepEqual(response.rateLimit, {
    limit: '120',
    remaining: '119',
    reset: '1777826221',
  })
})

test('IPFast projection exposes no-auth metadata and structured TUI fields', () => {
  const result = projectIpfastLookup({
    ip: '203.0.113.10',
    country: 'US',
    countryName: 'United States',
    city: 'Portland',
    region: 'Oregon',
    timezone: 'America/Los_Angeles',
    latitude: '45.52345',
    longitude: '-122.67621',
    asn: 16276,
    asOrganization: 'OVH US LLC',
    colo: 'PDX',
    currency: 'USD',
    currencyName: 'United States Dollar',
    callingCode: '+1',
    languages: 'English',
  }, {
    endpoint: 'https://ipfast.dev/json',
    contentType: 'application/json',
    rateLimit: { limit: '120', remaining: '119', reset: '1777826221' },
  })

  assert.equal(result.kind, 'ipfast.lookup')
  assert.equal(result.api.authentication, 'none')
  assert.equal(result.api.usesBrowserClickstream, false)
  assert.equal(result.api.publicApisListedDocs, 'https://ip-fast.com/docs/')
  assert.equal(result.ip.address, '203.0.113.10')
  assert.equal(result.geo.city, 'Portland')
  assert.equal(result.network.asOrganization, 'OVH US LLC')
  assert.equal(result.locale.currency, 'USD')
  assert.equal(result.response.endpoint, 'https://ipfast.dev/json')
})

test('IPFast client rejects invalid response shapes', async () => {
  const client = new IpfastClient('https://ipfast.test', (async () => jsonResponse({ country: 'US' })) as typeof fetch)

  await assert.rejects(() => client.lookup(), /IPFast response did not include an IP address/u)
})

function jsonResponse(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}
