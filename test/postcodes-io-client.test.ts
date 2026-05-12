import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupPostcodesIo, nearestPostcodesIo, searchPostcodesIo } from '../src/application/usecases/postcodesIo.js'
import { PostcodesIoClient, normalizePostcodesIoLookupInput, normalizePostcodesIoNearestInput, normalizePostcodesIoSearchInput } from '../src/infrastructure/openApis/postcodesIoClient.js'

const postcodeFixture = {
  postcode: 'SW1A 2AA',
  quality: 1,
  eastings: 530047,
  northings: 179951,
  country: 'England',
  longitude: -0.12767,
  latitude: 51.503541,
  region: 'London',
  admin_district: 'Westminster',
  admin_county: null,
  admin_ward: "St James's",
  parliamentary_constituency: 'Cities of London and Westminster',
  outcode: 'SW1A',
  incode: '2AA',
}

test('Postcodes.io client sends lookup, search, and nearest requests', async () => {
  const requests: string[] = []
  const client = new PostcodesIoClient({
    baseUrl: 'https://postcodes.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse({ status: 200, result: requests.length === 1 ? postcodeFixture : [postcodeFixture] })
    }) as typeof fetch,
  })
  assert.equal((await client.lookup({ postcode: 'SW1A 2AA' }))?.postcode, 'SW1A 2AA')
  assert.equal((await client.search({ query: 'SW1A', limit: 1 }))[0]?.adminDistrict, 'Westminster')
  assert.equal((await client.nearest({ latitude: 51.5074, longitude: -0.1278, limit: 1, radius: 1000 }))[0]?.region, 'London')
  assert.deepEqual(requests, [
    'https://postcodes.test/postcodes/SW1A%202AA',
    'https://postcodes.test/postcodes?q=SW1A',
    'https://postcodes.test/postcodes?lat=51.5074&lon=-0.1278&radius=1000',
  ])
})

test('Postcodes.io usecases project no-auth metadata and bounded results', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const isLookup = String(input).includes('/postcodes/SW1A')
    return jsonResponse({ status: 200, result: isLookup ? postcodeFixture : [postcodeFixture, { ...postcodeFixture, postcode: 'SW1A 0AA' }] })
  }) as typeof fetch
  try {
    const lookup = await lookupPostcodesIo({ postcode: 'sw1a 2aa' })
    assert.equal(lookup.kind, 'postcodes-io.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.postcode?.adminDistrict, 'Westminster')

    const search = await searchPostcodesIo({ query: 'sw1a', limit: 1 })
    assert.equal(search.postcodes.length, 1)
    assert.equal(search.pagination.maxLimit, 20)

    const nearest = await nearestPostcodesIo({ latitude: 51.5074, longitude: -0.1278, limit: 1 })
    assert.equal(nearest.postcodes[0]?.postcode, 'SW1A 2AA')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Postcodes.io normalizers enforce bounds', () => {
  assert.deepEqual(normalizePostcodesIoLookupInput({}), { postcode: 'SW1A 2AA' })
  assert.deepEqual(normalizePostcodesIoSearchInput({ query: ' sw1a ', limit: 2 }), { query: 'SW1A', limit: 2 })
  assert.deepEqual(normalizePostcodesIoNearestInput({ latitude: 51.5, longitude: -0.1, limit: 2, radius: 1000 }), { latitude: 51.5, longitude: -0.1, limit: 2, radius: 1000 })
  assert.throws(() => normalizePostcodesIoLookupInput({ postcode: 'bad!' }), /UK postcode/u)
  assert.throws(() => normalizePostcodesIoSearchInput({ query: 'a' }), /at least 2/u)
  assert.throws(() => normalizePostcodesIoNearestInput({ latitude: 91 }), /latitude/u)
  assert.throws(() => normalizePostcodesIoNearestInput({ radius: 2001 }), /radius/u)
})

test('Postcodes.io client maps invalid lookup to empty result and rejects non-JSON', async () => {
  const notFound = new PostcodesIoClient({
    baseUrl: 'https://postcodes.test',
    fetchImpl: (async () => jsonResponse({ status: 404, error: 'Invalid postcode' }, 404)) as typeof fetch,
  })
  assert.equal(await notFound.lookup({ postcode: 'SW1A 2AA' }), undefined)

  const html = new PostcodesIoClient({
    baseUrl: 'https://postcodes.test',
    fetchImpl: (async () => new Response('<html>error</html>', { status: 502, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => html.search({ query: 'SW1A', limit: 1 }), /non-JSON/u)
})

test('Postcodes.io client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new PostcodesIoClient({
    baseUrl: 'https://postcodes.test',
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })
  await assert.rejects(() => client.search({ query: 'SW1A', limit: 1 }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
