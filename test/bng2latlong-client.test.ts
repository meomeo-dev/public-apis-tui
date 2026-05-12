import assert from 'node:assert/strict'
import test from 'node:test'
import { convertBng2LatLong } from '../src/application/usecases/bng2LatLong.js'
import { Bng2LatLongClient, normalizeBng2LatLongInput } from '../src/infrastructure/openApis/bng2LatLongClient.js'

test('bng2latlong client calls JSON conversion endpoint', async () => {
  const requests: string[] = []
  const client = new Bng2LatLongClient({
    baseUrl: 'https://api.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse({ status: 'ok', easting: 319421, northing: 174588, latitude: 51.4645, longitude: -3.16134 })
    }) as typeof fetch,
  })

  const conversion = await client.convert({ easting: 319421, northing: 174588 })

  assert.deepEqual(requests, ['https://api.test/bng2latlong/319421/174588/json'])
  assert.equal(conversion.latitude, 51.4645)
  assert.equal(conversion.longitude, -3.16134)
})

test('bng2latlong usecase projects conversion metadata for TUI', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://api.getthedata.com/bng2latlong/319421/174588/json')
    return jsonResponse({ status: 'ok', easting: 319421, northing: 174588, latitude: 51.4645, longitude: -3.16134 })
  }) as typeof fetch
  try {
    const result = await convertBng2LatLong({ easting: 319421, northing: 174588 })
    assert.equal(result.kind, 'bng2latlong.convert')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.conversion.latitude, 51.4645)
    assert.equal(result.bounds.maxEasting, 999_999)
    assert.equal(result.bounds.maxNorthing, 9_999_999)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bng2latlong normalizer enforces positive integer coordinate bounds', () => {
  assert.deepEqual(normalizeBng2LatLongInput({ easting: 1, northing: 1 }), { easting: 1, northing: 1 })
  assert.deepEqual(normalizeBng2LatLongInput({ easting: 999_999, northing: 9_999_999 }), { easting: 999_999, northing: 9_999_999 })
  assert.deepEqual(normalizeBng2LatLongInput({}), { easting: 319421, northing: 174588 })
  assert.throws(() => normalizeBng2LatLongInput({ easting: 0 }), /positive integer/u)
  assert.throws(() => normalizeBng2LatLongInput({ easting: 1_000_000 }), /999999/u)
  assert.throws(() => normalizeBng2LatLongInput({ northing: 10_000_000 }), /9999999/u)
})

test('bng2latlong client surfaces provider JSON errors', async () => {
  const client = new Bng2LatLongClient({
    fetchImpl: (async () => jsonResponse({ status: 'error', error: 'Both <easting> and <northing> must be provided.' })) as typeof fetch,
  })
  await assert.rejects(() => client.convert({ easting: 319421, northing: 174588 }), /must be provided/u)
})

test('bng2latlong client explains Cloudflare HTML challenges', async () => {
  const client = new Bng2LatLongClient({
    fetchImpl: (async () => new Response('<!DOCTYPE html><title>Just a moment...</title>', {
      status: 403,
      headers: { 'content-type': 'text/html; charset=UTF-8', 'server': 'cloudflare', 'cf-mitigated': 'challenge' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.convert({ easting: 319421, northing: 174588 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
