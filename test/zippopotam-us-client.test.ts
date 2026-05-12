import assert from 'node:assert/strict'
import test from 'node:test'
import { lookupZippopotamUs, searchZippopotamUs } from '../src/application/usecases/zippopotamUs.js'
import {
  ZippopotamUsClient,
  normalizeZippopotamUsLookupInput,
  normalizeZippopotamUsSearchInput,
} from '../src/infrastructure/openApis/zippopotamUsClient.js'

const lookupFixture = {
  country: 'United States',
  'country abbreviation': 'US',
  'post code': '90210',
  places: [
    {
      'place name': 'Beverly Hills',
      longitude: '-118.4065',
      latitude: '34.0901',
      state: 'California',
      'state abbreviation': 'CA',
    },
  ],
}

const searchFixture = {
  country: 'United States',
  'country abbreviation': 'US',
  state: 'Massachusetts',
  'state abbreviation': 'MA',
  'place name': 'Belmont',
  places: [
    {
      'place name': 'Belmont',
      longitude: '-71.4594',
      latitude: '42.4464',
      'post code': '02178',
    },
    {
      'place name': 'Belmont',
      longitude: '-71.1747',
      latitude: '42.3959',
      'post code': '02478',
    },
  ],
}

test('Zippopotam.us client looks up country/postal-code places', async () => {
  const client = new ZippopotamUsClient({
    fetchImpl: (async input => {
      assert.equal(String(input), 'https://api.zippopotam.us/us/90210')
      return jsonResponse(lookupFixture)
    }) as typeof fetch,
  })

  const result = await client.lookup({ country: 'US', postalCode: '90210', limit: 1 })
  assert.equal(result?.country, 'United States')
  assert.deepEqual(result?.places, [{ placeName: 'Beverly Hills', longitude: '-118.4065', latitude: '34.0901', state: 'California', stateAbbreviation: 'CA' }])
})

test('Zippopotam.us client searches country/state/city places', async () => {
  const client = new ZippopotamUsClient({
    fetchImpl: (async input => {
      assert.equal(String(input), 'https://api.zippopotam.us/us/ma/belmont')
      return jsonResponse(searchFixture)
    }) as typeof fetch,
  })

  const result = await client.search({ country: 'US', state: 'MA', city: 'Belmont', limit: 1 })
  assert.equal(result?.placeName, 'Belmont')
  assert.deepEqual(result?.places, [{ placeName: 'Belmont', longitude: '-71.4594', latitude: '42.4464', postalCode: '02178' }])
})

test('Zippopotam.us usecases project no-auth HTTPS metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => jsonResponse(String(input).split('/').length > 5 ? searchFixture : lookupFixture)) as typeof fetch
  try {
    const lookup = await lookupZippopotamUs({ country: 'us', postalCode: '90210', limit: 1 })
    assert.equal(lookup.kind, 'zippopotam-us.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.places[0]?.placeName, 'Beverly Hills')

    const search = await searchZippopotamUs({ country: 'us', state: 'ma', city: 'Belmont', limit: 1 })
    assert.equal(search.kind, 'zippopotam-us.search')
    assert.equal(search.pagination.maxLimit, 50)
    assert.equal(search.places[0]?.postalCode, '02178')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Zippopotam.us normalizers enforce path-safe bounded inputs', () => {
  assert.deepEqual(normalizeZippopotamUsLookupInput({}), { country: 'US', postalCode: '90210', limit: 10 })
  assert.deepEqual(normalizeZippopotamUsSearchInput({ country: 'us', state: ' ma ', city: ' Beverly   Hills ', limit: 2 }), { country: 'US', state: 'MA', city: 'Beverly Hills', limit: 2 })
  assert.throws(() => normalizeZippopotamUsLookupInput({ country: 'usa' }), /--country/u)
  assert.throws(() => normalizeZippopotamUsLookupInput({ postalCode: 'a/b' }), /--postal-code/u)
  assert.throws(() => normalizeZippopotamUsSearchInput({ city: 'a/b' }), /--city/u)
  assert.throws(() => normalizeZippopotamUsSearchInput({ limit: 51 }), /between 1 and 50/u)
})

test('Zippopotam.us client maps empty 404 JSON objects to empty results', async () => {
  const client = new ZippopotamUsClient({
    fetchImpl: (async () => jsonResponse({}, 404)) as typeof fetch,
  })
  assert.equal(await client.lookup({ country: 'US', postalCode: '99999', limit: 1 }), undefined)
  assert.equal(await client.search({ country: 'US', state: 'CA', city: 'Nope', limit: 1 }), undefined)
})

test('Zippopotam.us client rejects non-JSON provider failures', async () => {
  const client = new ZippopotamUsClient({
    fetchImpl: (async () => new Response('<html>home</html>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch,
  })
  await assert.rejects(() => client.lookup({ country: 'US', postalCode: '90210', limit: 1 }), /non-JSON/u)
})

test('Zippopotam.us client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new ZippopotamUsClient({
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
  await assert.rejects(() => client.lookup({ country: 'US', postalCode: '90210', limit: 1 }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
