import assert from 'node:assert/strict'
import test from 'node:test'
import { searchAdresse, reverseAdresse } from '../src/application/usecases/adresse.js'
import {
  AdresseClient,
  normalizeAdresseReverseInput,
  normalizeAdresseSearchInput,
} from '../src/infrastructure/openApis/adresseClient.js'

test('Adresse client calls Geoplateforme search endpoint with filters', async () => {
  const requests: string[] = []
  const client = new AdresseClient({
    baseUrl: 'https://geo.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(createFeatureCollection())
    }) as typeof fetch,
  })

  const response = await client.search({
    query: '8 bd du port',
    limit: 2,
    latitude: 49.03,
    longitude: 2.06,
    postcode: '95000',
    citycode: '95127',
    type: 'housenumber',
  })

  assert.deepEqual(requests, [
    'https://geo.test/geocodage/search?' +
      'q=8+bd+du+port&limit=2&lat=49.03&lon=2.06&postcode=95000' +
      '&citycode=95127&type=housenumber',
  ])
  assert.equal(response.features[0]?.label, '8 Boulevard du Port 95000 Cergy')
  assert.equal(response.features[0]?.coordinates.longitude, 2.062821)
})

test('Adresse usecases project GeoJSON metadata for TUI', async () => {
  const originalFetch = globalThis.fetch
  const requests: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requests.push(`${url.origin}${url.pathname}`)
    return jsonResponse(createFeatureCollection(url.pathname.includes('reverse')))
  }) as typeof fetch
  try {
    const search = await searchAdresse({ query: '8 bd du port', limit: 2 })
    assert.equal(search.kind, 'adresse.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.api.endpoint, 'GET /geocodage/search')
    assert.equal(search.pagination.maxLimit, 50)
    assert.equal(search.results[0]?.city, 'Cergy')

    const reverse = await reverseAdresse({
      latitude: 48.357,
      longitude: 2.37,
      limit: 1,
    })
    assert.equal(reverse.kind, 'adresse.reverse')
    assert.equal(reverse.api.authentication, 'none')
    assert.equal(reverse.api.usesBrowserClickstream, false)
    assert.equal(reverse.api.endpoint, 'GET /geocodage/reverse')
    assert.equal(reverse.results[0]?.distance, 149)
    assert.deepEqual(requests, [
      'https://data.geopf.fr/geocodage/search',
      'https://data.geopf.fr/geocodage/reverse',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Adresse normalizers enforce query and coordinate bounds', () => {
  assert.deepEqual(
    normalizeAdresseSearchInput({ query: '  8   bd du port  ', limit: 50 }),
    { query: '8 bd du port', limit: 50 },
  )
  assert.deepEqual(
    normalizeAdresseReverseInput({
      latitude: 48.357,
      longitude: 2.37,
      limit: 1,
      type: 'street',
    }),
    { latitude: 48.357, longitude: 2.37, limit: 1, type: 'street' },
  )
  assert.throws(() => normalizeAdresseSearchInput({ query: 'x' }), /between 2 and 200/u)
  assert.throws(() => normalizeAdresseSearchInput({ limit: 51 }), /1 to 50/u)
  assert.throws(
    () => normalizeAdresseSearchInput({ latitude: 48 }),
    /provided together/u,
  )
  assert.throws(() => normalizeAdresseReverseInput({ latitude: 91 }), /-90 to 90/u)
  assert.throws(() => normalizeAdresseSearchInput({ postcode: '7500A' }), /5-digit/u)
})

test('Adresse client surfaces provider JSON errors', async () => {
  const client = new AdresseClient({
    fetchImpl: (async () =>
      jsonResponse({
        code: 400,
        message: 'Failed parsing query',
        detail: ['q: required param'],
      }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({ query: 'x'.repeat(2), limit: 2 }),
    /q: required param/u,
  )
})

test('Adresse client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new AdresseClient({
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

  await assert.rejects(
    () => client.search({ query: '8 bd du port', limit: 2 }),
    /Cloudflare challenge HTML page/u,
  )
})

function createFeatureCollection(reverse = false): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    query: reverse ? undefined : '8 bd du port',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [2.062821, 49.031624] },
        properties: {
          label: reverse
            ? 'Grande Rue 91720 Prunay-sur-Essonne'
            : '8 Boulevard du Port 95000 Cergy',
          score: reverse ? 0.9851 : 0.4924,
          distance: reverse ? 149 : undefined,
          housenumber: reverse ? undefined : '8',
          id: reverse ? '91507_0100' : '95127_1448_00008',
          banId: '8e6b04d7-f6fd-48a1-80be-4ec984a286e8',
          name: reverse ? 'Grande Rue' : '8 Boulevard du Port',
          postcode: reverse ? '91720' : '95000',
          citycode: reverse ? '91507' : '95127',
          city: reverse ? 'Prunay-sur-Essonne' : 'Cergy',
          context: reverse
            ? '91, Essonne, Île-de-France'
            : "95, Val-d'Oise, Île-de-France",
          type: reverse ? 'street' : 'housenumber',
          street: reverse ? undefined : 'Boulevard du Port',
        },
      },
    ],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
