import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getUsgsEarthquakeEvent,
  normalizeUsgsEarthquakeEventInput,
  normalizeUsgsEarthquakeSearchInput,
  searchUsgsEarthquakes,
} from '../src/application/usecases/usgsEarthquake.js'
import {
  UsgsEarthquakeClient,
} from '../src/infrastructure/openApis/usgsEarthquakeClient.js'

test('USGS Earthquake client calls documented no-auth GeoJSON endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new UsgsEarthquakeClient({
    baseUrl: 'https://earthquake.usgs.example/fdsnws/event/1',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      return jsonResponse(responseForUrl(url))
    }) as typeof fetch,
  })

  const search = await client.search({
    minMagnitude: 4.5,
    limit: 2,
    offset: 1,
    orderBy: 'time',
  })
  const event = await client.event({ eventId: 'us6000swvm' })

  assert.equal(requestedUrls[0]?.pathname, '/fdsnws/event/1/query')
  assert.equal(requestedUrls[0]?.searchParams.get('format'), 'geojson')
  assert.equal(requestedUrls[0]?.searchParams.get('eventtype'), 'earthquake')
  assert.equal(requestedUrls[0]?.searchParams.get('minmagnitude'), '4.5')
  assert.equal(requestedUrls[1]?.searchParams.get('eventid'), 'us6000swvm')
  assert.equal(search.events[0]?.id, 'us6000swvm')
  assert.equal(event.title, 'M 5.2 - 72 km NW of Malango, Solomon Islands')
})

test('USGS Earthquake usecases project bounded event metadata only', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(responseForUrl(url))
  }) as typeof fetch

  try {
    const search = await searchUsgsEarthquakes({ limit: 2 })
    assert.equal(search.kind, 'usgsearthquake.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.events.length, 1)
    assert.equal(search.events[0]?.coordinates?.depthKm, 10)
    assert.equal('products' in search.events[0]!, false)
    assert.equal('contents' in search.events[0]!, false)

    const event = await getUsgsEarthquakeEvent({ eventId: 'us6000swvm' })
    assert.equal(event.kind, 'usgsearthquake.event')
    assert.equal(event.event.productTypes.includes('origin'), true)
    assert.equal(event.event.sources.includes('us'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('USGS Earthquake normalizers enforce bounded curated parameters', () => {
  assert.deepEqual(normalizeUsgsEarthquakeSearchInput({}), {
    minMagnitude: 4.5,
    limit: 10,
    offset: 1,
    orderBy: 'time',
  })
  assert.deepEqual(normalizeUsgsEarthquakeEventInput({}), {
    eventId: 'official20110311054624120_30',
  })
  assert.throws(
    () => normalizeUsgsEarthquakeSearchInput({ minMagnitude: 11 }),
    /min-magnitude/,
  )
  assert.throws(() => normalizeUsgsEarthquakeSearchInput({ limit: 51 }), /limit/)
  assert.throws(() => normalizeUsgsEarthquakeSearchInput({ offset: 0 }), /offset/)
  assert.throws(
    () => normalizeUsgsEarthquakeSearchInput({ orderBy: 'random' }),
    /order-by/,
  )
  assert.throws(
    () => normalizeUsgsEarthquakeSearchInput({ startTime: 'today' }),
    /start-time/,
  )
  assert.throws(
    () => normalizeUsgsEarthquakeSearchInput({
      startTime: '2026-05-11',
      endTime: '2026-05-01',
    }),
    /start-time/,
  )
  assert.throws(
    () => normalizeUsgsEarthquakeEventInput({ eventId: '../secret' }),
    /event-id/,
  )
})

test('USGS Earthquake client surfaces challenge HTML clearly', async () => {
  const client = new UsgsEarthquakeClient({
    baseUrl: 'https://earthquake.usgs.example/fdsnws/event/1',
    fetchImpl: (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({
      minMagnitude: 4.5,
      limit: 2,
      offset: 1,
      orderBy: 'time',
    }),
    /challenge HTML page/u,
  )
})

function responseForUrl(url: URL): Record<string, unknown> {
  if (url.searchParams.has('eventid')) return createEventFixture()
  return {
    type: 'FeatureCollection',
    metadata: {
      generated: 1778507928000,
      url: url.toString(),
      title: 'USGS Earthquakes',
      status: 200,
      api: '2.4.0',
      limit: 2,
      offset: 1,
    },
    features: [createEventFixture()],
  }
}

function createEventFixture(): Record<string, unknown> {
  return {
    type: 'Feature',
    id: 'us6000swvm',
    properties: {
      mag: 5.2,
      place: '72 km NW of Malango, Solomon Islands',
      time: 1778492931604,
      updated: 1778495736750,
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000swvm',
      detail: [
        'https://earthquake.usgs.gov/fdsnws/event/1/query?',
        'eventid=us6000swvm&format=geojson',
      ].join(''),
      felt: 4,
      cdi: 2.7,
      mmi: null,
      alert: null,
      status: 'reviewed',
      tsunami: 0,
      sig: 417,
      net: 'us',
      code: '6000swvm',
      sources: ',us,usauto,',
      types: ',origin,phase-data,',
      magType: 'mww',
      type: 'earthquake',
      title: 'M 5.2 - 72 km NW of Malango, Solomon Islands',
      products: {
        origin: [{
          contents: {
            'download.bin': {
              contentType: 'application/octet-stream',
              url: 'https://earthquake.usgs.gov/product/download.bin',
            },
          },
        }],
      },
    },
    geometry: { type: 'Point', coordinates: [159.1915, -9.2967, 10] },
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
