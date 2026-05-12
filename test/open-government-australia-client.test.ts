import assert from 'node:assert/strict'
import test from 'node:test'
import { readOpenGovernmentAustraliaRecords, searchOpenGovernmentAustraliaDatasets } from '../src/application/usecases/openGovernmentAustralia.js'
import {
  OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID,
  OpenGovernmentAustraliaClient,
  normalizeOpenGovernmentAustraliaRecordsInput,
  normalizeOpenGovernmentAustraliaSearchInput,
} from '../src/infrastructure/openApis/openGovernmentAustraliaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Government Australia client reads CKAN package search and datastore records', async () => {
  const client = new OpenGovernmentAustraliaClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'business')
        assert.equal(url.searchParams.get('rows'), '1000')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/datastore_search'), true)
      assert.equal(url.searchParams.get('resource_id'), OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID)
      assert.equal(url.searchParams.get('limit'), '5000')
      return jsonResponse(createDatastoreFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'business', limit: 1000 })
  assert.equal(datasets.count, 6163)
  assert.equal(datasets.results[0]?.title, 'ASIC - Business Names Dataset')

  const records = await client.readRecords({ resourceId: OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID, limit: 5000 })
  assert.equal(records.total, 3293016)
  assert.equal(records.records[0]?.BN_NAME, 'HOMSAFE')
})

test('Open Government Australia usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createDatastoreFixture())
  }) as typeof fetch

  try {
    const search = await searchOpenGovernmentAustraliaDatasets({})
    assert.equal(search.kind, 'opengovernmentau.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.resources[0]?.datastoreActive, true)

    const records = await readOpenGovernmentAustraliaRecords({})
    assert.equal(records.kind, 'opengovernmentau.records')
    assert.equal(records.api.authentication, 'none')
    assert.equal(records.api.usesBrowserClickstream, false)
    assert.equal(records.pagination.maxLimit, 5000)
    assert.equal(records.records[0]?.BN_NAME, 'HOMSAFE')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Government Australia normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeOpenGovernmentAustraliaSearchInput({}), { query: 'business', limit: 1000 })
  assert.deepEqual(normalizeOpenGovernmentAustraliaSearchInput({ query: ' weather ', limit: 5 }), { query: 'weather', limit: 5 })
  assert.deepEqual(normalizeOpenGovernmentAustraliaRecordsInput({}), { resourceId: OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID, limit: 5000 })
  assert.throws(() => normalizeOpenGovernmentAustraliaSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentAustraliaSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentAustraliaRecordsInput({ resourceId: 'not-a-uuid' }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentAustraliaRecordsInput({ limit: 5001 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 6163,
      results: [
        {
          id: 'bc515135-4bb6-4d50-957a-3713709a76d3',
          name: 'asic-business-names',
          title: 'ASIC - Business Names Dataset',
          notes: 'ASIC business names dataset.',
          organization: { title: 'Australian Securities and Investments Commission (ASIC)' },
          resources: [
            {
              id: OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID,
              name: 'Business Names Dataset - Current',
              format: 'CSV',
              datastore_active: true,
              url: 'https://data.gov.au/data/dataset/example/resource/current.csv',
            },
          ],
        },
      ],
    },
  }
}

function createDatastoreFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      resource_id: OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID,
      total: 3293016,
      fields: [
        { id: '_id' },
        { id: 'REGISTER_NAME' },
        { id: 'BN_NAME' },
        { id: 'BN_STATUS' },
      ],
      records: [
        {
          _id: 1,
          REGISTER_NAME: 'BUSINESS NAMES',
          BN_NAME: 'HOMSAFE',
          BN_STATUS: 'Registered',
          BN_ABN: '56098948915',
        },
      ],
    },
  }
}
