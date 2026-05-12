import assert from 'node:assert/strict'
import test from 'node:test'
import { listPm25OpenDataAirbox, listPm25OpenDataLass } from '../src/application/usecases/pm25OpenData.js'
import { Pm25OpenDataClient, normalizePm25OpenDataAirboxInput, normalizePm25OpenDataLassInput } from '../src/infrastructure/openApis/pm25OpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('PM2.5 Open Data client reads AirBox and LASS feed JSON', async () => {
  const client = new Pm25OpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      return jsonResponse(url.pathname.endsWith('last-all-airbox.json') ? createFeedFixture('airbox') : createFeedFixture('lass'))
    }) as typeof fetch,
  })

  const airbox = await client.listAirbox({ limit: 2 })
  assert.equal(airbox.feeds[0]?.deviceId, '74DA38F7C63C')
  assert.equal(airbox.feeds[0]?.pm25, 23)

  const lass = await client.listLass({ limit: 1 })
  assert.equal(lass.feeds[0]?.deviceId, 'WF_8629500')
})

test('PM2.5 Open Data usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('last-all-airbox.json') ? createFeedFixture('airbox') : createFeedFixture('lass'))
  }) as typeof fetch

  try {
    const airbox = await listPm25OpenDataAirbox({ limit: 2 })
    assert.equal(airbox.kind, 'pm25opendata.airbox')
    assert.equal(airbox.api.authentication, 'none')
    assert.equal(airbox.api.usesBrowserClickstream, false)
    assert.equal(airbox.pagination.maxLimit, 506)
    assert.equal(airbox.summary.maxPm25, 23)

    const lass = await listPm25OpenDataLass({ limit: 1 })
    assert.equal(lass.kind, 'pm25opendata.lass')
    assert.equal(lass.api.authentication, 'none')
    assert.equal(lass.api.usesBrowserClickstream, false)
    assert.equal(lass.pagination.maxLimit, 10)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('PM2.5 Open Data normalizers enforce observed caps', () => {
  assert.deepEqual(normalizePm25OpenDataAirboxInput({}), { limit: 506 })
  assert.deepEqual(normalizePm25OpenDataLassInput({}), { limit: 10 })
  assert.throws(() => normalizePm25OpenDataAirboxInput({ limit: 507 }), RuntimeFailure)
  assert.throws(() => normalizePm25OpenDataLassInput({ limit: 11 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createFeedFixture(source: 'airbox' | 'lass'): Record<string, unknown> {
  return {
    source: `last-all-${source} by IIS-NRL`,
    num_of_records: source === 'airbox' ? 506 : 10,
    feeds: source === 'airbox'
      ? [
        { SiteName: '新北市文林國小(2018)', app: 'AirBox', area: 'new_taipei', date: '2026-05-03', time: '23:18:42', gps_lat: 24.998, gps_lon: 121.425, s_d0: 23, s_d1: 29, s_t0: 18.87, s_h0: 100, timestamp: '2026-05-03T23:18:42Z', device_id: '74DA38F7C63C' },
        { SiteName: '市立信義國小(2018)', app: 'AirBox', area: 'taipei', date: '2026-05-03', time: '23:18:23', gps_lat: 25.031, gps_lon: 121.563, s_d0: 0, s_d1: 0, s_t0: 19, s_h0: 90, timestamp: '2026-05-03T23:18:23Z', device_id: '74DA38F7C63D' },
      ]
      : [
        { app: 'PM25', date: '2026-05-03', time: '23:24:21', gps_lat: 0, gps_lon: 0, s_d0: 19, s_d1: 20, s_t0: 22.9, s_h0: 64.8, timestamp: '2026-05-03T23:24:21Z', device_id: 'WF_8629500' },
      ],
  }
}
