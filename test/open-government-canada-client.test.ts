import assert from 'node:assert/strict'
import test from 'node:test'
import { searchOpenGovernmentCanadaDatasets, showOpenGovernmentCanadaDataset } from '../src/application/usecases/openGovernmentCanada.js'
import {
  OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID,
  OpenGovernmentCanadaClient,
  normalizeOpenGovernmentCanadaPackageInput,
  normalizeOpenGovernmentCanadaSearchInput,
} from '../src/infrastructure/openApis/openGovernmentCanadaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Government Canada client reads CKAN package search and package detail', async () => {
  const client = new OpenGovernmentCanadaClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'business')
        assert.equal(url.searchParams.get('rows'), '1000')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'business', limit: 1000 })
  assert.equal(datasets.count, 3790)
  assert.equal(datasets.results[0]?.title, 'Open Government API')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'OpenAPI Specification')

  const dataset = await client.showDataset({ packageId: OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'Open Government API')
  assert.equal(dataset.licenseTitle, 'Open Government Licence - Canada')
})

test('Open Government Canada usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchOpenGovernmentCanadaDatasets({})
    assert.equal(search.kind, 'opengovernmentcanada.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'Open Government Licence - Canada')

    const dataset = await showOpenGovernmentCanadaDataset({})
    assert.equal(dataset.kind, 'opengovernmentcanada.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'JSON')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Government Canada normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeOpenGovernmentCanadaSearchInput({}), { query: 'business', limit: 1000 })
  assert.deepEqual(normalizeOpenGovernmentCanadaSearchInput({ query: ' weather ', limit: 5 }), { query: 'weather', limit: 5 })
  assert.deepEqual(normalizeOpenGovernmentCanadaPackageInput({}), { packageId: OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeOpenGovernmentCanadaSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentCanadaSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentCanadaPackageInput({ packageId: 'not-a-uuid' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 3790,
      results: [createDatasetFixture()],
    },
  }
}

function createPackageShowFixture(): Record<string, unknown> {
  return {
    success: true,
    result: createDatasetFixture(),
  }
}

function createDatasetFixture(): Record<string, unknown> {
  return {
    id: OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID,
    name: OPEN_GOVERNMENT_CANADA_DEFAULT_PACKAGE_ID,
    title: 'Open Government API',
    notes: 'This API provides live access to the CKAN portion of the Open Government Portal and Registry systems.',
    license_title: 'Open Government Licence - Canada',
    license_url: 'https://open.canada.ca/en/open-government-licence-canada',
    organization: { title: 'Treasury Board of Canada Secretariat | Secrétariat du Conseil du Trésor du Canada' },
    resources: [
      {
        id: '36830ed0-cd83-4fea-b2ae-15890116c68e',
        name: 'OpenAPI Specification',
        format: 'JSON',
        datastore_active: false,
        url: 'https://open.canada.ca/data/dataset/2d90548d-50ef-4802-91f8-c59c5cf68251/resource/36830ed0-cd83-4fea-b2ae-15890116c68e/download/openapi-en.json',
      },
    ],
  }
}
