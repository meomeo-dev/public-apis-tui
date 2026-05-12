import assert from 'node:assert/strict'
import test from 'node:test'
import { searchOpenGovernmentUkDatasets, showOpenGovernmentUkDataset } from '../src/application/usecases/openGovernmentUk.js'
import {
  OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID,
  OpenGovernmentUkClient,
  normalizeOpenGovernmentUkPackageInput,
  normalizeOpenGovernmentUkSearchInput,
} from '../src/infrastructure/openApis/openGovernmentUkClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Open Government UK client reads CKAN package search and package detail', async () => {
  const client = new OpenGovernmentUkClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/package_search')) {
        assert.equal(url.searchParams.get('q'), 'business')
        assert.equal(url.searchParams.get('rows'), '1000')
        return jsonResponse(createPackageSearchFixture())
      }
      assert.equal(url.pathname.endsWith('/package_show'), true)
      assert.equal(url.searchParams.get('id'), OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID)
      return jsonResponse(createPackageShowFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'business', limit: 1000 })
  assert.equal(datasets.count, 5731)
  assert.equal(datasets.results[0]?.title, 'Business Rates - Small Business Rate Relief')
  assert.equal(datasets.results[0]?.resources[0]?.name, 'Small Business rates relief - October 2025')

  const dataset = await client.showDataset({ packageId: OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID })
  assert.equal(dataset.title, 'Business Rates - Small Business Rate Relief')
  assert.equal(dataset.licenseTitle, 'UK Open Government Licence')
})

test('Open Government UK usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/package_search') ? createPackageSearchFixture() : createPackageShowFixture())
  }) as typeof fetch

  try {
    const search = await searchOpenGovernmentUkDatasets({})
    assert.equal(search.kind, 'opengovernmentuk.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.maxLimit, 1000)
    assert.equal(search.datasets[0]?.licenseTitle, 'UK Open Government Licence')

    const dataset = await showOpenGovernmentUkDataset({})
    assert.equal(dataset.kind, 'opengovernmentuk.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.resources[0]?.format, 'JSON')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Open Government UK normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeOpenGovernmentUkSearchInput({}), { query: 'business', limit: 1000 })
  assert.deepEqual(normalizeOpenGovernmentUkSearchInput({ query: ' weather ', limit: 5 }), { query: 'weather', limit: 5 })
  assert.deepEqual(normalizeOpenGovernmentUkPackageInput({}), { packageId: OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID })
  assert.throws(() => normalizeOpenGovernmentUkSearchInput({ query: 'a' }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentUkSearchInput({ limit: 1001 }), RuntimeFailure)
  assert.throws(() => normalizeOpenGovernmentUkPackageInput({ packageId: 'not-a-uuid' }), RuntimeFailure)
})

test('Open Government UK client retries transient response stream failures', async () => {
  let attempts = 0
  const client = new OpenGovernmentUkClient({
    fetchImpl: (async () => {
      attempts += 1
      if (attempts === 1) {
        const response = jsonResponse({})
        response.json = async () => {
          throw new TypeError('terminated')
        }
        return response
      }
      return jsonResponse(createPackageSearchFixture())
    }) as typeof fetch,
  })

  const datasets = await client.searchDatasets({ query: 'business', limit: 1000 })
  assert.equal(attempts, 2)
  assert.equal(datasets.results[0]?.title, 'Business Rates - Small Business Rate Relief')
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 5731,
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
    id: OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID,
    name: OPEN_GOVERNMENT_UK_DEFAULT_PACKAGE_ID,
    title: 'Business Rates - Small Business Rate Relief',
    notes: 'Business rates relief metadata.',
    license_title: 'UK Open Government Licence',
    license_url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    organization: { title: 'Calderdale Metropolitan Borough Council' },
    resources: [
      {
        id: '29427c66-7785-4c2e-a361-5694bb02c531',
        name: 'Small Business rates relief - October 2025',
        format: 'JSON',
        datastore_active: false,
        url: 'https://data.gov.uk/dataset/business-rates-small-business-rate-relief1',
      },
    ],
  }
}
