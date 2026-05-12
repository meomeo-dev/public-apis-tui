import assert from 'node:assert/strict'
import test from 'node:test'
import { getEpaUvDaily, getEpaUvHourly } from '../src/application/usecases/epa.js'
import { EpaClient, normalizeEpaUvDailyInput, normalizeEpaUvHourlyInput } from '../src/infrastructure/openApis/epaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('EPA client reads hourly and daily UV JSON forecasts', async () => {
  const client = new EpaClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.includes('getEnvirofactsUVHOURLY')) {
        assert.equal(url.pathname, '/dmapservice/getEnvirofactsUVHOURLY/ZIP/20050/JSON')
        return jsonResponse(createHourlyFixture())
      }
      assert.equal(url.pathname, '/dmapservice/getEnvirofactsUVDAILY/ZIP/20050/JSON')
      return jsonResponse(createDailyFixture())
    }) as typeof fetch,
  })

  const hourly = await client.getUvHourly({ zip: '20050', limit: 21 })
  assert.equal(hourly[0]?.city, 'Washington')
  assert.equal(hourly[0]?.uvValue, 0)

  const daily = await client.getUvDaily({ zip: '20050' })
  assert.equal(daily[0]?.uvIndex, 7)
  assert.equal(daily[0]?.uvAlert, false)
})

test('EPA usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.includes('HOURLY') ? createHourlyFixture() : createDailyFixture())
  }) as typeof fetch

  try {
    const hourly = await getEpaUvHourly({ zip: '20050' })
    assert.equal(hourly.kind, 'epa.uvHourly')
    assert.equal(hourly.api.authentication, 'none')
    assert.equal(hourly.api.usesBrowserClickstream, false)
    assert.equal(hourly.pagination.maxLimit, 21)
    assert.equal(hourly.forecasts[0]?.city, 'Washington')

    const daily = await getEpaUvDaily({ zip: '20050' })
    assert.equal(daily.kind, 'epa.uvDaily')
    assert.equal(daily.api.authentication, 'none')
    assert.equal(daily.api.usesBrowserClickstream, false)
    assert.equal(daily.forecasts[0]?.uvIndex, 7)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('EPA normalizers enforce curated ZIP and limit bounds', () => {
  assert.deepEqual(normalizeEpaUvHourlyInput({}), { zip: '20050', limit: 21 })
  assert.deepEqual(normalizeEpaUvHourlyInput({ zip: ' 90210 ', limit: 3 }), { zip: '90210', limit: 3 })
  assert.deepEqual(normalizeEpaUvDailyInput({ zip: ' 10001 ' }), { zip: '10001' })
  assert.throws(() => normalizeEpaUvHourlyInput({ zip: 'abcde' }), RuntimeFailure)
  assert.throws(() => normalizeEpaUvHourlyInput({ zip: '90210', limit: 22 }), RuntimeFailure)
  assert.deepEqual(normalizeEpaUvHourlyInput({ zip: '  ' }), { zip: '20050', limit: 21 })
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createHourlyFixture(): Array<Record<string, unknown>> {
  return [
    { ORDER: 1, ZIP: '20050', CITY: 'Washington', STATE: 'DC', DATE_TIME: 'May/04/2026 08 AM', UV_VALUE: 0 },
    { ORDER: 2, ZIP: '20050', CITY: 'Washington', STATE: 'DC', DATE_TIME: 'May/04/2026 09 AM', UV_VALUE: 2 },
  ]
}

function createDailyFixture(): Array<Record<string, unknown>> {
  return [
    { ZIP_CODE: '20050', CITY: 'Washington', STATE: 'DC', UV_INDEX: '7', UV_ALERT: '0', DATE: 'May/04/2026' },
  ]
}
