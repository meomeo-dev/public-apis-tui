import assert from 'node:assert/strict'
import test from 'node:test'
import { listOpenSkyStates } from '../src/application/usecases/openSky.js'
import { OpenSkyClient, normalizeOpenSkyStatesInput } from '../src/infrastructure/openApis/openSkyClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('OpenSky client reads anonymous state vectors and rate-limit headers', async () => {
  let requestedUrl = ''
  const client = new OpenSkyClient({
    fetchImpl: (async input => {
      requestedUrl = String(input)
      return jsonResponse(createStatesFixture(), { 'x-rate-limit-remaining': '399' })
    }) as typeof fetch,
  })

  const result = await client.states({ lamin: 45.8, lomin: -124, lamax: 49.2, lomax: -116, icao24: 'ad5621', extended: true, limit: 1 })
  const url = new URL(requestedUrl)
  assert.equal(url.pathname, '/api/states/all')
  assert.equal(url.searchParams.get('lamin'), '45.8')
  assert.equal(url.searchParams.get('lomin'), '-124')
  assert.equal(url.searchParams.get('lamax'), '49.2')
  assert.equal(url.searchParams.get('lomax'), '-116')
  assert.equal(url.searchParams.get('icao24'), 'ad5621')
  assert.equal(url.searchParams.get('extended'), 'true')
  assert.equal(result.time, 1_777_907_971)
  assert.equal(result.rateLimit.remaining, '399')
  assert.equal(result.states.length, 1)
  assert.equal(result.states[0]?.callsign, 'ALFT')
  assert.equal(result.states[0]?.originCountry, 'United States')
})

test('OpenSky usecase projects no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createStatesFixture(), { 'x-rate-limit-remaining': '398' })) as typeof fetch
  try {
    const result = await listOpenSkyStates({ lamin: 45.8, lomin: -124, lamax: 49.2, lomax: -116, limit: 2 })
    assert.equal(result.kind, 'opensky.states')
    assert.equal(result.api.provider, 'opensky')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.limit, 2)
    assert.equal(result.count, 2)
    assert.equal(result.rateLimit.remaining, '398')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('OpenSky normalizer enforces bbox, ICAO24, time, and limit bounds', () => {
  assert.deepEqual(normalizeOpenSkyStatesInput({}), { lamin: 45.8, lomin: -124, lamax: 49.2, lomax: -116, limit: 100 })
  assert.deepEqual(normalizeOpenSkyStatesInput({ icao24: 'AD5621', time: 1, extended: false, limit: 1 }).icao24, 'ad5621')
  assert.throws(() => normalizeOpenSkyStatesInput({ lamin: 50, lamax: 40 }), RuntimeFailure)
  assert.throws(() => normalizeOpenSkyStatesInput({ lomin: 10, lomax: -10 }), RuntimeFailure)
  assert.throws(() => normalizeOpenSkyStatesInput({ icao24: 'xyz' }), RuntimeFailure)
  assert.throws(() => normalizeOpenSkyStatesInput({ time: -1 }), RuntimeFailure)
  assert.throws(() => normalizeOpenSkyStatesInput({ limit: 501 }), RuntimeFailure)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function createStatesFixture(): Record<string, unknown> {
  return {
    time: 1_777_907_971,
    states: [
      ['ad5621', 'ALFT    ', 'United States', 1_777_907_970, 1_777_907_970, -123.1804, 48.0225, 792.48, false, 65.29, 300.81, -1.63, null, 762, null, false, 0],
      ['a7bc8e', 'EJA598  ', 'United States', 1_777_907_971, 1_777_907_971, -122.8695, 46.3485, 8595.36, false, 216.72, 357.96, -9.43, null, 8778.24, '3367', false, 0],
    ],
  }
}
