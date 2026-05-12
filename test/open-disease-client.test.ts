import assert from 'node:assert/strict'
import test from 'node:test'
import { getOpenDiseaseCountries, getOpenDiseaseGlobal, getOpenDiseaseInfluenza } from '../src/application/usecases/openDisease.js'
import {
  normalizeOpenDiseaseCountriesInput,
  normalizeOpenDiseaseGlobalInput,
  normalizeOpenDiseaseInfluenzaInput,
  OpenDiseaseClient,
} from '../src/infrastructure/openApis/openDiseaseClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Disease client reads global, countries, and influenza JSON without auth', async () => {
  const seenPaths: string[] = []
  const client = new OpenDiseaseClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      seenPaths.push(`${url.pathname}${url.search}`)
      if (url.pathname.endsWith('/all')) return jsonResponse(createGlobalFixture())
      if (url.pathname.endsWith('/countries')) return jsonResponse(createCountriesFixture())
      if (url.pathname.endsWith('/ILINet')) return jsonResponse(createInfluenzaFixture())
      throw new Error(`unexpected URL ${url.href}`)
    }) as typeof fetch,
  })

  const global = await client.global(normalizeOpenDiseaseGlobalInput({ period: 'yesterday', allowNull: true }))
  const countries = await client.countries(normalizeOpenDiseaseCountriesInput({ search: 'united', limit: 1 }))
  const influenza = await client.influenza(normalizeOpenDiseaseInfluenzaInput({ limit: 1 }))

  assert.deepEqual(seenPaths, [
    '/v3/covid-19/all?yesterday=true&allowNull=true',
    '/v3/covid-19/countries?sort=cases',
    '/v3/influenza/cdc/ILINet',
  ])
  assert.equal(global.cases, 704753890)
  assert.equal(countries.total, 1)
  assert.equal(countries.countries[0]?.country, 'United States')
  assert.equal(influenza.rows[0]?.week, '2021 - 40/52')
})

test('Open Disease usecases project TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/all')) return jsonResponse(createGlobalFixture())
    if (url.pathname.endsWith('/countries')) return jsonResponse(createCountriesFixture())
    return jsonResponse(createInfluenzaFixture())
  }) as typeof fetch
  try {
    const global = await getOpenDiseaseGlobal({})
    const countries = await getOpenDiseaseCountries({ limit: 2 })
    const influenza = await getOpenDiseaseInfluenza({ limit: 1 })

    assert.equal(global.kind, 'opendisease.global')
    assert.equal(global.api.authentication, 'none')
    assert.equal(global.api.usesBrowserClickstream, false)
    assert.equal(countries.pagination.maxLimit, 231)
    assert.equal(countries.countries.length, 2)
    assert.equal(influenza.pagination.maxLimit, 28)
    assert.equal(influenza.rows.length, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Disease normalizers enforce curated CLI bounds', () => {
  assert.deepEqual(normalizeOpenDiseaseGlobalInput({}), { period: 'today', allowNull: false })
  assert.equal(normalizeOpenDiseaseCountriesInput({}).limit, 231)
  assert.equal(normalizeOpenDiseaseInfluenzaInput({}).limit, 28)
  assert.throws(() => normalizeOpenDiseaseGlobalInput({ period: 'tomorrow' }), RuntimeFailure)
  assert.throws(() => normalizeOpenDiseaseCountriesInput({ sort: 'unknown' }), RuntimeFailure)
  assert.throws(() => normalizeOpenDiseaseCountriesInput({ limit: 232 }), RuntimeFailure)
  assert.throws(() => normalizeOpenDiseaseInfluenzaInput({ limit: 29 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createGlobalFixture(): Record<string, unknown> {
  return {
    updated: 1777949229172,
    cases: 704753890,
    todayCases: 0,
    deaths: 7010681,
    todayDeaths: 0,
    recovered: 675619811,
    active: 22123398,
    critical: 34794,
    tests: 7026505313,
    population: 7944935131,
    affectedCountries: 231,
  }
}

function createCountriesFixture(): Array<Record<string, unknown>> {
  return [
    {
      updated: 1777949229172,
      country: 'United States',
      countryInfo: { iso2: 'US', iso3: 'USA', flag: 'https://disease.sh/assets/img/flags/us.png' },
      cases: 111820082,
      deaths: 1219487,
      active: 12345,
      tests: 1186851502,
      population: 334805269,
      continent: 'North America',
    },
    {
      updated: 1777949229172,
      country: 'Japan',
      countryInfo: { iso2: 'JP', iso3: 'JPN' },
      cases: 33803572,
      deaths: 74694,
      active: 0,
      tests: 100414883,
      population: 125584838,
      continent: 'Asia',
    },
  ]
}

function createInfluenzaFixture(): Record<string, unknown> {
  return {
    updated: 1777940782285,
    source: 'www.cdc.gov/flu',
    data: [
      {
        week: '2021 - 40/52',
        'age 0-4': 13064,
        'age 5-24': 13019,
        'age 25-49': 7399,
        'age 50-64': 3163,
        'age 64+': 2522,
        totalILI: 39167,
        totalPatients: 2004168,
        percentUnweightedILI: 2,
        percentWeightedILI: 2,
      },
    ],
  }
}
