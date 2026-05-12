import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSunriseSunsetTimes,
  normalizeSunriseSunsetInput,
} from '../src/application/usecases/sunriseSunset.js'
import {
  SunriseSunsetClient,
} from '../src/infrastructure/openApis/sunriseSunsetClient.js'

test('Sunrise-Sunset client calls documented no-auth JSON endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new SunriseSunsetClient({
    baseUrl: 'https://api.sunrise-sunset.test',
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createSunriseSunsetFixture())
    }) as typeof fetch,
  })

  const response = await client.getTimes({
    latitude: 36.72016,
    longitude: -4.42034,
    date: '2026-05-11',
    tzid: 'UTC',
  })

  assert.equal(requestedUrl?.pathname, '/json')
  assert.equal(requestedUrl?.searchParams.get('lat'), '36.72016')
  assert.equal(requestedUrl?.searchParams.get('lng'), '-4.42034')
  assert.equal(requestedUrl?.searchParams.get('date'), '2026-05-11')
  assert.equal(requestedUrl?.searchParams.get('formatted'), '0')
  assert.equal(requestedUrl?.searchParams.get('tzid'), 'UTC')
  assert.equal(requestedUrl?.searchParams.has('callback'), false)
  assert.equal(response.status, 'OK')
  assert.equal(response.results.dayLengthSeconds, 50631)
})

test('Sunrise-Sunset usecase projects bounded no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createSunriseSunsetFixture())) as
    typeof fetch

  try {
    const result = await getSunriseSunsetTimes({
      latitude: 36.72016,
      longitude: -4.42034,
      date: '2026-05-11',
      tzid: 'Europe/Madrid',
    })
    assert.equal(result.kind, 'sunrisesunset.times')
    assert.equal(result.api.provider, 'sunrisesunset')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.attributionRequired, true)
    assert.equal(result.query.tzid, 'Europe/Madrid')
    assert.match(result.api.boundary, /JSONP/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Sunrise-Sunset normalizer rejects unsafe or unstable parameters', () => {
  assert.deepEqual(normalizeSunriseSunsetInput({}), {
    latitude: 36.72016,
    longitude: -4.42034,
    date: '2026-05-11',
    tzid: 'UTC',
  })
  assert.throws(
    () => normalizeSunriseSunsetInput({ latitude: 91 }),
    /--latitude must be a number from -90 to 90/u,
  )
  assert.throws(
    () => normalizeSunriseSunsetInput({ longitude: -181 }),
    /--longitude must be a number from -180 to 180/u,
  )
  assert.throws(
    () => normalizeSunriseSunsetInput({ date: 'tomorrow' }),
    /--date must use YYYY-MM-DD format/u,
  )
  assert.throws(
    () => normalizeSunriseSunsetInput({ date: '2026-02-30' }),
    /real Gregorian date/u,
  )
  assert.throws(
    () => normalizeSunriseSunsetInput({ tzid: '../secret' }),
    /safe timezone identifier/u,
  )
  assert.throws(
    () => normalizeSunriseSunsetInput({ tzid: 'Invalid/Zone' }),
    /valid timezone identifier/u,
  )
})

test('Sunrise-Sunset client rejects provider errors and malformed JSON', async () => {
  const providerErrorClient = new SunriseSunsetClient({
    fetchImpl: (async () => jsonResponse({
      results: {},
      status: 'INVALID_TZID',
      tzid: 'UTC',
    })) as typeof fetch,
  })
  await assert.rejects(
    () => providerErrorClient.getTimes(normalizeSunriseSunsetInput()),
    /INVALID_TZID/u,
  )

  const malformedClient = new SunriseSunsetClient({
    fetchImpl: (async () => new Response('<html></html>', {
      headers: { 'content-type': 'text/html' },
    })) as typeof fetch,
  })
  await assert.rejects(
    () => malformedClient.getTimes(normalizeSunriseSunsetInput()),
    /response was not JSON/u,
  )
})

test('Sunrise-Sunset client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new SunriseSunsetClient({
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
    () => client.getTimes(normalizeSunriseSunsetInput()),
    /Cloudflare challenge HTML page/u,
  )
})

function createSunriseSunsetFixture(): Record<string, unknown> {
  return {
    results: {
      sunrise: '2026-05-11T05:12:08+00:00',
      sunset: '2026-05-11T19:15:59+00:00',
      solar_noon: '2026-05-11T12:14:04+00:00',
      day_length: 50631,
      civil_twilight_begin: '2026-05-11T04:45:00+00:00',
      civil_twilight_end: '2026-05-11T19:43:07+00:00',
      nautical_twilight_begin: '2026-05-11T04:10:13+00:00',
      nautical_twilight_end: '2026-05-11T20:17:55+00:00',
      astronomical_twilight_begin: '2026-05-11T03:32:47+00:00',
      astronomical_twilight_end: '2026-05-11T20:55:21+00:00',
    },
    status: 'OK',
    tzid: 'UTC',
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
