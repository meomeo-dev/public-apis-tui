import assert from 'node:assert/strict'
import test from 'node:test'
import { searchBerlinOpenDataDatasets, showBerlinOpenDataDataset } from '../src/application/usecases/berlinOpenData.js'
import {
  BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID,
  BerlinOpenDataClient,
  normalizeBerlinOpenDataPackageInput,
  normalizeBerlinOpenDataSearchInput,
} from '../src/infrastructure/openApis/berlinOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Berlin Open Data client reads CKAN package search and package detail', async () => {
  const client = new BerlinOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'verkehr')
        assert.equal(url.searchParams.get('rows'), '100')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'verkehr', limit: 100 })
  assert.equal(datasets.count, 792)
  assert.equal(datasets.results[0]?.title, 'daten.berlin.de Metadaten')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'CKAN-API-Endpunkt des Datenportals')

  const dataset = await client.showDataset({ packageId: BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'daten.berlin.de Metadaten')
  assert.equal(dataset.licenseTitle, 'Creative Commons Attribution')
})

test('Berlin Open Data usecases project TUI-ready API', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchBerlinOpenDataDatasets({})
    assert.equal(search.kind, 'berlinopendata.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'Creative Commons Attribution')

    const dataset = await showBerlinOpenDataDataset({})
    assert.equal(dataset.kind, 'berlinopendata.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'API')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Berlin Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeBerlinOpenDataSearchInput({}), { query: 'verkehr', limit: 100 })
  assert.deepEqual(normalizeBerlinOpenDataSearchInput({ query: ' umwelt ', limit: 5 }), { query: 'umwelt', limit: 5 })
  assert.deepEqual(normalizeBerlinOpenDataPackageInput({}), { packageId: BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeBerlinOpenDataSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeBerlinOpenDataSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeBerlinOpenDataPackageInput({ packageId: 'not a package id' }), RuntimeFailure)
})

test('Berlin Open Data client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new BerlinOpenDataClient({
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

  await assert.rejects(() => client.searchDatasets({ query: 'verkehr', limit: 100 }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 792,
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
    id: BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID,
    name: BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID,
    title: 'daten.berlin.de Metadaten',
    notes: 'Die Metadaten aller bei daten.berlin.de veröffentlichten Datensätze lassen sich direkt über die CKAN-API des Datenportals abfragen.',
    license_title: 'Creative Commons Attribution',
    license_url: 'https://creativecommons.org/licenses/by/3.0/de/',
    organization: { title: 'BerlinOnline GmbH' },
    resources: [
      {
        id: '1103b63a-4500-401a-b4ff-4b6f1854c9af',
        name: 'CKAN-API-Endpunkt des Datenportals',
        format: 'API',
        datastore_active: false,
        url: 'https://datenregister.berlin.de/api/3/action/',
      },
    ],
  }
}
