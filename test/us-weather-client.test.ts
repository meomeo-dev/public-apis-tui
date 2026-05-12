import assert from 'node:assert/strict'
import test from 'node:test'
import { getUsWeatherForecast, getUsWeatherPoint } from '../src/application/usecases/usWeather.js'
import { normalizeUsWeatherForecastInput, normalizeUsWeatherPointsInput, UsWeatherClient, US_WEATHER_USER_AGENT } from '../src/infrastructure/openApis/usWeatherClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('US Weather client reads point and forecast with required User-Agent', async () => {
  const client = new UsWeatherClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal((init?.headers as Record<string, string>)['user-agent'], US_WEATHER_USER_AGENT)
      if (url.pathname.startsWith('/points/')) {
        return jsonResponse(createPointFixture())
      }
      assert.equal(url.pathname, '/gridpoints/LWX/97,71/forecast')
      return jsonResponse(createForecastFixture())
    }) as typeof fetch,
  })

  const point = await client.getPoint({ latitude: 38.8894, longitude: -77.0352 })
  assert.equal(point.office, 'LWX')
  assert.equal(point.relativeLocation.city, 'Washington')

  const forecast = await client.getForecast({ office: 'LWX', gridX: 97, gridY: 71, limit: 1 })
  assert.equal(forecast.periods.length, 1)
  assert.equal(forecast.periods[0]?.shortForecast, 'Sunny')
})

test('US Weather usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.startsWith('/points/') ? createPointFixture() : createForecastFixture())
  }) as typeof fetch

  try {
    const point = await getUsWeatherPoint({ latitude: 38.8894, longitude: -77.0352 })
    assert.equal(point.kind, 'usweather.point')
    assert.equal(point.api.authentication, 'none')
    assert.equal(point.api.usesBrowserClickstream, false)
    assert.equal(point.point.office, 'LWX')

    const forecast = await getUsWeatherForecast({ office: 'LWX', gridX: 97, gridY: 71, limit: 2 })
    assert.equal(forecast.kind, 'usweather.forecast')
    assert.equal(forecast.api.authentication, 'none')
    assert.equal(forecast.api.usesBrowserClickstream, false)
    assert.equal(forecast.pagination.maxLimit, 14)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('US Weather normalizers enforce bounds', () => {
  assert.deepEqual(normalizeUsWeatherPointsInput({}), { latitude: 38.8894, longitude: -77.0352 })
  assert.deepEqual(normalizeUsWeatherForecastInput({}), { office: 'LWX', gridX: 97, gridY: 71, limit: 14 })
  assert.throws(() => normalizeUsWeatherPointsInput({ latitude: 100 }), RuntimeFailure)
  assert.throws(() => normalizeUsWeatherForecastInput({ office: '??' }), RuntimeFailure)
  assert.throws(() => normalizeUsWeatherForecastInput({ limit: 15 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/geo+json' } })
}

function createPointFixture(): Record<string, unknown> {
  return {
    id: 'https://api.weather.gov/points/38.8894,-77.0352',
    properties: {
      gridId: 'LWX',
      gridX: 97,
      gridY: 71,
      forecast: 'https://api.weather.gov/gridpoints/LWX/97,71/forecast',
      forecastHourly: 'https://api.weather.gov/gridpoints/LWX/97,71/forecast/hourly',
      forecastGridData: 'https://api.weather.gov/gridpoints/LWX/97,71',
      observationStations: 'https://api.weather.gov/gridpoints/LWX/97,71/stations',
      timeZone: 'America/New_York',
      radarStation: 'KLWX',
      relativeLocation: { properties: { city: 'Washington', state: 'DC' } },
    },
  }
}

function createForecastFixture(): Record<string, unknown> {
  return {
    properties: {
      units: 'us',
      generatedAt: '2026-05-03T21:00:00+00:00',
      periods: [
        {
          number: 1,
          name: 'This Afternoon',
          startTime: '2026-05-03T17:00:00-04:00',
          endTime: '2026-05-03T18:00:00-04:00',
          isDaytime: true,
          temperature: 64,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 0 },
          windSpeed: '13 mph',
          windDirection: 'NW',
          shortForecast: 'Sunny',
          detailedForecast: 'Sunny, with a high near 64.',
        },
        {
          number: 2,
          name: 'Tonight',
          isDaytime: false,
          temperature: 52,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 10 },
          windSpeed: '5 mph',
          windDirection: 'NW',
          shortForecast: 'Mostly Clear',
        },
      ],
    },
  }
}
