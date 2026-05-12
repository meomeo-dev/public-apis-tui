import assert from 'node:assert/strict'
import test from 'node:test'
import { getJsdelivrMetadata, getJsdelivrStats } from '../src/application/usecases/jsdelivr.js'
import {
  JsdelivrClient,
  normalizeJsdelivrMetadataInput,
  normalizeJsdelivrStatsInput,
} from '../src/infrastructure/openApis/jsdelivrClient.js'

test('jsDelivr client calls current package metadata and stats endpoints', async () => {
  const requests: string[] = []
  const client = new JsdelivrClient({
    baseUrl: 'https://data.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname.includes('/stats/')) {
        assert.equal(url.searchParams.get('period'), 'week')
        return jsonResponse(createStatsBody())
      }
      return jsonResponse(createMetadataBody())
    }) as typeof fetch,
  })

  const metadata = await client.getNpmMetadata({ packageName: 'jquery' })
  const stats = await client.getNpmStats({ packageName: 'jquery', period: 'week' })

  assert.deepEqual(requests, [
    'https://data.test/v1/packages/npm/jquery',
    'https://data.test/v1/stats/packages/npm/jquery?period=week',
  ])
  assert.equal(metadata.name, 'jquery')
  assert.equal(metadata.versions[0]?.version, '4.0.0')
  assert.equal(stats.hits.total, 300)
  assert.equal(stats.bandwidth.total, 3072)
})

test('jsDelivr usecases project TUI-ready metadata and stats', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('/stats/')) {
      return jsonResponse(createStatsBody())
    }
    return jsonResponse(createMetadataBody())
  }) as typeof fetch
  try {
    const metadata = await getJsdelivrMetadata({ packageName: 'jquery', versionLimit: 1 })
    assert.equal(metadata.kind, 'jsdelivr.metadata')
    assert.equal(metadata.api.authentication, 'none')
    assert.equal(metadata.api.usesBrowserClickstream, false)
    assert.equal(metadata.query.packageName, 'jquery')
    assert.equal(metadata.package.latest, '4.0.0')
    assert.equal(metadata.package.versions.length, 1)

    const stats = await getJsdelivrStats({ packageName: 'jquery', period: 'month', dateLimit: 1 })
    assert.equal(stats.kind, 'jsdelivr.stats')
    assert.equal(stats.api.authentication, 'none')
    assert.equal(stats.stats.hits.dates.length, 1)
    assert.equal(stats.stats.hits.dates[0]?.date, '2026-05-02')
    assert.equal(stats.stats.bandwidth.dates[0]?.value, 2048)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('jsDelivr normalizers enforce curated bounds and npm package syntax', () => {
  assert.deepEqual(normalizeJsdelivrMetadataInput({ packageName: ' jquery ', versionLimit: 2 }), {
    packageName: 'jquery',
    versionLimit: 2,
  })
  assert.deepEqual(normalizeJsdelivrStatsInput({ packageName: '@scope/pkg', period: '2026-Q1', dateLimit: 3 }), {
    packageName: '@scope/pkg',
    period: '2026-Q1',
    dateLimit: 3,
  })
  assert.throws(() => normalizeJsdelivrMetadataInput({ packageName: 'bad name' }), /valid npm package name/u)
  assert.throws(() => normalizeJsdelivrMetadataInput({ versionLimit: 101 }), /version-limit/u)
  assert.throws(() => normalizeJsdelivrStatsInput({ period: 'forever' }), /--period/u)
  assert.throws(() => normalizeJsdelivrStatsInput({ dateLimit: 367 }), /date-limit/u)
})

function createMetadataBody() {
  return {
    type: 'npm',
    name: 'jquery',
    tags: { latest: '4.0.0', beta: '4.0.0-rc.2' },
    versions: [
      { version: '4.0.0', links: { self: 'https://data.jsdelivr.com/v1/packages/npm/jquery@4.0.0' } },
      { version: '3.7.1', links: { self: 'https://data.jsdelivr.com/v1/packages/npm/jquery@3.7.1' } },
    ],
    links: { self: 'https://data.jsdelivr.com/v1/packages/npm/jquery' },
  }
}

function createStatsBody() {
  return {
    hits: {
      rank: 23,
      typeRank: 16,
      total: 300,
      dates: { '2026-05-01': 100, '2026-05-02': 200 },
      prev: { rank: 24, typeRank: 17, total: 250 },
    },
    bandwidth: {
      rank: 30,
      typeRank: 20,
      total: 3072,
      dates: { '2026-05-01': 1024, '2026-05-02': 2048 },
      prev: { rank: 31, typeRank: 21, total: 2048 },
    },
    links: { self: 'https://data.jsdelivr.com/v1/stats/packages/npm/jquery?period=month' },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
