import assert from 'node:assert/strict'
import test from 'node:test'
import { listHeliumHotspots } from '../src/application/usecases/helium.js'
import { HeliumClient } from '../src/infrastructure/openApis/heliumClient.js'

test('Helium client fetches hotspot metadata and pages', async () => {
  const urls: string[] = []
  const client = new HeliumClient({
    fetchImpl: (async input => {
      urls.push(String(input))
      const url = new URL(String(input))
      if (url.pathname.endsWith('/pagination-metadata')) {
        return jsonResponse({ pageSize: 10000, totalItems: 2, totalPages: 1 })
      }
      return jsonResponse({ cursor: 'next-token', items: [createHotspotResponse()] })
    }) as typeof fetch,
  })

  const metadata = await client.getHotspotPaginationMetadata('iot')
  const page = await client.listHotspots({ subnetwork: 'mobile', cursor: 'abc' })

  assert.equal(urls[0], 'https://entities.nft.helium.io/v2/hotspots/pagination-metadata?subnetwork=iot')
  assert.equal(urls[1], 'https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile&cursor=abc')
  assert.equal(metadata.pageSize, 10000)
  assert.equal(page.cursor, 'next-token')
  assert.equal(page.items[0]?.entityKey, '1126Ab9X6wTgdy43BGcEnjEwkpFFCBDFwLokZFYYkxt83LHr6TFa')
})

test('Helium usecase projects hotspot rows and metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/pagination-metadata')) {
      return jsonResponse({ pageSize: 10000, totalItems: 1034741, totalPages: 104 })
    }
    return jsonResponse({
      cursor: 'next-token',
      items: [
        createHotspotResponse(),
        { ...createHotspotResponse(), entity_key_str: 'inactive', is_active: false },
      ],
    })
  }) as typeof fetch
  try {
    const result = await listHeliumHotspots({ subnetwork: 'iot', active: true, limit: 1 })

    assert.equal(result.kind, 'helium.hotspots')
    assert.equal(result.api.provider, 'helium')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.documentedPageSize, 10000)
    assert.deepEqual(result.query, { subnetwork: 'iot', active: true, limit: 1 })
    assert.equal(result.pagination.totalItems, 1034741)
    assert.equal(result.totalFetched, 2)
    assert.equal(result.totalMatched, 1)
    assert.equal(result.hotspots[0]?.isActive, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Helium usecase validates curated inputs', async () => {
  await assert.rejects(() => listHeliumHotspots({ subnetwork: 'wifi' }), /iot or mobile/u)
  await assert.rejects(() => listHeliumHotspots({ limit: 101 }), /1 to 100/u)
  await assert.rejects(() => listHeliumHotspots({ cursor: 'x'.repeat(501) }), /too long/u)
})

test('Helium client surfaces provider errors', async () => {
  const client = new HeliumClient({
    fetchImpl: (async () => jsonResponse({ error: 'bad subnetwork' }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listHotspots({ subnetwork: 'iot' }),
    /bad subnetwork/u,
  )
})

function createHotspotResponse(): Record<string, unknown> {
  return {
    key_to_asset_key: 'YM9Xn8A5H3L1R6AnPFjDa4YTay4fEXMATUiUbxEcmk7',
    entity_key_str: '1126Ab9X6wTgdy43BGcEnjEwkpFFCBDFwLokZFYYkxt83LHr6TFa',
    is_active: true,
    lat: 45.399853,
    long: 8.073501,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
