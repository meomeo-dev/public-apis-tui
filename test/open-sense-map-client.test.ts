import assert from 'node:assert/strict'
import test from 'node:test'
import { getOpenSenseMapSensors, getOpenSenseMapStats, listOpenSenseMapBoxes } from '../src/application/usecases/openSenseMap.js'
import { normalizeOpenSenseMapBoxesInput, normalizeOpenSenseMapSensorsInput, OpenSenseMapClient } from '../src/infrastructure/openApis/openSenseMapClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('openSenseMap client reads stats, boxes, and sensors routes without auth', async () => {
  const requestedUrls: string[] = []
  const client = new OpenSenseMapClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url.href)
      if (url.pathname === '/stats') {
        return jsonResponse([16734, 11416106403, 6863])
      }
      if (url.pathname === '/boxes') {
        assert.equal(url.searchParams.get('name'), 'Berlin')
        assert.equal(url.searchParams.get('limit'), '5')
        return jsonResponse([createBoxFixture()])
      }
      assert.equal(url.pathname, '/boxes/5391be52a8341554157792e6/sensors')
      assert.equal(url.searchParams.get('count'), '100')
      return jsonResponse(createBoxFixture())
    }) as typeof fetch,
  })

  const stats = await client.stats({ human: false })
  assert.equal(stats.senseBoxes, 16734)

  const boxes = await client.boxes({ name: 'Berlin', minimal: false, limit: 5 })
  assert.equal(boxes[0]?.name, 'LeKa Berlin')
  assert.equal(boxes[0]?.location?.latitude, 52.54760056249269)

  const sensors = await client.sensors({ boxId: '5391be52a8341554157792e6', count: 100 })
  assert.equal(sensors.sensors[0]?.title, 'Temperatur')
  assert.equal(sensors.sensors[0]?.lastMeasurement?.value, '22.4')
  assert.match(requestedUrls[0] ?? '', /\/stats/)
  assert.match(requestedUrls[1] ?? '', /\/boxes\?/)
  assert.match(requestedUrls[2] ?? '', /\/sensors\?/)
})

test('openSenseMap usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/stats') return jsonResponse([1, 2, 3])
    if (url.pathname === '/boxes') return jsonResponse([createBoxFixture()])
    return jsonResponse(createBoxFixture())
  }) as typeof fetch

  try {
    const stats = await getOpenSenseMapStats({})
    assert.equal(stats.kind, 'opensensemap.stats')
    assert.equal(stats.api.authentication, 'none')
    assert.equal(stats.api.usesBrowserClickstream, false)

    const boxes = await listOpenSenseMapBoxes({ name: 'Berlin', limit: 5 })
    assert.equal(boxes.kind, 'opensensemap.boxes')
    assert.equal(boxes.boxes.length, 1)
    assert.equal(boxes.pagination.maxLimit, 100)

    const sensors = await getOpenSenseMapSensors({})
    assert.equal(sensors.kind, 'opensensemap.sensors')
    assert.equal(sensors.box.sensors.length, 1)
    assert.equal(sensors.pagination.maxCount, 100)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('openSenseMap normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeOpenSenseMapBoxesInput({}), { name: 'Berlin', minimal: false, limit: 5 })
  assert.deepEqual(normalizeOpenSenseMapSensorsInput({}), { boxId: '5391be52a8341554157792e6', count: 100 })
  assert.deepEqual(normalizeOpenSenseMapBoxesInput({ bbox: '7,51,8,52', exposure: 'Outdoor', limit: 10 }), { bbox: '7,51,8,52', exposure: 'outdoor', minimal: false, limit: 10 })
  assert.throws(() => normalizeOpenSenseMapBoxesInput({ bbox: 'bad' }), RuntimeFailure)
  assert.throws(() => normalizeOpenSenseMapBoxesInput({ exposure: 'underwater' }), RuntimeFailure)
  assert.throws(() => normalizeOpenSenseMapBoxesInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeOpenSenseMapSensorsInput({ count: 101 }), RuntimeFailure)
  assert.throws(() => normalizeOpenSenseMapSensorsInput({ boxId: 'bad' }), RuntimeFailure)
})

test('openSenseMap boxes applies the local output limit even when upstream ignores it', async () => {
  const client = new OpenSenseMapClient({
    fetchImpl: (async () => jsonResponse([createBoxFixture(), { ...createBoxFixture(), _id: '5391be52a8341554157792e7', name: 'Second Berlin box' }])) as typeof fetch,
  })

  const boxes = await client.boxes({ name: 'Berlin', minimal: false, limit: 1 })
  assert.equal(boxes.length, 1)
  assert.equal(boxes[0]?.name, 'LeKa Berlin')
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

function createBoxFixture(): Record<string, unknown> {
  return {
    _id: '5391be52a8341554157792e6',
    name: 'LeKa Berlin',
    exposure: 'outdoor',
    model: 'homeWifi',
    currentLocation: {
      coordinates: [13.42761039733887, 52.54760056249269],
      type: 'Point',
      timestamp: '2014-06-06T13:12:50.000Z',
    },
    sensors: [
      {
        _id: '5391be52a8341554157792eb',
        sensorType: 'BMP085',
        title: 'Temperatur',
        unit: '°C',
        lastMeasurement: { createdAt: '2024-10-16T02:32:18.156Z', value: '22.4' },
      },
    ],
    lastMeasurementAt: '2024-10-16T02:32:18.156Z',
  }
}
