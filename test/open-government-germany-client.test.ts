import assert from 'node:assert/strict'
import test from 'node:test'
import { searchOpenGovernmentGermanyDatasets, showOpenGovernmentGermanyDataset } from '../src/application/usecases/openGovernmentGermany.js'
import {
  OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID,
  OpenGovernmentGermanyClient,
  normalizeOpenGovernmentGermanyPackageInput,
  normalizeOpenGovernmentGermanySearchInput,
} from '../src/infrastructure/openApis/openGovernmentGermanyClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Government Germany client reads CKAN package search and package detail', async () => {
  const client = new OpenGovernmentGermanyClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'verkehr')
        assert.equal(url.searchParams.get('rows'), '1000')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'verkehr', limit: 1000 })
  assert.equal(datasets.count, 12673)
  assert.equal(datasets.results[0]?.title, 'GovData Metadatenkatalog')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'JSON-LD Catalog')

  const dataset = await client.showDataset({ packageId: OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'GovData Metadatenkatalog')
  assert.equal(dataset.licenseTitle, 'Datenlizenz Deutschland – Zero – Version 2.0')
})

test('Open Government Germany usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchOpenGovernmentGermanyDatasets({})
    assert.equal(search.kind, 'opengovernmentde.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'Datenlizenz Deutschland – Zero – Version 2.0')

    const dataset = await showOpenGovernmentGermanyDataset({})
    assert.equal(dataset.kind, 'opengovernmentde.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'JSON')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Government Germany normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeOpenGovernmentGermanySearchInput({}), { query: 'verkehr', limit: 1000 })
  assert.deepEqual(normalizeOpenGovernmentGermanySearchInput({ query: ' weather ', limit: 5 }), { query: 'weather', limit: 5 })
  assert.deepEqual(normalizeOpenGovernmentGermanyPackageInput({}), { packageId: OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeOpenGovernmentGermanySearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentGermanySearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentGermanyPackageInput({ packageId: 'not a package id' }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 12673,
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
    id: OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID,
    name: OPEN_GOVERNMENT_GERMANY_DEFAULT_PACKAGE_ID,
    title: 'GovData Metadatenkatalog',
    notes: 'GovData metadata catalog package.',
    license_title: 'Datenlizenz Deutschland – Zero – Version 2.0',
    license_url: 'https://www.govdata.de/dl-de/zero-2-0',
    organization: { title: 'Geschäfts- und Koordinierungsstelle GovData' },
    resources: [
      {
        id: '1103b63a-4500-401a-b4ff-4b6f1854c9af',
        name: 'JSON-LD Catalog',
        format: 'JSON',
        datastore_active: false,
        url: 'https://www.govdata.de/ckan/catalog/catalog.jsonld',
      },
    ],
  }
}
