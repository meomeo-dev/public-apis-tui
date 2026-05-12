import assert from 'node:assert/strict'
import test from 'node:test'
import { listColoradoBusinessEntities, listColoradoDataDatasets } from '../src/application/usecases/coloradoData.js'
import { ColoradoDataClient, normalizeColoradoDataBusinessEntitiesInput, normalizeColoradoDataDatasetsInput } from '../src/infrastructure/openApis/coloradoDataClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Colorado Information Marketplace client reads catalog and business entities JSON', async () => {
  const client = new ColoradoDataClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      if (url.hostname === 'api.us.socrata.com') {
        assert.equal(url.pathname, '/api/catalog/v1')
        assert.equal(url.searchParams.get('domains'), 'data.colorado.gov')
        return jsonResponse(createCatalogFixture())
      }
      assert.equal(url.pathname, '/resource/4ykn-tg5h.json')
      assert.equal(url.searchParams.get('$limit'), '1000')
      assert.equal(url.searchParams.get('entitystatus'), 'Good Standing')
      return jsonResponse(createBusinessEntitiesFixture())
    }) as typeof fetch,
  })

  const datasets = await client.listDatasets({ query: 'business', limit: 100 })
  assert.equal(datasets.total, 1)
  assert.equal(datasets.datasets[0]?.id, '4ykn-tg5h')

  const entities = await client.listBusinessEntities({ status: 'Good Standing', limit: 1000 })
  assert.equal(entities[0]?.entityName, 'KYLDERON MIST VALLEY LLC')
  assert.equal(entities[0]?.entityStatus, 'Good Standing')
})

test('Colorado Information Marketplace usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.hostname === 'api.us.socrata.com' ? createCatalogFixture() : createBusinessEntitiesFixture())
  }) as typeof fetch

  try {
    const datasets = await listColoradoDataDatasets({ query: 'business' })
    assert.equal(datasets.kind, 'coloradodata.datasets')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.equal(datasets.pagination.maxLimit, 100)

    const entities = await listColoradoBusinessEntities({ status: 'Good Standing' })
    assert.equal(entities.kind, 'coloradodata.businessEntities')
    assert.equal(entities.api.authentication, 'none')
    assert.equal(entities.api.usesBrowserClickstream, false)
    assert.equal(entities.pagination.maxLimit, 1000)
    assert.equal(entities.entities[0]?.state, 'CO')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Colorado Information Marketplace normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeColoradoDataDatasetsInput({}), { query: 'business', limit: 100 })
  assert.deepEqual(normalizeColoradoDataBusinessEntitiesInput({}), { status: 'Good Standing', limit: 1000 })
  assert.deepEqual(normalizeColoradoDataBusinessEntitiesInput({ status: ' Delinquent ', limit: 5 }), { status: 'Delinquent', limit: 5 })
  assert.throws(() => normalizeColoradoDataDatasetsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeColoradoDataBusinessEntitiesInput({ limit: 1001 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function createCatalogFixture(): Record<string, unknown> {
  return {
    results: [
      {
        resource: {
          id: '4ykn-tg5h',
          name: 'Business Entities in Colorado',
          attribution: 'Department of State',
          category: 'Business',
          description: 'Business entities registered with the Colorado Department of State.',
          updatedAt: '2026-05-03T19:17:49.000Z',
        },
      },
    ],
  }
}

function createBusinessEntitiesFixture(): Array<Record<string, unknown>> {
  return [
    {
      entityid: '20251665680',
      entityname: 'KYLDERON MIST VALLEY LLC',
      entitystatus: 'Good Standing',
      entitytype: 'DLLC',
      jurisdictonofformation: 'CO',
      entityformdate: '2025-06-16T00:00:00.000',
      principalcity: 'Delta',
      principalstate: 'CO',
      principalzipcode: '81416',
      agentfirstname: 'KEQIANG',
      agentlastname: 'DENG',
    },
  ]
}
