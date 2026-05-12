import assert from 'node:assert/strict'
import test from 'node:test'
import { getCountryIsInfo, lookupCountryIs } from '../src/application/usecases/countryIs.js'
import { CountryIsClient, normalizeCountryIsLookupInput } from '../src/infrastructure/openApis/countryIsClient.js'

test('Country.is client calls lookup and info JSON endpoints', async () => {
  const requests: string[] = []
  const client = new CountryIsClient({
    baseUrl: 'https://country.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      const url = new URL(String(input))
      if (url.pathname === '/info') return jsonResponse(infoFixture())
      return jsonResponse(lookupFixture(true))
    }) as typeof fetch,
  })

  const lookup = await client.lookup({ ip: '8.8.8.8', includeDetails: true })
  const info = await client.info()

  assert.equal(lookup.country, 'US')
  assert.equal(lookup.location?.accuracyRadius, 1000)
  assert.equal(info.version, '4.2.3')
  assert.deepEqual(requests, [
    'https://country.test/8.8.8.8?fields=city%2Ccontinent%2Csubdivision%2Cpostal%2Clocation%2Casn',
    'https://country.test/info',
  ])
})

test('Country.is usecases project privacy and service metadata for TUI', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/info') return jsonResponse(infoFixture())
    return jsonResponse(lookupFixture(url.searchParams.has('fields')))
  }) as typeof fetch
  try {
    const lookup = await lookupCountryIs({ ip: '8.8.8.8', includeDetails: false })
    assert.equal(lookup.kind, 'countryis.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.lookup.country, 'US')
    assert.equal(lookup.lookup.location, undefined)

    const detailed = await lookupCountryIs({ ip: '8.8.8.8', includeDetails: true })
    assert.equal(detailed.lookup.asn?.organization, 'Google LLC')

    const info = await getCountryIsInfo()
    assert.equal(info.kind, 'countryis.info')
    assert.deepEqual(info.info.dataSources, ['maxmind', 'cloudflare'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Country.is normalizer keeps current-client geolocation opt-in only', () => {
  assert.deepEqual(normalizeCountryIsLookupInput({ ip: '8.8.8.8', includeDetails: true }), { ip: '8.8.8.8', includeDetails: true })
  assert.deepEqual(normalizeCountryIsLookupInput({}), { includeDetails: false })
  assert.throws(() => normalizeCountryIsLookupInput({ ip: 'not-an-ip' }), /IPv4 or IPv6/u)
})

test('Country.is client surfaces provider JSON errors', async () => {
  const client = new CountryIsClient({
    fetchImpl: (async () => jsonResponse({ error: { code: 404, message: 'Not Found' } }, 404)) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ ip: '1.2.3.4', includeDetails: false }), /Not Found/u)
})

test('Country.is client explains Cloudflare HTML challenges', async () => {
  const client = new CountryIsClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.lookup({ ip: '8.8.8.8', includeDetails: false }),
    /Cloudflare challenge HTML page/u,
  )
})

function lookupFixture(details: boolean): Record<string, unknown> {
  return {
    ip: '8.8.8.8',
    country: 'US',
    ...(details ? {
      city: null,
      continent: 'NA',
      subdivision: null,
      postal: null,
      location: { latitude: 37.751, longitude: -97.822, accuracy_radius: 1000, time_zone: 'America/Chicago' },
      asn: { number: 15169, organization: 'Google LLC' },
    } : {}),
  }
}

function infoFixture(): Record<string, unknown> {
  return { version: '4.2.3', dataSources: ['maxmind', 'cloudflare'], lastUpdated: '2026-05-05T07:28:10.000Z' }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
