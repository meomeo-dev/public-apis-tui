import assert from 'node:assert/strict'
import test from 'node:test'
import { getCensusGovAcsProfileStates, listCensusGovDatasets } from '../src/application/usecases/censusGov.js'
import { CensusGovClient, normalizeCensusGovAcsProfileStatesInput, normalizeCensusGovDatasetsInput } from '../src/infrastructure/openApis/censusGovClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Census.gov client reads data catalog and ACS profile rows', async () => {
  const client = new CensusGovClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/data.json') {
        return jsonResponse(createDataCatalogFixture())
      }
      assert.equal(url.pathname, '/data/2024/acs/acs5/profile')
      assert.equal(url.searchParams.get('get'), 'NAME,DP05_0001E,DP03_0062E')
      assert.equal(url.searchParams.get('for'), 'state:*')
      return jsonResponse(createAcsProfileFixture())
    }) as typeof fetch,
  })

  const datasets = await client.listDatasets({ query: 'acs', limit: 100 })
  assert.equal(datasets.total, 1)
  assert.equal(datasets.datasets[0]?.title, '2024 ACS 5-Year Data Profiles')

  const states = await client.getAcsProfileStates({ year: 2024, limit: 52 })
  assert.equal(states[0]?.name, 'California')
  assert.equal(states[0]?.population, 39287377)
  assert.equal(states[0]?.medianHouseholdIncome, 99122)
})

test('Census.gov usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/data.json' ? createDataCatalogFixture() : createAcsProfileFixture())
  }) as typeof fetch

  try {
    const datasets = await listCensusGovDatasets({ query: 'acs' })
    assert.equal(datasets.kind, 'censusgov.datasets')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.pagination.maxLimit, 100)

    const states = await getCensusGovAcsProfileStates({ year: 2024 })
    assert.equal(states.kind, 'censusgov.acsProfileStates')
    assert.equal(states.api.authentication, 'none')
    assert.equal(states.api.usesBrowserClickstream, false)
    assert.equal(states.pagination.maxLimit, 52)
    assert.equal(states.states[0]?.state, '06')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Census.gov normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeCensusGovDatasetsInput({}), { query: 'acs', limit: 100 })
  assert.deepEqual(normalizeCensusGovDatasetsInput({ query: ' business ', limit: 5 }), { query: 'business', limit: 5 })
  assert.deepEqual(normalizeCensusGovAcsProfileStatesInput({}), { year: 2024, limit: 52 })
  assert.throws(() => normalizeCensusGovDatasetsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeCensusGovAcsProfileStatesInput({ limit: 53 }), RuntimeFailure)
  assert.throws(() => normalizeCensusGovAcsProfileStatesInput({ year: 2009 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createDataCatalogFixture(): Record<string, unknown> {
  return {
    dataset: [
      {
        '@id': 'https://api.census.gov/data/2024/acs/acs5/profile.json',
        title: '2024 ACS 5-Year Data Profiles',
        description: 'ACS demographic and economic profile tables.',
        c_vintage: 2024,
        c_dataset: ['acs', 'acs5', 'profile'],
        c_variablesLink: 'https://api.census.gov/data/2024/acs/acs5/profile/variables.json',
        c_examplesLink: 'https://api.census.gov/data/2024/acs/acs5/profile/examples.json',
        c_documentationLink: 'https://www.census.gov/data/developers/data-sets/acs-5year.html',
      },
      {
        title: 'County Business Patterns',
        c_vintage: 2024,
        c_dataset: ['cbp'],
      },
    ],
  }
}

function createAcsProfileFixture(): unknown[] {
  return [
    ['NAME', 'DP05_0001E', 'DP03_0062E', 'state'],
    ['California', '39287377', '99122', '06'],
    ['New York', '19852366', '85974', '36'],
  ]
}
