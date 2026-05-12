import assert from 'node:assert/strict'
import test from 'node:test'
import { listLuchtmeetnetComponents, listLuchtmeetnetConcentrations, listLuchtmeetnetMeasurements } from '../src/application/usecases/luchtmeetnet.js'
import {
  LuchtmeetnetClient,
  normalizeLuchtmeetnetComponentsInput,
  normalizeLuchtmeetnetConcentrationsInput,
  normalizeLuchtmeetnetMeasurementsInput,
} from '../src/infrastructure/openApis/luchtmeetnetClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Luchtmeetnet client reads components, measurements, and concentrations JSON', async () => {
  const client = new LuchtmeetnetClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/components')) {
        assert.equal(url.searchParams.get('order_by'), 'formula')
        return jsonResponse(createComponentsFixture())
      }
      if (url.pathname.endsWith('/measurements')) {
        assert.equal(url.searchParams.get('station_number'), 'NL01485')
        assert.equal(url.searchParams.get('formula'), 'NO2')
        return jsonResponse(createMeasurementsFixture())
      }
      assert.equal(url.pathname.endsWith('/concentrations'), true)
      assert.equal(url.searchParams.get('formula'), 'no2')
      return jsonResponse(createConcentrationsFixture())
    }) as typeof fetch,
  })

  const components = await client.listComponents({ limit: 2 })
  assert.equal(components.data[0]?.formula, 'NO2')
  const measurements = await client.listMeasurements({ stationNumber: 'NL01485', formula: 'NO2', limit: 2 })
  assert.equal(measurements.data[0]?.value, 17.4)
  const concentrations = await client.listConcentrations({ formula: 'NO2', latitude: 51.924452, longitude: 4.458807, limit: 2 })
  assert.equal(concentrations.data[1]?.value, 32)
})

test('Luchtmeetnet usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/components')) return jsonResponse(createComponentsFixture())
    if (url.pathname.endsWith('/measurements')) return jsonResponse(createMeasurementsFixture())
    return jsonResponse(createConcentrationsFixture())
  }) as typeof fetch

  try {
    const components = await listLuchtmeetnetComponents({ limit: 2 })
    assert.equal(components.kind, 'luchtmeetnet.components')
    assert.equal(components.api.authentication, 'none')
    assert.equal(components.api.usesBrowserClickstream, false)
    assert.equal(components.components.length, 2)

    const measurements = await listLuchtmeetnetMeasurements({ stationNumber: 'NL01485', formula: 'NO2', limit: 2 })
    assert.equal(measurements.kind, 'luchtmeetnet.measurements')
    assert.equal(measurements.summary.latest?.value, 17.4)
    assert.equal(measurements.pagination.maxLimit, 167)

    const concentrations = await listLuchtmeetnetConcentrations({ formula: 'NO2', latitude: 51.924452, longitude: 4.458807, limit: 2 })
    assert.equal(concentrations.kind, 'luchtmeetnet.concentrations')
    assert.equal(concentrations.summary.average, 36.5)
    assert.equal(concentrations.pagination.maxLimit, 19)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Luchtmeetnet normalizers enforce documented shapes and caps', () => {
  assert.deepEqual(normalizeLuchtmeetnetComponentsInput({}), { limit: 13 })
  assert.deepEqual(normalizeLuchtmeetnetMeasurementsInput({ stationNumber: ' nl01485 ', formula: 'no2', limit: 5 }), { stationNumber: 'NL01485', formula: 'NO2', limit: 5 })
  assert.deepEqual(normalizeLuchtmeetnetConcentrationsInput({ formula: 'pm25', latitude: 52, longitude: 5, limit: 3 }), { formula: 'PM25', latitude: 52, longitude: 5, limit: 3 })
  assert.throws(() => normalizeLuchtmeetnetMeasurementsInput({ stationNumber: 'BAD' }), RuntimeFailure)
  assert.throws(() => normalizeLuchtmeetnetMeasurementsInput({ limit: 168 }), RuntimeFailure)
  assert.throws(() => normalizeLuchtmeetnetConcentrationsInput({ latitude: 200 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createComponentsFixture(): Record<string, unknown> {
  return {
    pagination: { last_page: 1, first_page: 1, prev_page: 1, current_page: 1, page_list: [1], next_page: 1 },
    data: [
      { formula: 'NO2', name: { EN: 'Nitrogen dioxide (NO2)', NL: 'Stikstofdioxide (NO2)' } },
      { formula: 'PM10', name: { EN: 'Particulate matter (PM10)', NL: 'Fijn stof (PM10)' } },
    ],
  }
}

function createMeasurementsFixture(): Record<string, unknown> {
  return {
    pagination: { last_page: 1, first_page: 1, prev_page: 1, current_page: 1, page_list: [1], next_page: 1 },
    data: [
      { station_number: 'NL01485', value: 17.4, timestamp_measured: '2026-05-03T22:00:00+00:00', formula: 'NO2' },
      { station_number: 'NL01485', value: 13, timestamp_measured: '2026-05-03T21:00:00+00:00', formula: 'NO2' },
    ],
  }
}

function createConcentrationsFixture(): Record<string, unknown> {
  return {
    data: [
      { value: 41, timestamp_measured: '2026-05-03T22:00:00+00:00', formula: 'NO2' },
      { value: 32, timestamp_measured: '2026-05-04T00:00:00+00:00', formula: 'NO2' },
    ],
  }
}
