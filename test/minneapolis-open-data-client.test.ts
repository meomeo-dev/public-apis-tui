import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listMinneapolisOpenDataDatasets,
} from '../src/application/usecases/minneapolisOpenData.js'
import {
  MinneapolisOpenDataClient,
  normalizeMinneapolisOpenDataDatasetsInput,
} from '../src/infrastructure/openApis/minneapolisOpenDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Minneapolis Open Data client reads Hub dataset search JSON', async () => {
  const client = new MinneapolisOpenDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'opendata.minneapolismn.gov')
      assert.equal(url.pathname, '/api/search/v1/collections/dataset/items')
      assert.equal(url.searchParams.get('q'), 'transportation')
      assert.equal(url.searchParams.get('limit'), '100')
      return jsonResponse(createDatasetFixture(), {
        'x-ratelimit-limit-portal_search_throttler': '10',
        'x-ratelimit-remaining-portal_search_throttler': '8',
      })
    }) as typeof fetch,
  })

  const result = await client.listDatasets({ query: 'transportation', limit: 100 })
  assert.equal(result.total, 1)
  assert.equal(result.rateLimit.limit, '10')
  assert.equal(result.rateLimit.remaining, '8')
  assert.equal(result.datasets[0]?.id, '8f17ef750a7447fda9c505c8b8d4f7dd')
  assert.equal(result.datasets[0]?.title, 'Bikeways')
  assert.equal(result.datasets[0]?.owner, 'OpenDataMPLS')
  assert.equal(result.datasets[0]?.modifiedAt, '2026-05-08T00:00:00.000Z')
})

test('Minneapolis Open Data usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createDatasetFixture())) as typeof fetch

  try {
    const result = await listMinneapolisOpenDataDatasets({ query: 'transportation' })
    assert.equal(result.kind, 'minneapolisopendata.datasets')
    assert.equal(result.api.provider, 'minneapolisopendata')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 100)
    assert.equal(result.datasets[0]?.title, 'Bikeways')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Minneapolis Open Data normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeMinneapolisOpenDataDatasetsInput({}), {
    query: 'transportation',
    limit: 100,
  })
  assert.deepEqual(
    normalizeMinneapolisOpenDataDatasetsInput({ query: ' parks ', limit: 3 }),
    { query: 'parks', limit: 3 },
  )
  assert.throws(
    () => normalizeMinneapolisOpenDataDatasetsInput({ limit: 101 }),
    RuntimeFailure,
  )
  assert.throws(
    () => normalizeMinneapolisOpenDataDatasetsInput({ query: 'x'.repeat(121) }),
    RuntimeFailure,
  )
})

test('Minneapolis Open Data client surfaces Cloudflare challenge HTML', async () => {
  const client = new MinneapolisOpenDataClient({
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
    () => client.listDatasets({ query: 'transportation', limit: 100 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(
  value: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/geo+json', ...headers },
  })
}

function createDatasetFixture(): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    numberMatched: 1,
    numberReturned: 1,
    features: [
      {
        id: '8f17ef750a7447fda9c505c8b8d4f7dd',
        type: 'Feature',
        properties: {
          title: 'Bikeways',
          type: 'Feature Service',
          owner: 'OpenDataMPLS',
          snippet: '<p>Bike route and trail data for Minneapolis.</p>',
          categories: ['/Categories/Transportation'],
          tags: ['bicycle', 'transportation'],
          modified: Date.UTC(2026, 4, 8),
          url: 'https://opendata.minneapolismn.gov/datasets/bikeways',
          itemId: '8f17ef750a7447fda9c505c8b8d4f7dd',
        },
      },
    ],
  }
}
