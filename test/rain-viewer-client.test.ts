import assert from 'node:assert/strict'
import test from 'node:test'
import { getRainViewerMaps } from '../src/application/usecases/rainViewer.js'
import { normalizeRainViewerMapsInput, RainViewerClient } from '../src/infrastructure/openApis/rainViewerClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('RainViewer client reads weather maps metadata without fetching tiles', async () => {
  const client = new RainViewerClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.pathname, '/public/weather-maps.json')
      return jsonResponse(createMapsFixture())
    }) as typeof fetch,
  })

  const maps = await client.maps(normalizeRainViewerMapsInput({ limit: 2, latitude: 1, longitude: 2, zoom: 3 }))
  assert.equal(maps.version, '2.0')
  assert.equal(maps.radarPast.length, 2)
  assert.match(maps.radarPast[1]?.tileUrl ?? '', /\/512\/3\/1\.0\/2\.0\/2\/1_0\.png$/)
})

test('RainViewer usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createMapsFixture())) as typeof fetch
  try {
    const result = await getRainViewerMaps({ limit: 1 })
    assert.equal(result.kind, 'rainviewer.maps')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.maps.radarPast.length, 1)
    assert.equal(result.pagination.maxLimit, 13)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('RainViewer normalizer enforces curated tile URL bounds', () => {
  assert.deepEqual(normalizeRainViewerMapsInput({}), { limit: 13, size: 512, zoom: 5, latitude: 37.7749, longitude: -122.4194, color: 2, smooth: true, snow: false })
  assert.throws(() => normalizeRainViewerMapsInput({ limit: 14 }), RuntimeFailure)
  assert.throws(() => normalizeRainViewerMapsInput({ size: 1024 }), RuntimeFailure)
  assert.throws(() => normalizeRainViewerMapsInput({ zoom: 8 }), RuntimeFailure)
  assert.throws(() => normalizeRainViewerMapsInput({ latitude: 91 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createMapsFixture(): Record<string, unknown> {
  return {
    version: '2.0',
    generated: 1777920330,
    host: 'https://tilecache.rainviewer.com',
    radar: {
      past: [
        { time: 1777912800, path: '/v2/radar/a13ac739c26d' },
        { time: 1777920000, path: '/v2/radar/5cb0d794f2da' },
      ],
      nowcast: [],
    },
    satellite: { infrared: [] },
  }
}
