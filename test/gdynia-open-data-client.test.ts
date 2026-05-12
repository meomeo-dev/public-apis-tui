import assert from 'node:assert/strict'
import test from 'node:test'
import { searchGdyniaOpenDataDatasets, showGdyniaOpenDataDataset } from '../src/application/usecases/gdyniaOpenData.js'
import {
  GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID,
  GdyniaOpenDataClient,
  normalizeGdyniaOpenDataPackageInput,
  normalizeGdyniaOpenDataSearchInput,
} from '../src/infrastructure/openApis/gdyniaOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Gdynia Open Data client reads CKAN package search and package detail', async () => {
  const client = new GdyniaOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'transport')
        assert.equal(url.searchParams.get('rows'), '100')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'transport', limit: 100 })
  assert.equal(datasets.count, 59)
  assert.equal(datasets.results[0]?.title, 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport')

  const dataset = await client.showDataset({ packageId: GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport')
  assert.equal(dataset.licenseTitle, 'Creative Commons Attribution')
})

test('Gdynia Open Data usecases project TUI-ready CSV', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchGdyniaOpenDataDatasets({})
    assert.equal(search.kind, 'gdyniaopendata.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'Creative Commons Attribution')

    const dataset = await showGdyniaOpenDataDataset({})
    assert.equal(dataset.kind, 'gdyniaopendata.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'CSV')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Gdynia Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeGdyniaOpenDataSearchInput({}), { query: 'transport', limit: 100 })
  assert.deepEqual(normalizeGdyniaOpenDataSearchInput({ query: ' gdynia ', limit: 5 }), { query: 'gdynia', limit: 5 })
  assert.deepEqual(normalizeGdyniaOpenDataPackageInput({}), { packageId: GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeGdyniaOpenDataSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeGdyniaOpenDataSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeGdyniaOpenDataPackageInput({ packageId: 'not a package id' }), RuntimeFailure)
})

test('Gdynia Open Data client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new GdyniaOpenDataClient({
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

  await assert.rejects(() => client.searchDatasets({ query: 'transport', limit: 100 }), /Cloudflare challenge HTML page/u)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 59,
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
    id: GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID,
    name: GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID,
    title: 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport',
    notes: 'Źródło: na podstawie danych z przetargu',
    license_title: 'Creative Commons Attribution',
    license_url: 'https://creativecommons.org/licenses/by/3.0/de/',
    organization: { title: 'Wydział Energetyki' },
    resources: [
      {
        id: '1103b63a-4500-401a-b4ff-4b6f1854c9af',
        name: 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport',
        format: 'CSV',
        datastore_active: false,
        url: 'https://otwartedane.gdynia.pl/pl/dataset/8b80bddf-6420-4689-8f54-ba33db71dba6/resource/848cf3f9-a346-40b0-a6c0-d3536132845d/download/transport-1.csv',
      },
    ],
  }
}
