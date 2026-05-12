import assert from 'node:assert/strict'
import test from 'node:test'
import { searchHelsinkiOpenDataDatasets, showHelsinkiOpenDataDataset } from '../src/application/usecases/helsinkiOpenData.js'
import {
  HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID,
  HelsinkiOpenDataClient,
  normalizeHelsinkiOpenDataPackageInput,
  normalizeHelsinkiOpenDataSearchInput,
} from '../src/infrastructure/openApis/helsinkiOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Helsinki Region Infoshare client reads CKAN package search and package detail', async () => {
  const client = new HelsinkiOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'transport')
        assert.equal(url.searchParams.get('rows'), '100')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'transport', limit: 100 })
  assert.equal(datasets.count, 56)
  assert.equal(datasets.results[0]?.title, 'Helsingin liikennemittausten tilastorajapinta')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'Helsingin liikennemittausten tilastorajapinta')

  const dataset = await client.showDataset({ packageId: HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'Helsingin liikennemittausten tilastorajapinta')
  assert.equal(dataset.licenseTitle, 'Creative Commons Attribution 4.0')
})

test('Helsinki Region Infoshare usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchHelsinkiOpenDataDatasets({})
    assert.equal(search.kind, 'helsinkiopendata.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'Creative Commons Attribution 4.0')

    const dataset = await showHelsinkiOpenDataDataset({})
    assert.equal(dataset.kind, 'helsinkiopendata.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'JSON')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Helsinki Region Infoshare normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeHelsinkiOpenDataSearchInput({}), { query: 'transport', limit: 100 })
  assert.deepEqual(normalizeHelsinkiOpenDataSearchInput({ query: ' helsinki ', limit: 5 }), { query: 'helsinki', limit: 5 })
  assert.deepEqual(normalizeHelsinkiOpenDataPackageInput({}), { packageId: HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeHelsinkiOpenDataSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeHelsinkiOpenDataSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeHelsinkiOpenDataPackageInput({ packageId: 'not a package id' }), RuntimeFailure)
})

test('Helsinki Region Infoshare client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new HelsinkiOpenDataClient({
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
      count: 56,
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
    id: HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID,
    name: HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID,
    title: 'Helsingin liikennemittausten tilastorajapinta',
    notes: 'Aineistokokonaisuus sisältää Helsingin liikenteen määrä-, keskinopeus- ja ajoneuvojakaumatietoja.',
    license_title: 'Creative Commons Attribution 4.0',
    license_url: 'https://creativecommons.org/licenses/by/3.0/de/',
    organization: { title: 'Helsingin kaupunkiympäristön toimiala' },
    resources: [
      {
        id: '1103b63a-4500-401a-b4ff-4b6f1854c9af',
        name: 'Helsingin liikennemittausten tilastorajapinta',
        format: 'JSON',
        datastore_active: false,
        url: 'https://lidotiku.api.hel.fi/swagger',
      },
    ],
  }
}
