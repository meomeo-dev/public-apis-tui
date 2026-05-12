import assert from 'node:assert/strict'
import test from 'node:test'
import { listLaMetroRoutes, listLaMetroStops } from '../src/application/usecases/laMetro.js'
import { LaMetroClient, normalizeLaMetroRoutesInput, normalizeLaMetroStopsInput } from '../src/infrastructure/openApis/laMetroClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('LA Metro client reads routes and route stops without auth', async () => {
  const requestedUrls: string[] = []
  const client = new LaMetroClient({
    fetchImpl: (async input => {
      requestedUrls.push(String(input))
      const url = new URL(String(input))
      return jsonResponse(url.pathname.includes('/route_stops/') ? createStopsFixture() : createRoutesFixture())
    }) as typeof fetch,
  })

  const routes = await client.routeOverview({ agency: 'LACMTA', query: 'wilshire', routeType: 'bus', active: true, limit: 1 })
  assert.equal(routes.length, 1)
  assert.equal(routes[0]?.routeCode, '720')
  assert.equal(requestedUrls[0], 'https://api.metro.net/LACMTA/route_overview')

  const stops = await client.routeStops({ agency: 'LACMTA', routeCode: '720', dayType: 'all', directionId: 1, limit: 1 })
  assert.equal(stops.length, 1)
  assert.equal(stops[0]?.stopName, 'Central / 6th')
  assert.equal(stops[0]?.departureTimes[0], '03:43:00')
  assert.equal(requestedUrls[1], 'https://api.metro.net/LACMTA/route_stops/720?daytype=all')
})

test('LA Metro usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => new URL(String(input)).pathname.includes('/route_stops/') ? jsonResponse(createStopsFixture()) : jsonResponse(createRoutesFixture())) as typeof fetch
  try {
    const routes = await listLaMetroRoutes({ query: 'wilshire', limit: 2 })
    assert.equal(routes.kind, 'lametro.routes')
    assert.equal(routes.api.authentication, 'none')
    assert.equal(routes.api.usesBrowserClickstream, false)
    assert.equal(routes.routes[0]?.routeCode, '720')

    const stops = await listLaMetroStops({ routeCode: '720', directionId: 1, limit: 2 })
    assert.equal(stops.kind, 'lametro.stops')
    assert.equal(stops.api.authentication, 'none')
    assert.equal(stops.api.usesBrowserClickstream, false)
    assert.equal(stops.stops[0]?.stopId, 1213)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('LA Metro normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeLaMetroRoutesInput({}), { agency: 'LACMTA', limit: 100 })
  assert.deepEqual(normalizeLaMetroStopsInput({}), { agency: 'LACMTA', routeCode: '720', dayType: 'all', limit: 50 })
  assert.throws(() => normalizeLaMetroRoutesInput({ agency: 'BAD' }), RuntimeFailure)
  assert.throws(() => normalizeLaMetroRoutesInput({ limit: 501 }), RuntimeFailure)
  assert.throws(() => normalizeLaMetroStopsInput({ routeCode: 'bad route code' }), RuntimeFailure)
  assert.throws(() => normalizeLaMetroStopsInput({ dayType: 'holiday' }), RuntimeFailure)
  assert.throws(() => normalizeLaMetroStopsInput({ directionId: 2 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createRoutesFixture(): Array<Record<string, unknown>> {
  return [
    { route_id: '720-13172', route_code: '720', route_short_name: '720', route_long_name: 'Metro Rapid Line', route_desc: 'DTWN LA - SM VIA WILSHIRE', route_type: 'bus', agency_id: 'LACMTA', terminal_1: 'Downtown LA', terminal_2: 'Santa Monica', arterials: 'Wilshire Bl', is_active: true, travel_direction_0: 'Westbound', travel_direction_1: 'Eastbound' },
    { route_id: 'A', route_code: 'A', route_short_name: 'A', route_long_name: 'Metro A Line', route_desc: 'Rail Line', route_type: 'rail', agency_id: 'LACMTA_Rail', is_active: true },
  ]
}

function createStopsFixture(): Array<Record<string, unknown>> {
  return [
    { route_id: '720-13172', route_code: 720, day_type: 'weekday', stop_id: 1213, stop_sequence: 1, direction_id: 1, stop_name: 'Central / 6th', geometry: { type: 'Point', coordinates: [-118.239787, 34.039201] }, departure_times: "['03:43:00', '04:00:00']", agency_id: 'LACMTA' },
    { route_id: '720-13172', route_code: 720, day_type: 'weekday', stop_id: 1214, stop_sequence: 2, direction_id: 0, stop_name: 'Broadway / 6th', geometry: { type: 'Point', coordinates: [-118.252, 34.048] }, departure_times: "['03:47:00']", agency_id: 'LACMTA' },
  ]
}
