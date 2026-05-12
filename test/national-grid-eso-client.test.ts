import assert from 'node:assert/strict'
import test from 'node:test'
import { readNationalGridEsoRecords, searchNationalGridEsoDatasets } from '../src/application/usecases/nationalGridEso.js'
import {
  NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID,
  NationalGridEsoClient,
  normalizeNationalGridEsoRecordsInput,
  normalizeNationalGridEsoSearchInput,
} from '../src/infrastructure/openApis/nationalGridEsoClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('National Grid ESO client reads CKAN package search and datastore records JSON', async () => {
  const client = new NationalGridEsoClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'demand')
        assert.equal(url.searchParams.get('rows'), '2')
        return jsonResponse({ success: true, result: createPackageSearchFixture() })
      }
      assert.equal(url.pathname.endsWith('/datastore_search'), true)
      assert.equal(url.searchParams.get('resource_id'), NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID)
      assert.equal(url.searchParams.get('limit'), '2')
      return jsonResponse({ success: true, result: createDatastoreFixture() })
    }) as typeof fetch,
  })

  const search = await client.searchDatasets({ query: 'demand', limit: 2 })
  assert.equal(search.results[0]?.title, 'Demand Data Update')
  assert.equal(search.results[0]?.resources[0]?.datastoreActive, true)

  const records = await client.readRecords({ resourceId: NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID, limit: 2 })
  assert.equal(records.records[0]?.ND, 24019)
  assert.equal(records.fields.includes('SETTLEMENT_DATE'), true)
})

test('National Grid ESO usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse({ success: true, result: url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createDatastoreFixture() })
  }) as typeof fetch

  try {
    const search = await searchNationalGridEsoDatasets({ query: 'demand', limit: 2 })
    assert.equal(search.kind, 'nationalgrideso.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.resources[0]?.id, NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID)

    const records = await readNationalGridEsoRecords({ resourceId: NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID, limit: 2 })
    assert.equal(records.kind, 'nationalgrideso.records')
    assert.equal(records.api.authentication, 'none')
    assert.equal(records.api.usesBrowserClickstream, false)
    assert.equal(records.pagination.maxLimit, 100)
    assert.equal(records.records[1]?.SETTLEMENT_PERIOD, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('National Grid ESO normalizers enforce bounds', () => {
  assert.deepEqual(normalizeNationalGridEsoSearchInput({}), { query: 'demand', limit: 1000 })
  assert.deepEqual(normalizeNationalGridEsoRecordsInput({}), { resourceId: NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID, limit: 100 })
  assert.throws(() => normalizeNationalGridEsoSearchInput({ query: 'x' }), RuntimeFailure)
  assert.throws(() => normalizeNationalGridEsoSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeNationalGridEsoRecordsInput({ resourceId: 'bad' }), RuntimeFailure)
  assert.throws(() => normalizeNationalGridEsoRecordsInput({ limit: 101 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    count: 1,
    results: [
      {
        id: '7a12172a-939c-404c-b581-a6128b74f588',
        name: 'daily-demand-update',
        title: 'Demand Data Update',
        notes: 'Daily demand update dataset.',
        organization: { title: 'NESO' },
        resources: [
          { id: NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID, name: 'Demand Data Update', format: 'CSV', datastore_active: true, url: 'https://api.neso.energy/example.csv' },
        ],
      },
    ],
  }
}

function createDatastoreFixture(): Record<string, unknown> {
  return {
    resource_id: NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID,
    total: 1920,
    fields: [{ id: '_id' }, { id: 'SETTLEMENT_DATE' }, { id: 'SETTLEMENT_PERIOD' }, { id: 'ND' }, { id: 'TSD' }],
    records: [
      { _id: 1, SETTLEMENT_DATE: '2026-04-01', SETTLEMENT_PERIOD: 1, ND: 24019, TSD: 28762, EMBEDDED_WIND_GENERATION: 1112, EMBEDDED_SOLAR_GENERATION: 0 },
      { _id: 2, SETTLEMENT_DATE: '2026-04-01', SETTLEMENT_PERIOD: 2, ND: 24100, TSD: 28800, EMBEDDED_WIND_GENERATION: 1100, EMBEDDED_SOLAR_GENERATION: 0 },
    ],
  }
}
