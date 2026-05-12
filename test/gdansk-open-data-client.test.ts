import assert from 'node:assert/strict'
import test from 'node:test'
import { searchGdanskOpenDataDatasets, showGdanskOpenDataDataset } from '../src/application/usecases/gdanskOpenData.js'
import {
  GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID,
  GdanskOpenDataClient,
  normalizeGdanskOpenDataPackageInput,
  normalizeGdanskOpenDataSearchInput,
} from '../src/infrastructure/openApis/gdanskOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Gdańsk Open Data client reads CKAN package search and package detail', async () => {
  const client = new GdanskOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'transport')
        assert.equal(url.searchParams.get('rows'), '100')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'transport', limit: 100 })
  assert.equal(datasets.count, 9)
  assert.equal(datasets.results[0]?.title, 'Baza noclegowa w Gdańsku')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'Baza noclegowa w Gdańsku')

  const dataset = await client.showDataset({ packageId: GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'Baza noclegowa w Gdańsku')
  assert.equal(dataset.licenseTitle, 'Creative Commons Attribution')
})

test('Gdańsk Open Data usecases project TUI-ready XLSX', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchGdanskOpenDataDatasets({})
    assert.equal(search.kind, 'gdanskopendata.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'Creative Commons Attribution')

    const dataset = await showGdanskOpenDataDataset({})
    assert.equal(dataset.kind, 'gdanskopendata.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'XLSX')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Gdańsk Open Data normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeGdanskOpenDataSearchInput({}), { query: 'transport', limit: 100 })
  assert.deepEqual(normalizeGdanskOpenDataSearchInput({ query: ' gdansk ', limit: 5 }), { query: 'gdansk', limit: 5 })
  assert.deepEqual(normalizeGdanskOpenDataPackageInput({}), { packageId: GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeGdanskOpenDataSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeGdanskOpenDataSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeGdanskOpenDataPackageInput({ packageId: 'not a package id' }), RuntimeFailure)
})

test('Gdańsk Open Data client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new GdanskOpenDataClient({
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
      count: 9,
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
    id: GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID,
    name: GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID,
    title: 'Baza noclegowa w Gdańsku',
    notes: 'Dane o bazie noclegowej w Gdańsku.',
    license_title: 'Creative Commons Attribution',
    license_url: 'https://creativecommons.org/licenses/by/3.0/de/',
    organization: { title: 'Urząd Miasta Gdańsk' },
    resources: [
      {
        id: '1103b63a-4500-401a-b4ff-4b6f1854c9af',
        name: 'Baza noclegowa w Gdańsku',
        format: 'XLSX',
        datastore_active: false,
        url: 'https://gcigdansk.sharepoint.com/:x:/s/UMG-OtwarteDane3.0/EUB5-WhrgTpOsJmk0S5VMdABvKI9yVYvPlCEGyW0hLGGug?rtime=_bc3Fv1d20g',
      },
    ],
  }
}
