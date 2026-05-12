import assert from 'node:assert/strict'
import test from 'node:test'
import { listEcondbDatasets, listEcondbSources } from '../src/application/usecases/econdb.js'
import { EcondbClient, normalizeEcondbCatalogInput } from '../src/infrastructure/openApis/econdbClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Econdb client reads no-auth sources and datasets catalog JSON', async () => {
  const client = new EcondbClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.searchParams.get('format'), 'json')
      assert.equal(url.searchParams.get('page_size'), '2')
      return jsonResponse(url.pathname.endsWith('/sources/') ? createSourcesFixture() : createDatasetsFixture())
    }) as typeof fetch,
  })

  const sources = await client.listSources({ page: 1, limit: 2 })
  assert.equal(sources.results[0]?.prefix, 'BRC')
  const datasets = await client.listDatasets({ page: 1, limit: 2 })
  assert.equal(datasets.results[0]?.dataset, 'NAMA_10_A64_E')
})

test('Econdb usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.endsWith('/sources/') ? createSourcesFixture() : createDatasetsFixture())
  }) as typeof fetch

  try {
    const sources = await listEcondbSources({ page: 1, limit: 2 })
    assert.equal(sources.kind, 'econdb.sources')
    assert.equal(sources.api.authentication, 'none')
    assert.equal(sources.api.usesBrowserClickstream, false)
    assert.equal(sources.pagination.maxLimit, 100)
    assert.match(sources.api.authBoundary, /series data endpoints returned HTTP 401/)

    const datasets = await listEcondbDatasets({ page: 1, limit: 2 })
    assert.equal(datasets.kind, 'econdb.datasets')
    assert.equal(datasets.datasets[0]?.size, 45844)
    assert.equal(datasets.pagination.hasNext, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Econdb normalizer enforces page and no-auth max page size', () => {
  assert.deepEqual(normalizeEcondbCatalogInput({}), { page: 1, limit: 100 })
  assert.deepEqual(normalizeEcondbCatalogInput({ page: 2, limit: 50 }), { page: 2, limit: 50 })
  assert.throws(() => normalizeEcondbCatalogInput({ page: 0 }), RuntimeFailure)
  assert.throws(() => normalizeEcondbCatalogInput({ limit: 101 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createSourcesFixture(): Record<string, unknown> {
  return {
    count: 146,
    pages: 73,
    next: 'https://www.econdb.com/api/sources/?format=json&page=2&page_size=2',
    previous: null,
    results: [
      { source: 'Banco de la República, Colombia', description: 'Banco de la República, Colombia', prefix: 'BRC' },
      { source: 'Eurostat', description: 'Eurostat', prefix: 'EU' },
    ],
  }
}

function createDatasetsFixture(): Record<string, unknown> {
  return {
    count: 13762,
    pages: 6881,
    next: 'https://www.econdb.com/api/datasets/?format=json&page=2&page_size=2',
    previous: null,
    results: [
      { dataset: 'NAMA_10_A64_E', description: 'National accounts employment data by industry', size: 45844, lastupdate: '2026-01-07', last_sync: '2026-01-19T00:18:00Z' },
      { dataset: 'ISOC_R_IUSE_I', description: 'Individuals who used the internet', size: 5659, lastupdate: '2026-02-25', last_sync: '2026-03-26T00:07:25Z' },
    ],
  }
}
