import assert from 'node:assert/strict'
import test from 'node:test'
import { reverseNominatim, searchNominatim } from '../src/application/usecases/nominatim.js'
import { NominatimClient, normalizeNominatimReverseInput, normalizeNominatimSearchInput } from '../src/infrastructure/openApis/nominatimClient.js'

const place = {
  place_id: 145549253,
  licence: 'Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright',
  osm_type: 'relation',
  osm_id: 62422,
  lat: '52.5173885',
  lon: '13.3951309',
  category: 'boundary',
  type: 'administrative',
  place_rank: 8,
  importance: 0.8522,
  addresstype: 'city',
  name: 'Berlin',
  display_name: 'Berlin, Deutschland',
  address: { city: 'Berlin', country: 'Deutschland', country_code: 'de' },
  boundingbox: ['52.3382448', '52.6755087', '13.0883450', '13.7611609'],
}

test('Nominatim client sends bounded search with JSONv2 and custom User-Agent', async () => {
  const requests: string[] = []
  const userAgents: string[] = []
  const client = new NominatimClient({
    baseUrl: 'https://nominatim.test',
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      requests.push(url.href)
      const headers = new Headers(init?.headers)
      userAgents.push(headers.get('user-agent') ?? '')
      return jsonResponse([place])
    }) as typeof fetch,
  })
  const results = await client.search({ query: 'Berlin', limit: 3, language: 'en' })
  assert.deepEqual(requests, ['https://nominatim.test/search?q=Berlin&format=jsonv2&addressdetails=1&limit=3&accept-language=en'])
  assert.match(userAgents[0] ?? '', /public-apis-tui/u)
  assert.equal(results[0]?.displayName, 'Berlin, Deutschland')
  assert.equal(results[0]?.latitude, 52.5173885)
})

test('Nominatim usecases project policy metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/search' ? [place] : place)
  }) as typeof fetch
  try {
    const search = await searchNominatim()
    assert.equal(search.kind, 'nominatim.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.match(search.api.usagePolicy, /1 request per second/u)
    assert.equal(search.pagination.maxLimit, 5)

    const reverse = await reverseNominatim({ latitude: '52.5170365', longitude: '13.3888599' })
    assert.equal(reverse.kind, 'nominatim.reverse')
    assert.equal(reverse.place.displayName, 'Berlin, Deutschland')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Nominatim normalizers enforce public-service boundaries', () => {
  assert.deepEqual(normalizeNominatimSearchInput({}), { query: 'Berlin', limit: 3, language: 'en' })
  assert.deepEqual(normalizeNominatimSearchInput({ query: ' Paris ', limit: 5, language: 'fr' }), { query: 'Paris', limit: 5, language: 'fr' })
  assert.throws(() => normalizeNominatimSearchInput({ query: 'A' }), /at least 2/u)
  assert.throws(() => normalizeNominatimSearchInput({ limit: 6 }), /between 1 and 5/u)
  assert.deepEqual(normalizeNominatimReverseInput({ latitude: '52.5', longitude: '13.4', language: 'de' }), { latitude: 52.5, longitude: 13.4, language: 'de' })
  assert.throws(() => normalizeNominatimReverseInput({ latitude: 100, longitude: 13.4 }), /--latitude/u)
  assert.throws(() => normalizeNominatimReverseInput({ latitude: 52.5, longitude: 200 }), /--longitude/u)
})

test('Nominatim client rejects provider JSON errors', async () => {
  const client = new NominatimClient({
    baseUrl: 'https://nominatim.test',
    fetchImpl: (async () => jsonResponse({ error: 'Unable to geocode' }, 400)) as typeof fetch,
  })
  await assert.rejects(() => client.reverse({ latitude: 0, longitude: 0, language: 'en' }), /Unable to geocode/u)
})

test('Nominatim client explains Cloudflare HTML challenges', async () => {
  const client = new NominatimClient({
    baseUrl: 'https://nominatim.test',
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({ query: 'Berlin', limit: 1, language: 'en' }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
