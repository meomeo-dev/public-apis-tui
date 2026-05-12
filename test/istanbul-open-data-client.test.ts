import assert from 'node:assert/strict'
import test from 'node:test'
import { readIstanbulOpenDataRecords, searchIstanbulOpenDataDatasets } from '../src/application/usecases/istanbulOpenData.js'
import {
  ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID,
  IstanbulOpenDataClient,
  normalizeIstanbulOpenDataRecordsInput,
  normalizeIstanbulOpenDataSearchInput,
} from '../src/infrastructure/openApis/istanbulOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Istanbul Open Data client reads CKAN package search and datastore records', async () => {
  const client = new IstanbulOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'metro')
        assert.equal(url.searchParams.get('rows'), '1000')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/datastore_search'), true)
      assert.equal(url.searchParams.get('resource_id'), ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID)
      assert.equal(url.searchParams.get('limit'), '5000')
      return jsonResponse(createDatastoreFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'metro', limit: 1000 })
  assert.equal(datasets.count, 64)
  assert.equal(datasets.results[0]?.title, 'Metro Lines Energy Consumption')

  const records = await client.readRecords({ resourceId: ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID, limit: 5000 })
  assert.equal(records.total, 12)
  assert.equal(records.records[0]?.Hat, 'M1')
})

test('Istanbul Open Data usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createDatastoreFixture())
  }) as typeof fetch

  try {
    const search = await searchIstanbulOpenDataDatasets({ query: 'metro' })
    assert.equal(search.kind, 'istanbulopendata.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.resources[0]?.datastoreActive, true)

    const records = await readIstanbulOpenDataRecords({})
    assert.equal(records.kind, 'istanbulopendata.records')
    assert.equal(records.api.authentication, 'none')
    assert.equal(records.api.usesBrowserClickstream, false)
    assert.equal(records.pagination.maxLimit, 5000)
    assert.equal(records.records[0]?.Hat, 'M1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Istanbul Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeIstanbulOpenDataSearchInput({}), { query: 'metro', limit: 1000 })
  assert.deepEqual(normalizeIstanbulOpenDataSearchInput({ query: ' ferry ', limit: 5 }), { query: 'ferry', limit: 5 })
  assert.deepEqual(normalizeIstanbulOpenDataRecordsInput({}), { resourceId: ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID, limit: 5000 })
  assert.throws(() => normalizeIstanbulOpenDataSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeIstanbulOpenDataSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeIstanbulOpenDataRecordsInput({ resourceId: 'not-a-uuid' }), RuntimeFailure)
  assert.throws(() => normalizeIstanbulOpenDataRecordsInput({ limit: 5001 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 64,
      results: [
        {
          id: '2d6ec648-cdc2-49cd-991e-13a2dd540ef4',
          name: 'metro-hatlari-enerji-tuketimi',
          title: 'Metro Lines Energy Consumption',
          notes: 'Metro energy consumption dataset.',
          organization: { title: 'Metro Istanbul' },
          resources: [
            {
              id: ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID,
              name: 'Metro Hatları Enerji Tüketimi',
              format: 'XLSX',
              datastore_active: true,
              url: 'https://data.ibb.gov.tr/dataset/example/download.xlsx',
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
      resource_id: ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID,
      total: 12,
      fields: [
        { id: '_id' },
        { id: 'Hat' },
        { id: "100 KM'de Enerji Tuketimi (kWh)" },
      ],
      records: [
        {
          _id: 1,
          Hat: 'M1',
          "100 KM'de Enerji Tuketimi (kWh)": '1008.0',
          '1 Gunde Enerji Tuketimi (kWh)': '97503.0',
        },
      ],
    },
  }
}
