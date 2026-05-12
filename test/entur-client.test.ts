import assert from 'node:assert/strict'
import test from 'node:test'
import { listEnturDepartures, searchEnturPlaces } from '../src/application/usecases/entur.js'
import { EnturClient, normalizeEnturDeparturesInput, normalizeEnturPlacesInput } from '../src/infrastructure/openApis/enturClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Entur client reads geocoder places and departures without auth', async () => {
  const requests: Array<{ url: string; init?: RequestInit | undefined }> = []
  const client = new EnturClient({
    fetchImpl: (async (input, init) => {
      requests.push({ url: String(input), init })
      const url = String(input)
      if (url.includes('/journey-planner/')) {
        return jsonResponse(createDeparturesFixture(), {
          'rate-limit-available': '98',
          'rate-limit-used': '2',
        })
      }
      return jsonResponse(createPlacesFixture(), {
        'rate-limit-available': '99',
        'rate-limit-used': '1',
      })
    }) as typeof fetch,
  })

  const places = await client.places({ text: 'Oslo S', lang: 'en', layers: 'venue', size: 1, clientName: 'public-apis-tui-test' })
  assert.equal(places.places.length, 1)
  assert.equal(places.places[0]?.id, 'NSR:StopPlace:59872')
  assert.equal(places.places[0]?.modes[0], 'rail')
  assert.equal(places.rateLimit.available, '99')
  assert.match(requests[0]?.url ?? '', /^https:\/\/api\.entur\.io\/geocoder\/v1\/autocomplete\?/)
  assert.equal(readHeader(requests[0]?.init, 'ET-Client-Name'), 'public-apis-tui-test')

  const departures = await client.departures({ stopPlaceId: 'NSR:StopPlace:59872', departures: 2, transportMode: 'rail', clientName: 'public-apis-tui-test' })
  assert.equal(departures.stopPlace.name, 'Oslo S')
  assert.equal(departures.departures.length, 1)
  assert.equal(departures.departures[0]?.lineCode, 'R12')
  assert.equal(departures.rateLimit.available, '98')
  assert.equal(requests[1]?.url, 'https://api.entur.io/journey-planner/v3/graphql')
  assert.equal(requests[1]?.init?.method, 'POST')
  assert.equal(readHeader(requests[1]?.init, 'ET-Client-Name'), 'public-apis-tui-test')
  assert.match(String(requests[1]?.init?.body ?? ''), /estimatedCalls/)
})

test('Entur usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => String(input).includes('/journey-planner/')
    ? jsonResponse(createDeparturesFixture())
    : jsonResponse(createPlacesFixture())) as typeof fetch
  try {
    const places = await searchEnturPlaces({ text: 'Oslo S', size: 2 })
    assert.equal(places.kind, 'entur.places')
    assert.equal(places.api.authentication, 'none')
    assert.equal(places.api.usesBrowserClickstream, false)
    assert.equal(places.places[0]?.name, 'Oslo S')

    const departures = await listEnturDepartures({ stopPlaceId: 'NSR:StopPlace:59872', departures: 2 })
    assert.equal(departures.kind, 'entur.departures')
    assert.equal(departures.api.authentication, 'none')
    assert.equal(departures.api.usesBrowserClickstream, false)
    assert.equal(departures.stopPlace.id, 'NSR:StopPlace:59872')
    assert.equal(departures.departures[0]?.destination, 'Lillestrøm')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Entur normalizers enforce curated bounds and safe client identifier', () => {
  assert.deepEqual(normalizeEnturPlacesInput({}), {
    text: 'Oslo S',
    lang: 'en',
    layers: 'venue',
    size: 100,
    clientName: 'public-apis-tui-cli',
  })
  assert.deepEqual(normalizeEnturDeparturesInput({}), {
    stopPlaceId: 'NSR:StopPlace:59872',
    departures: 20,
    clientName: 'public-apis-tui-cli',
  })
  assert.throws(() => normalizeEnturPlacesInput({ size: 101 }), RuntimeFailure)
  assert.throws(() => normalizeEnturPlacesInput({ lang: 'eng' }), RuntimeFailure)
  assert.throws(() => normalizeEnturPlacesInput({ boundaryCountry: 'NO' }), RuntimeFailure)
  assert.throws(() => normalizeEnturDeparturesInput({ stopPlaceId: 'bad' }), RuntimeFailure)
  assert.throws(() => normalizeEnturDeparturesInput({ departures: 101 }), RuntimeFailure)
  assert.throws(() => normalizeEnturDeparturesInput({ clientName: '<script>' }), RuntimeFailure)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function createPlacesFixture(): Record<string, unknown> {
  return {
    features: [
      {
        geometry: { type: 'Point', coordinates: [10.751, 59.91] },
        properties: {
          id: 'NSR:StopPlace:59872',
          name: 'Oslo S',
          label: 'Oslo S, Oslo',
          layer: 'venue',
          locality: 'Oslo',
          county: 'Oslo',
          country_a: 'NOR',
          category: ['onstreetBus', 'railStation'],
          mode: [{ rail: true }, { bus: true }],
        },
      },
      {
        geometry: { type: 'Point', coordinates: [10.75, 59.91] },
        properties: {
          id: 'NSR:StopPlace:337',
          name: 'Oslo bussterminal',
          label: 'Oslo bussterminal, Oslo',
          layer: 'venue',
          locality: 'Oslo',
          country_a: 'NOR',
          mode: [{ bus: true }],
        },
      },
    ],
  }
}

function createDeparturesFixture(): Record<string, unknown> {
  return {
    data: {
      stopPlace: {
        id: 'NSR:StopPlace:59872',
        name: 'Oslo S',
        estimatedCalls: [
          {
            expectedDepartureTime: '2026-05-05T10:00:00+02:00',
            actualDepartureTime: '2026-05-05T10:01:00+02:00',
            destinationDisplay: { frontText: 'Lillestrøm' },
            serviceJourney: {
              journeyPattern: {
                line: { publicCode: 'R12', name: 'Kongsberg - Eidsvoll', transportMode: 'rail' },
              },
            },
          },
          {
            expectedDepartureTime: '2026-05-05T10:05:00+02:00',
            destinationDisplay: { frontText: 'Helsfyr' },
            serviceJourney: {
              journeyPattern: {
                line: { publicCode: 'B1', name: 'Bus line', transportMode: 'bus' },
              },
            },
          },
        ],
      },
    },
  }
}

function readHeader(init: RequestInit | undefined, name: string): string | null {
  if (init?.headers === undefined) return null
  return new Headers(init.headers).get(name)
}
