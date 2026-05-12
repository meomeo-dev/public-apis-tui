import assert from 'node:assert/strict'
import test from 'node:test'
import { getAviationWeatherMetar, getAviationWeatherTaf } from '../src/application/usecases/aviationWeather.js'
import { AviationWeatherClient, normalizeAviationWeatherMetarInput, normalizeAviationWeatherTafInput } from '../src/infrastructure/openApis/aviationWeatherClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('AviationWeather client reads METAR and TAF JSON without auth', async () => {
  const requestedUrls: string[] = []
  const client = new AviationWeatherClient({
    fetchImpl: (async input => {
      requestedUrls.push(String(input))
      return jsonResponse(String(input).includes('/taf?') ? createTafFixture() : createMetarFixture())
    }) as typeof fetch,
  })

  const metar = await client.metar({ ids: 'KSFO', hours: 2, limit: 1 })
  assert.equal(metar.reports[0]?.icaoId, 'KSFO')
  assert.equal(metar.reports[0]?.flightCategory, 'MVFR')
  assert.equal(metar.cachePolicy.cacheControl, 'max-age=90')

  const taf = await client.taf({ ids: 'KSFO', limit: 1 })
  assert.equal(taf.reports[0]?.icaoId, 'KSFO')
  assert.equal(taf.reports[0]?.forecastCount, 1)
  assert.match(requestedUrls[0] ?? '', /^https:\/\/aviationweather\.gov\/api\/data\/metar\?/)
  assert.match(requestedUrls[1] ?? '', /^https:\/\/aviationweather\.gov\/api\/data\/taf\?/)
})

test('AviationWeather usecases project no-auth TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => jsonResponse(String(input).includes('/taf?') ? createTafFixture() : createMetarFixture())) as typeof fetch
  try {
    const metar = await getAviationWeatherMetar({ ids: 'ksfo', limit: 1 })
    assert.equal(metar.kind, 'aviationweather.metar')
    assert.equal(metar.api.authentication, 'none')
    assert.equal(metar.api.usesBrowserClickstream, false)
    assert.equal(metar.query.ids, 'KSFO')

    const taf = await getAviationWeatherTaf({ ids: 'ksfo', limit: 1 })
    assert.equal(taf.kind, 'aviationweather.taf')
    assert.equal(taf.api.authentication, 'none')
    assert.equal(taf.api.usesBrowserClickstream, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AviationWeather client treats HTTP 204 as an empty report list', async () => {
  const client = new AviationWeatherClient({
    fetchImpl: (async () =>
      new Response(null, {
        status: 204,
        headers: { 'cache-control': 'max-age=60' },
      })) as typeof fetch,
  })

  const metar = await client.metar({ ids: 'ZZZZ', limit: 10 })
  assert.deepEqual(metar.reports, [])
  assert.equal(metar.cachePolicy.cacheControl, 'max-age=60')

  const taf = await client.taf({ ids: 'ZZZZ', limit: 10 })
  assert.deepEqual(taf.reports, [])
  assert.equal(taf.cachePolicy.cacheControl, 'max-age=60')
})

test('AviationWeather normalizers enforce curated ids and bounds', () => {
  assert.deepEqual(normalizeAviationWeatherMetarInput({}), { ids: 'KSFO', limit: 10 })
  assert.deepEqual(normalizeAviationWeatherTafInput({ ids: 'ksfo,kjfk', limit: 2 }), { ids: 'KSFO,KJFK', limit: 2 })
  assert.throws(() => normalizeAviationWeatherMetarInput({ ids: 'not a station' }), RuntimeFailure)
  assert.throws(() => normalizeAviationWeatherMetarInput({ hours: 49 }), RuntimeFailure)
  assert.throws(() => normalizeAviationWeatherTafInput({ limit: 101 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'max-age=90', etag: 'W/"fixture"' },
  })
}

function createMetarFixture(): Array<Record<string, unknown>> {
  return [{
    icaoId: 'KSFO',
    receiptTime: '2026-05-04T17:00:10.914Z',
    obsTime: 1777913760,
    reportTime: '2026-05-04T17:00:00.000Z',
    temp: 15.6,
    dewp: 8.3,
    wdir: 300,
    wspd: 5,
    visib: '10+',
    altim: 1015.3,
    rawOb: 'METAR KSFO 041656Z 30005KT 10SM FEW009 BKN026 16/08 A2998',
    lat: 37.6196,
    lon: -122.3656,
    name: 'San Francisco Intl, CA, US',
    fltCat: 'MVFR',
  }]
}

function createTafFixture(): Array<Record<string, unknown>> {
  return [{
    icaoId: 'KSFO',
    issueTime: '2026-05-04T14:59:00.000Z',
    validTimeFrom: 1777906800,
    validTimeTo: 1778004000,
    rawTAF: 'TAF KSFO 041459Z 0415/0518 00000KT P6SM FEW009 SCT022',
    name: 'San Francisco Intl',
    fcsts: [{ timeFrom: 1777906800, timeTo: 1777921200 }],
  }]
}
