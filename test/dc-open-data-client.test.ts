import assert from 'node:assert/strict'
import test from 'node:test'
import { listDcOpenDataBusinessLicenses, listDcOpenDataDatasets } from '../src/application/usecases/dcOpenData.js'
import { DcOpenDataClient, normalizeDcOpenDataBusinessLicensesInput, normalizeDcOpenDataDatasetsInput } from '../src/infrastructure/openApis/dcOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('DC Open Data client reads Hub dataset search and business license JSON', async () => {
  const client = new DcOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname === '/api/search/v1/collections/dataset/items') {
        assert.equal(url.searchParams.get('q'), 'business')
        assert.equal(url.searchParams.get('limit'), '100')
        return jsonResponse(createDatasetFixture(), { 'x-ratelimit-limit-portal_search_throttler': '10', 'x-ratelimit-remaining-portal_search_throttler': '9' })
      }
      assert.equal(url.pathname, '/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0/query')
      assert.equal(url.searchParams.get('where'), "LICENSESTATUS='Active'")
      assert.equal(url.searchParams.get('returnGeometry'), 'false')
      assert.equal(url.searchParams.get('resultRecordCount'), '1000')
      assert.equal(url.searchParams.get('f'), 'pjson')
      return jsonResponse(createBusinessLicenseFixture())
    }) as typeof fetch,
  })

  const datasets = await client.listDatasets({ query: 'business', limit: 100 })
  assert.equal(datasets.total, 1)
  assert.equal(datasets.rateLimit.limit, '10')
  assert.equal(datasets.datasets[0]?.id, '85bf98d3915f412c8a4de706f2d13513')
  assert.equal(datasets.datasets[0]?.title, 'Basic Business Licenses')

  const licenses = await client.listBusinessLicenses({ status: 'Active', limit: 1000 })
  assert.equal(licenses[0]?.objectId, 398486255)
  assert.equal(licenses[0]?.entityName, 'SK+I URBAN INC.')
  assert.equal(licenses[0]?.licenseStatus, 'Active')
})

test('DC Open Data usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.hostname === 'opendata.dc.gov' ? createDatasetFixture() : createBusinessLicenseFixture())
  }) as typeof fetch

  try {
    const datasets = await listDcOpenDataDatasets({ query: 'business' })
    assert.equal(datasets.kind, 'dcopendata.datasets')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.pagination.maxLimit, 100)
    assert.equal(datasets.datasets[0]?.title, 'Basic Business Licenses')

    const licenses = await listDcOpenDataBusinessLicenses({ status: 'Active' })
    assert.equal(licenses.kind, 'dcopendata.businessLicenses')
    assert.equal(licenses.api.authentication, 'none')
    assert.equal(licenses.api.usesBrowserClickstream, false)
    assert.equal(licenses.pagination.maxLimit, 1000)
    assert.equal(licenses.licenses[0]?.entityName, 'SK+I URBAN INC.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('DC Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeDcOpenDataDatasetsInput({}), { query: 'business', limit: 100 })
  assert.deepEqual(normalizeDcOpenDataDatasetsInput({ query: ' crime ', limit: 3 }), { query: 'crime', limit: 3 })
  assert.deepEqual(normalizeDcOpenDataBusinessLicensesInput({}), { status: 'Active', limit: 1000 })
  assert.deepEqual(normalizeDcOpenDataBusinessLicensesInput({ status: ' Expired ', limit: 2 }), { status: 'Expired', limit: 2 })
  assert.throws(() => normalizeDcOpenDataDatasetsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeDcOpenDataBusinessLicensesInput({ limit: 1001 }), RuntimeFailure)
})

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
}

function createDatasetFixture(): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    numberMatched: 1,
    numberReturned: 1,
    features: [
      {
        id: '85bf98d3915f412c8a4de706f2d13513',
        type: 'Feature',
        properties: {
          title: 'Basic Business Licenses',
          type: 'Feature Service',
          owner: 'DCGISopendata',
          snippet: 'Business license locations and related metadata.',
          categories: ['/Categories/Business Economy/Licensing'],
          tags: ['business', 'license'],
          modified: 1777628880000,
          url: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0',
        },
      },
    ],
  }
}

function createBusinessLicenseFixture(): Record<string, unknown> {
  return {
    objectIdFieldName: 'OBJECTID',
    fields: [],
    features: [
      {
        attributes: {
          OBJECTID: 398486255,
          ENTITY_NAME: 'SK+I URBAN INC.',
          LICENSE_CATEGORY_TEXT: 'General Business',
          LICENSESTATUS: 'Active',
          LICENSE_START_DATE: 1733029200000,
          LICENSE_END_DATE: 1796014800000,
          SITE_ADDRESS: '4750 41ST ST NW',
          CITY: 'WASHINGTON',
          STATE: 'DC',
          ZIP: '20016',
          WARD: '3',
          LATITUDE: 38.95180534,
          LONGITUDE: -77.08068206,
        },
      },
    ],
  }
}
