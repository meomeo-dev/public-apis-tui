import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateWebsiteCarbonData } from '../src/application/usecases/websiteCarbon.js'
import { WebsiteCarbonClient, normalizeWebsiteCarbonDataInput } from '../src/infrastructure/openApis/websiteCarbonClient.js'

test('Website Carbon client calls public /data endpoint with bytes and green status', async () => {
  const client = new WebsiteCarbonClient({
    baseUrl: 'https://carbon.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.href, 'https://carbon.test/data?bytes=1000000&green=1')
      return jsonResponse(createDataBody())
    }) as typeof fetch,
  })

  const result = await client.calculateData({ bytes: 1_000_000, green: true })
  assert.equal(result.bytes, 1_000_000)
  assert.equal(result.green, true)
  assert.equal(result.rating, 'B')
  assert.equal(result.cleanerThan, 0.8)
})

test('Website Carbon usecase projects TUI-ready JSON and open API metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createDataBody())) as typeof fetch
  try {
    const result = await calculateWebsiteCarbonData({ bytes: 1_000_000, green: true })
    assert.equal(result.kind, 'websitecarbon.data')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.bytes, 1_000_000)
    assert.equal(result.result.gco2e, 0.08510206826031208)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Website Carbon normalizer bounds documented public data inputs', () => {
  assert.deepEqual(normalizeWebsiteCarbonDataInput({}), { bytes: 1_000_000, green: true })
  assert.deepEqual(normalizeWebsiteCarbonDataInput({ bytes: 2_000_000, green: false, legacy: 3 }), { bytes: 2_000_000, green: false, legacy: 3 })
  assert.throws(() => normalizeWebsiteCarbonDataInput({ bytes: 0 }), /--bytes/u)
  assert.throws(() => normalizeWebsiteCarbonDataInput({ legacy: 4 as 2 }), /--legacy/u)
})

function createDataBody(): Record<string, unknown> {
  return {
    bytes: 1_000_000,
    green: true,
    gco2e: 0.08510206826031208,
    rating: 'B',
    statistics: {
      adjustedBytes: 755000,
      energy: 0.00021094456315040588,
      co2: {
        grid: { grams: 0.1042066141963005, litres: 0.05795971881598233 },
        renewable: { grams: 0.08510206826031208, litres: 0.04733377036638557 },
      },
    },
    cleanerThan: 0.8,
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
