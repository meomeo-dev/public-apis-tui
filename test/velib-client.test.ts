import assert from 'node:assert/strict'
import test from 'node:test'
import { listVelibStations } from '../src/application/usecases/velib.js'
import { VelibClient, normalizeVelibStationsInput } from '../src/infrastructure/openApis/velibClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Velib client combines GBFS station information and status without auth', async () => {
  const requestedUrls: string[] = []
  const client = new VelibClient({
    fetchImpl: (async input => {
      requestedUrls.push(String(input))
      return jsonResponse(String(input).includes('station_status') ? createStatusFixture() : createInformationFixture())
    }) as typeof fetch,
  })

  const response = await client.stations({ query: 'godard', minBikes: 10, sort: 'bikes', limit: 1 })
  assert.equal(response.stations.length, 1)
  assert.equal(response.stations[0]?.name, 'Benjamin Godard - Victor Hugo')
  assert.equal(response.stations[0]?.bikesAvailable, 25)
  assert.equal(response.stations[0]?.ebikes, 5)
  assert.equal(response.totalStations, 2)
  assert.equal(response.ttl, 3600)
  assert.deepEqual(requestedUrls, [
    'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_information.json',
    'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_status.json',
  ])
})

test('Velib usecase projects no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => jsonResponse(String(input).includes('station_status') ? createStatusFixture() : createInformationFixture())) as typeof fetch
  try {
    const result = await listVelibStations({ query: 'Hôpital', minDocks: 10, limit: 2 })
    assert.equal(result.kind, 'velib.stations')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.stations[0]?.stationCode, '40001')
    assert.equal(result.snapshot.ttl, 3600)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Velib normalizer enforces curated local filters', () => {
  assert.deepEqual(normalizeVelibStationsInput({}), { sort: 'bikes', limit: 100 })
  assert.deepEqual(normalizeVelibStationsInput({ query: ' Bastille ', limit: 20, renting: true }), { sort: 'bikes', limit: 20, query: 'Bastille', renting: true })
  assert.throws(() => normalizeVelibStationsInput({ limit: 501 }), RuntimeFailure)
  assert.throws(() => normalizeVelibStationsInput({ minBikes: -1 }), RuntimeFailure)
  assert.throws(() => normalizeVelibStationsInput({ stationCode: 'bad code!' }), RuntimeFailure)
  assert.throws(() => normalizeVelibStationsInput({ sort: 'distance' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createInformationFixture(): Record<string, unknown> {
  return {
    lastUpdatedOther: 1777913998,
    ttl: 3600,
    data: {
      stations: [
        { station_id: 213688169, stationCode: '16107', name: 'Benjamin Godard - Victor Hugo', lat: 48.865983, lon: 2.275725, capacity: 35, station_opening_hours: null },
        { station_id: 19179944124, stationCode: '40001', name: 'Hôpital Mondor', lat: 48.798922410229, lon: 2.4537451531298, capacity: 28, station_opening_hours: null },
      ],
    },
  }
}

function createStatusFixture(): Record<string, unknown> {
  return {
    lastUpdatedOther: 1777913999,
    ttl: 3600,
    data: {
      stations: [
        { station_id: 213688169, num_bikes_available: 25, num_bikes_available_types: [{ mechanical: 20 }, { ebike: 5 }], num_docks_available: 9, is_installed: 1, is_returning: 1, is_renting: 1, last_reported: 1777910918, stationCode: '16107' },
        { station_id: 19179944124, num_bikes_available: 9, num_bikes_available_types: [{ mechanical: 4 }, { ebike: 5 }], num_docks_available: 19, is_installed: 1, is_returning: 1, is_renting: 1, last_reported: 1777911017, stationCode: '40001' },
      ],
    },
  }
}
