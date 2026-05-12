import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TorontoOpenDataClient,
  TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID,
  normalizeTorontoOpenDataPackageInput,
  normalizeTorontoOpenDataSearchInput,
} from '../src/infrastructure/openApis/torontoOpenDataClient.js'
import { searchTorontoOpenDataDatasets, showTorontoOpenDataDataset } from '../src/application/usecases/torontoOpenData.js'

test('Toronto Open Data client reads CKAN package search and package detail', async () => {
  const requested: string[] = []
  const client = new TorontoOpenDataClient({
    fetchImpl: async input => {
      const url = new URL(String(input))
      requested.push(`${url.pathname}?${url.searchParams.toString()}`)
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'transportation')
        assert.equal(url.searchParams.get('rows'), '2')
        return jsonResponse({ success: true, result: { count: 1, results: [createDatasetFixture()] } })
      }
      if (url.pathname.endsWith('/package_show')) {
        assert.equal(url.searchParams.get('id'), TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID)
        return jsonResponse({ success: true, result: createDatasetFixture() })
      }
      return jsonResponse({ success: false, error: { message: 'missing' } }, { status: 404 })
    },
  })

  const search = await client.searchDatasets({ query: 'transportation', limit: 2 })
  assert.equal(search.count, 1)
  assert.equal(search.results[0]?.title, 'TTC Routes and Schedules')
  assert.equal(search.results[0]?.resources[0]?.format, 'ZIP')
  assert.deepEqual(search.results[0]?.civicIssues, ['Mobility'])

  const dataset = await client.showDataset({ packageId: TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.name, TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID)
  assert.equal(dataset.resources[0]?.url, 'https://example.com/opendata_ttc_schedules.zip')
  assert.deepEqual(requested, [
    '/api/3/action/package_search?q=transportation&rows=2',
    `/api/3/action/package_show?id=${TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID}`,
  ])
})

test('Toronto Open Data usecases project TUI-ready API', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      return jsonResponse({ success: true, result: { count: 1, results: [createDatasetFixture()] } })
    }
    return jsonResponse({ success: true, result: createDatasetFixture() })
  }
  try {
    const search = await searchTorontoOpenDataDatasets({ query: 'transportation', limit: 1 })
    assert.equal(search.kind, 'torontoopendata.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)

    const dataset = await showTorontoOpenDataDataset({ packageId: TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID })
    assert.equal(dataset.kind, 'torontoopendata.dataset')
    assert.equal(dataset.query.packageId, TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID)
    assert.equal(dataset.count, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Toronto Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeTorontoOpenDataSearchInput({ query: ' ttc ', limit: 3 }), { query: 'ttc', limit: 3 })
  assert.deepEqual(normalizeTorontoOpenDataPackageInput({ packageId: TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID }), { packageId: TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeTorontoOpenDataSearchInput({ query: 'x' }), /--query must be between 2 and 120 characters/)
  assert.throws(() => normalizeTorontoOpenDataSearchInput({ limit: 1001 }), /--limit must be an integer between 1 and 1000/)
  assert.throws(() => normalizeTorontoOpenDataPackageInput({ packageId: '../bad' }), /--package-id must be a CKAN dataset UUID or package name/)
})

test('Toronto Open Data client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new TorontoOpenDataClient({
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(() => client.searchDatasets({ query: 'transportation', limit: 1 }), /Cloudflare challenge HTML page/u)
})

function createDatasetFixture(): Record<string, unknown> {
  return {
    id: '7795b45e-e65a-4465-81fc-c36b9dfff169',
    name: TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID,
    title: 'TTC Routes and Schedules',
    notes: 'TTC routes and schedules in GTFS format.',
    excerpt: 'Routes and schedules for public transit.',
    license_title: 'Open Government Licence - Toronto',
    dataset_category: 'Document',
    civic_issues: ['Mobility'],
    topics: ['Transit', 'Transportation'],
    organization: { title: 'City of Toronto' },
    resources: [
      {
        id: 'cfb6b2b8-6191-41e3-bda1-b175c51148cb',
        name: 'TTC Routes and Schedules Data',
        format: 'ZIP',
        datastore_active: false,
        url: 'https://example.com/opendata_ttc_schedules.zip',
      },
    ],
  }
}

function jsonResponse(body: unknown, init: { status?: number | undefined } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json;charset=utf-8' },
  })
}
