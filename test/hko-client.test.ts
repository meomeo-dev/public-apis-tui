import assert from 'node:assert/strict'
import test from 'node:test'
import { getHkoCurrent, getHkoForecast } from '../src/application/usecases/hko.js'
import { HkoClient, normalizeHkoCurrentInput, normalizeHkoForecastInput } from '../src/infrastructure/openApis/hkoClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('HKO client reads current weather and forecast feeds', async () => {
  const requestedUrls: string[] = []
  const client = new HkoClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url.href)
      assert.equal(url.pathname, '/weatherAPI/opendata/weather.php')
      if (url.searchParams.get('dataType') === 'rhrread') {
        assert.equal(url.searchParams.get('lang'), 'en')
        return jsonResponse(createCurrentFixture())
      }
      assert.equal(url.searchParams.get('dataType'), 'fnd')
      assert.equal(url.searchParams.get('lang'), 'tc')
      return jsonResponse(createForecastFixture())
    }) as typeof fetch,
  })

  const current = await client.getCurrent({ lang: 'en', limit: 100 })
  assert.equal(current.temperature.data[0]?.place, 'Hong Kong Observatory')
  assert.equal(current.rainfall.data.length, 2)

  const forecast = await client.getForecast({ lang: 'tc', limit: 9 })
  assert.equal(forecast.forecasts.length, 2)
  assert.equal(forecast.forecasts[0]?.forecastMaxTemp?.value, 24)
  assert.match(requestedUrls[0] ?? '', /dataType=rhrread/)
  assert.match(requestedUrls[1] ?? '', /dataType=fnd/)
})

test('HKO usecases project TUI-ready JSON without auth or browser clickstream', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.searchParams.get('dataType') === 'rhrread' ? createCurrentFixture() : createForecastFixture())
  }) as typeof fetch

  try {
    const current = await getHkoCurrent({ station: 'Observatory', limit: 10 })
    assert.equal(current.kind, 'hko.current')
    assert.equal(current.api.authentication, 'none')
    assert.equal(current.api.usesBrowserClickstream, false)
    assert.equal(current.current.temperature.data.length, 1)
    assert.equal(current.pagination.maxLimit, 100)

    const forecast = await getHkoForecast({ limit: 1 })
    assert.equal(forecast.kind, 'hko.forecast')
    assert.equal(forecast.api.provider, 'hko')
    assert.equal(forecast.api.authentication, 'none')
    assert.equal(forecast.api.usesBrowserClickstream, false)
    assert.equal(forecast.forecasts.length, 1)
    assert.equal(forecast.pagination.maxLimit, 9)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('HKO normalizers enforce language and limit bounds', () => {
  assert.deepEqual(normalizeHkoCurrentInput({}), { lang: 'en', limit: 100 })
  assert.deepEqual(normalizeHkoForecastInput({}), { lang: 'en', limit: 9 })
  assert.deepEqual(normalizeHkoCurrentInput({ lang: 'TC', station: '  Tai Po ', limit: 5 }), { lang: 'tc', limit: 5, station: 'Tai Po' })
  assert.throws(() => normalizeHkoCurrentInput({ lang: 'fr' }), RuntimeFailure)
  assert.throws(() => normalizeHkoCurrentInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeHkoForecastInput({ limit: 10 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

function createCurrentFixture(): Record<string, unknown> {
  return {
    rainfall: {
      data: [
        { unit: 'mm', place: 'Central & Western District', max: 1, main: 'FALSE' },
        { unit: 'mm', place: 'Wan Chai', max: 0, main: 'TRUE' },
      ],
      startTime: '2026-05-05T00:00:00+08:00',
      endTime: '2026-05-05T01:00:00+08:00',
    },
    icon: [62],
    iconUpdateTime: '2026-05-04T18:00:00+08:00',
    uvindex: '',
    updateTime: '2026-05-05T01:02:00+08:00',
    temperature: {
      data: [
        { place: 'Hong Kong Observatory', value: 23, unit: 'C' },
        { place: 'Tai Po', value: 22, unit: 'C' },
      ],
      recordTime: '2026-05-05T01:00:00+08:00',
    },
    humidity: {
      recordTime: '2026-05-05T01:00:00+08:00',
      data: [{ unit: 'percent', value: 80, place: 'Hong Kong Observatory' }],
    },
    warningMessage: '',
    tcmessage: '',
  }
}

function createForecastFixture(): Record<string, unknown> {
  return {
    generalSituation: 'The northeast monsoon will continue to bring slightly cooler weather.',
    updateTime: '2026-05-05T00:00:00+08:00',
    weatherForecast: [
      {
        forecastDate: '20260505',
        week: 'Tuesday',
        forecastWind: 'East force 4 to 5.',
        forecastWeather: 'Mainly cloudy with occasional showers.',
        forecastMaxtemp: { value: 24, unit: 'C' },
        forecastMintemp: { value: 21, unit: 'C' },
        forecastMaxrh: { value: 95, unit: 'percent' },
        forecastMinrh: { value: 80, unit: 'percent' },
        ForecastIcon: 63,
        PSR: 'Medium High',
      },
      {
        forecastDate: '20260506',
        week: 'Wednesday',
        forecastWind: 'East force 4.',
        forecastWeather: 'Bright periods during the day.',
        forecastMaxtemp: { value: 27, unit: 'C' },
        forecastMintemp: { value: 23, unit: 'C' },
        forecastMaxrh: { value: 90, unit: 'percent' },
        forecastMinrh: { value: 70, unit: 'percent' },
        ForecastIcon: 52,
        PSR: 'Low',
      },
    ],
  }
}
