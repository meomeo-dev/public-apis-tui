import assert from 'node:assert/strict'
import test from 'node:test'
import { listCovidTrackingStates, readCovidTrackingStateDaily, readCovidTrackingUsDaily } from '../src/application/usecases/covidTracking.js'
import {
  CovidTrackingClient,
  normalizeCovidTrackingStateDailyInput,
  normalizeCovidTrackingStatesInput,
  normalizeCovidTrackingUsDailyInput,
} from '../src/infrastructure/openApis/covidTrackingClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Covid Tracking Project client reads archived v2 endpoints', async () => {
  const client = new CovidTrackingClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/v2/us/daily.json') {
        return jsonResponse(createUsDailyFixture())
      }
      if (url.pathname === '/v2/states.json') {
        return jsonResponse(createStatesFixture())
      }
      assert.equal(url.pathname, '/v2/states/ca/daily.json')
      return jsonResponse(createStateDailyFixture())
    }) as typeof fetch,
  })

  const usDaily = await client.readUsDaily({ limit: 420 })
  assert.equal(usDaily.rows[0]?.casesTotal, 28756489)
  assert.equal(usDaily.rows[0]?.deathChange, 842)

  const states = await client.listStates({ limit: 56 })
  assert.equal(states.rows[0]?.stateCode, 'CA')
  assert.equal(states.rows[0]?.population, 39512223)

  const stateDaily = await client.readStateDaily({ state: 'ca', limit: 420 })
  assert.equal(stateDaily.rows[0]?.state, 'CA')
  assert.equal(stateDaily.rows[0]?.dataQualityGrade, 'B')
})

test('Covid Tracking Project usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/v2/us/daily.json') {
      return jsonResponse(createUsDailyFixture())
    }
    if (url.pathname === '/v2/states.json') {
      return jsonResponse(createStatesFixture())
    }
    return jsonResponse(createStateDailyFixture())
  }) as typeof fetch

  try {
    const usDaily = await readCovidTrackingUsDaily({})
    assert.equal(usDaily.kind, 'covidtracking.usDaily')
    assert.equal(usDaily.api.authentication, 'none')
    assert.equal(usDaily.api.usesBrowserClickstream, false)
    assert.equal(usDaily.pagination.maxLimit, 420)
    assert.equal(usDaily.meta.license, 'CC-BY-4.0')

    const states = await listCovidTrackingStates({})
    assert.equal(states.kind, 'covidtracking.states')
    assert.equal(states.pagination.maxLimit, 56)
    assert.equal(states.states[0]?.sourceUrls.length, 1)

    const stateDaily = await readCovidTrackingStateDaily({})
    assert.equal(stateDaily.kind, 'covidtracking.stateDaily')
    assert.equal(stateDaily.api.usesBrowserClickstream, false)
    assert.equal(stateDaily.rows[0]?.hospitalizedCurrently, 4291)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Covid Tracking Project normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeCovidTrackingUsDailyInput({}), { limit: 420 })
  assert.deepEqual(normalizeCovidTrackingStatesInput({}), { limit: 56 })
  assert.deepEqual(normalizeCovidTrackingStateDailyInput({ state: ' CA ', limit: 2 }), { state: 'ca', limit: 2 })
  assert.throws(() => normalizeCovidTrackingUsDailyInput({ limit: 421 }), RuntimeFailure)
  assert.throws(() => normalizeCovidTrackingStatesInput({ limit: 57 }), RuntimeFailure)
  assert.throws(() => normalizeCovidTrackingStateDailyInput({ state: 'california' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createMeta(): Record<string, unknown> {
  return { build_time: '2021-06-01T07:03:25.055Z', license: 'CC-BY-4.0', version: '2.0-beta' }
}

function createUsDailyFixture(): Record<string, unknown> {
  return {
    meta: createMeta(),
    data: [
      {
        date: '2021-03-07',
        states: 56,
        cases: { total: { value: 28756489, calculated: { change_from_prior_day: 41835 } } },
        testing: { total: { value: 363825123 } },
        outcomes: { hospitalized: { currently: { value: 40199 }, in_icu: { currently: { value: 8134 } }, on_ventilator: { currently: { value: 2802 } } }, death: { total: { value: 515151, calculated: { change_from_prior_day: 842 } } } },
      },
    ],
  }
}

function createStatesFixture(): Record<string, unknown> {
  return {
    meta: createMeta(),
    data: [
      {
        name: 'California',
        state_code: 'CA',
        fips: '06',
        sites: [{ url: 'https://covid19.ca.gov/state-dashboard/', label: 'primary' }],
        census: { population: 39512223 },
        covid_tracking_project: { preferred_total_test: { field: 'totalTestsViral', units: 'Specimens' } },
      },
    ],
  }
}

function createStateDailyFixture(): Record<string, unknown> {
  return {
    meta: createMeta(),
    data: [
      {
        date: '2021-03-07',
        state: 'CA',
        meta: { data_quality_grade: 'B', updated: '2021-03-07T07:59:00Z' },
        cases: { total: { value: 3501394, calculated: { change_from_prior_day: 3816 } } },
        tests: { pcr: { total: { value: 49646014 } } },
        outcomes: { hospitalized: { currently: { value: 4291 }, in_icu: { currently: { value: 1159 } }, on_ventilator: { currently: { value: null } } }, death: { total: { value: 54124, calculated: { change_from_prior_day: 258 } } } },
      },
    ],
  }
}
