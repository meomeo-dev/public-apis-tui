import assert from 'node:assert/strict'
import test from 'node:test'
import { listNycOpenData311Requests, listNycOpenDataDatasets } from '../src/application/usecases/nycOpenData.js'
import { NycOpenDataClient, normalizeNycOpenData311RequestsInput, normalizeNycOpenDataDatasetsInput } from '../src/infrastructure/openApis/nycOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('NYC Open Data client reads catalog and 311 JSON', async () => {
  const client = new NycOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/api/catalog/v1') {
        assert.equal(url.searchParams.get('domains'), 'data.cityofnewyork.us')
        assert.equal(url.searchParams.get('only'), 'datasets')
        return jsonResponse(createCatalogFixture())
      }
      assert.equal(url.pathname, '/resource/erm2-nwe9.json')
      assert.equal(url.searchParams.get('$limit'), '1000')
      assert.equal(url.searchParams.get('borough'), 'BROOKLYN')
      return jsonResponse(create311Fixture())
    }) as typeof fetch,
  })

  const datasets = await client.listDatasets({ query: '311', limit: 100 })
  assert.equal(datasets.total, 1)
  assert.equal(datasets.datasets[0]?.id, 'erm2-nwe9')

  const requests = await client.list311Requests({ borough: 'BROOKLYN', limit: 1000 })
  assert.equal(requests[0]?.uniqueKey, '68855202')
  assert.equal(requests[0]?.complaintType, 'Illegal Parking')
})

test('NYC Open Data usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/api/catalog/v1' ? createCatalogFixture() : create311Fixture())
  }) as typeof fetch

  try {
    const datasets = await listNycOpenDataDatasets({ query: '311' })
    assert.equal(datasets.kind, 'nycopendata.datasets')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.pagination.maxLimit, 100)

    const requests = await listNycOpenData311Requests({ borough: 'brooklyn' })
    assert.equal(requests.kind, 'nycopendata.311Requests')
    assert.equal(requests.api.authentication, 'none')
    assert.equal(requests.api.usesBrowserClickstream, false)
    assert.equal(requests.pagination.maxLimit, 1000)
    assert.equal(requests.requests[0]?.borough, 'BROOKLYN')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NYC Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeNycOpenDataDatasetsInput({}), { query: '311', limit: 100 })
  assert.deepEqual(normalizeNycOpenData311RequestsInput({}), { borough: 'BROOKLYN', limit: 1000 })
  assert.deepEqual(normalizeNycOpenData311RequestsInput({ borough: 'staten island', limit: 5 }), { borough: 'STATEN ISLAND', limit: 5 })
  assert.throws(() => normalizeNycOpenDataDatasetsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeNycOpenData311RequestsInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeNycOpenData311RequestsInput({ borough: 'Albany' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createCatalogFixture(): Record<string, unknown> {
  return {
    results: [
      {
        resource: {
          id: 'erm2-nwe9',
          name: '311 Service Requests from 2020 to Present',
          attribution: '311',
          category: 'Social Services',
          description: '311 responds to thousands of requests from customers every single day.',
          updatedAt: '2026-05-03T19:17:49.000Z',
        },
      },
      {
        resource: {
          id: 'abc1-def2',
          name: 'For Hire Vehicles',
          category: 'Transportation',
        },
      },
    ],
  }
}

function create311Fixture(): Array<Record<string, unknown>> {
  return [
    {
      unique_key: '68855202',
      created_date: '2026-05-02T02:06:41.000',
      agency: 'NYPD',
      complaint_type: 'Illegal Parking',
      borough: 'BROOKLYN',
      status: 'In Progress',
    },
  ]
}
