import assert from 'node:assert/strict'
import test from 'node:test'
import { getOpenMeteoForecast, searchOpenMeteoLocations } from '../src/application/usecases/openMeteo.js'
import { normalizeOpenMeteoForecastInput, normalizeOpenMeteoGeocodingInput, OpenMeteoClient } from '../src/infrastructure/openApis/openMeteoClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open-Meteo client reads forecast and geocoding JSON', async () => {
  const client = new OpenMeteoClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.hostname === 'api.open-meteo.com') {
        assert.equal(url.searchParams.get('forecast_days'), '16')
        assert.equal(url.searchParams.get('timezone'), 'auto')
        return jsonResponse(createForecastFixture())
      }
      assert.equal(url.searchParams.get('name'), 'Berlin')
      assert.equal(url.searchParams.get('count'), '2')
      return jsonResponse(createGeocodingFixture())
    }) as typeof fetch,
  })

  const forecast = await client.getForecast({ latitude: 52.52, longitude: 13.41, forecastDays: 16, timezone: 'auto' })
  assert.equal(forecast.timezone, 'Europe/Berlin')
  assert.equal(forecast.current.temperature_2m, 21.4)

  const locations = await client.searchLocations({ name: 'Berlin', count: 2, language: 'en' })
  assert.equal(locations[0]?.name, 'Berlin')
  assert.equal(locations[0]?.countryCode, 'DE')
})

test('Open-Meteo usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.hostname === 'api.open-meteo.com' ? createForecastFixture() : createGeocodingFixture())
  }) as typeof fetch

  try {
    const forecast = await getOpenMeteoForecast({ latitude: 52.52, longitude: 13.41, forecastDays: 16 })
    assert.equal(forecast.kind, 'openmeteo.forecast')
    assert.equal(forecast.api.authentication, 'none')
    assert.equal(forecast.api.usesBrowserClickstream, false)
    assert.equal(forecast.pagination.maxForecastDays, 16)
    assert.equal(forecast.location.timezone, 'Europe/Berlin')

    const geocoding = await searchOpenMeteoLocations({ name: 'Berlin', count: 2 })
    assert.equal(geocoding.kind, 'openmeteo.geocoding')
    assert.equal(geocoding.api.authentication, 'none')
    assert.equal(geocoding.api.usesBrowserClickstream, false)
    assert.equal(geocoding.pagination.maxCount, 100)
    assert.equal(geocoding.locations[0]?.timezone, 'Europe/Berlin')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open-Meteo normalizers enforce bounds', () => {
  assert.deepEqual(normalizeOpenMeteoForecastInput({}), { latitude: 52.52, longitude: 13.41, forecastDays: 16, timezone: 'auto' })
  assert.deepEqual(normalizeOpenMeteoGeocodingInput({}), { name: 'Berlin', count: 100, language: 'en' })
  assert.deepEqual(normalizeOpenMeteoGeocodingInput({ name: ' Paris ', count: 1, language: 'FR', countryCode: 'fr' }), { name: 'Paris', count: 1, language: 'fr', countryCode: 'FR' })
  assert.throws(() => normalizeOpenMeteoForecastInput({ latitude: 91 }), RuntimeFailure)
  assert.throws(() => normalizeOpenMeteoForecastInput({ forecastDays: 17 }), RuntimeFailure)
  assert.throws(() => normalizeOpenMeteoForecastInput({ timezone: '   ' }), RuntimeFailure)
  assert.throws(() => normalizeOpenMeteoGeocodingInput({ name: '   ' }), RuntimeFailure)
  assert.throws(() => normalizeOpenMeteoGeocodingInput({ language: '   ' }), RuntimeFailure)
  assert.throws(() => normalizeOpenMeteoGeocodingInput({ countryCode: '   ' }), RuntimeFailure)
  assert.throws(() => normalizeOpenMeteoGeocodingInput({ count: 101 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createForecastFixture(): Record<string, unknown> {
  return {
    latitude: 52.52,
    longitude: 13.42,
    generationtime_ms: 0.05,
    utc_offset_seconds: 7200,
    timezone: 'Europe/Berlin',
    timezone_abbreviation: 'GMT+2',
    elevation: 38,
    current_units: { time: 'iso8601', temperature_2m: '°C', wind_speed_10m: 'km/h', weather_code: 'wmo code' },
    current: { time: '2026-05-03T23:15', temperature_2m: 21.4, wind_speed_10m: 4.4, weather_code: 3 },
    daily_units: { time: 'iso8601', temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_sum: 'mm' },
    daily: { time: ['2026-05-03', '2026-05-04'], temperature_2m_max: [28.4, 22.1], temperature_2m_min: [11.2, 10.1], precipitation_sum: [0, 1.2] },
  }
}

function createGeocodingFixture(): Record<string, unknown> {
  return {
    results: [
      { id: 2950159, name: 'Berlin', latitude: 52.52437, longitude: 13.41053, elevation: 74, feature_code: 'PPLC', country_code: 'DE', timezone: 'Europe/Berlin', population: 3426354, country: 'Germany', admin1: 'State of Berlin', postcodes: ['10967'] },
      { id: 5083330, name: 'Berlin', latitude: 44.46867, longitude: -71.18508, country_code: 'US', timezone: 'America/New_York', population: 10051, country: 'United States', admin1: 'New Hampshire' },
    ],
  }
}
