import assert from 'node:assert/strict'
import test from 'node:test'
import { listUmeaOpenDataDatasets } from '../src/application/usecases/umeaOpenData.js'
import {
  UmeaOpenDataClient,
  normalizeUmeaOpenDataDatasetsInput,
} from '../src/infrastructure/openApis/umeaOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Umeå Open Data client reads Opendatasoft catalog JSON', async () => {
  const client = new UmeaOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'opendata.umea.se')
      assert.equal(url.pathname, '/api/explore/v2.1/catalog/datasets')
      assert.equal(url.searchParams.get('where'), 'search("transport")')
      assert.equal(url.searchParams.get('limit'), '100')
      assert.equal(url.searchParams.get('offset'), '0')
      assert.equal(url.searchParams.get('lang'), 'en')
      return jsonResponse(createDatasetFixture(), {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
      })
    }) as typeof fetch,
  })

  const result = await client.listDatasets({
    query: 'transport',
    limit: 100,
    offset: 0,
    language: 'en',
  })
  assert.equal(result.total, 1)
  assert.equal(result.rateLimit.limit, '5000')
  assert.equal(result.rateLimit.remaining, '4999')
  assert.equal(result.datasets[0]?.id, 'umea-transportation-emissions-google-data')
  assert.equal(
    result.datasets[0]?.title,
    'Umeå city, number of trips and transport emissions',
  )
  assert.equal(result.datasets[0]?.recordsCount, 94)
})

test('Umeå Open Data usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createDatasetFixture())) as typeof fetch

  try {
    const result = await listUmeaOpenDataDatasets({ query: 'transport' })
    assert.equal(result.kind, 'umeaopendata.datasets')
    assert.equal(result.api.provider, 'umeaopendata')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 100)
    assert.equal(result.pagination.maxOffset, 9900)
    assert.equal(
      result.datasets[0]?.title,
      'Umeå city, number of trips and transport emissions',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Umeå Open Data normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeUmeaOpenDataDatasetsInput({}), {
    query: 'transport',
    limit: 100,
    offset: 0,
    language: 'en',
  })
  assert.deepEqual(
    normalizeUmeaOpenDataDatasetsInput({
      query: ' miljö ',
      limit: 3,
      offset: 2,
      language: 'SV',
    }),
    { query: 'miljö', limit: 3, offset: 2, language: 'sv' },
  )
  assert.throws(
    () => normalizeUmeaOpenDataDatasetsInput({ limit: 101 }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUmeaOpenDataDatasetsInput({ offset: 9901 }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUmeaOpenDataDatasetsInput({ language: 'fr' }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeUmeaOpenDataDatasetsInput({ query: 'x'.repeat(121) }),
    RuntimeFailure,
  )
})

test('Umeå Open Data client surfaces Cloudflare challenge HTML', async () => {
  const client = new UmeaOpenDataClient({
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

  await assert.rejects(
    () =>
      client.listDatasets({
        query: 'transport',
        limit: 100,
        offset: 0,
        language: 'en',
      }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(
  value: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function createDatasetFixture(): Record<string, unknown> {
  return {
    total_count: 1,
    results: [
      {
        dataset_id: 'umea-transportation-emissions-google-data',
        dataset_uid: 'da_m05800',
        has_records: true,
        features: ['timeserie', 'analyze'],
        fields: [
          { name: 'year', label: 'Year', type: 'date' },
          { name: 'mode', label: 'Mode', type: 'text' },
        ],
        metas: {
          default: {
            title: 'Umeå city, number of trips and transport emissions',
            description:
              '<p>Google Environmental Insights Explorer transport emissions.</p>',
            modified: '2026-01-21T11:45:51.961000+00:00',
            records_count: 94,
            theme: ['Transport', 'Environment'],
            keyword: ['emissions', 'trips'],
            license: 'CC BY 3.0',
          },
          dcat: {
            creator: 'Umeå kommun',
          },
        },
      },
    ],
  }
}
