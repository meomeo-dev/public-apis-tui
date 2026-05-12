import assert from 'node:assert/strict'
import test from 'node:test'
import { listChainlinkFeeds } from '../src/application/usecases/chainlink.js'
import { ChainlinkClient } from '../src/infrastructure/openApis/chainlinkClient.js'

test('Chainlink client fetches selected reference-data-directory feed file', async () => {
  let requestedUrl: URL | undefined
  const client = new ChainlinkClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse([createFeedResponse()])
    }) as typeof fetch,
  })

  const feeds = await client.listFeeds({ network: 'arbitrum-mainnet' })

  assert.equal(requestedUrl?.href, 'https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-arbitrum-1.json')
  assert.equal(feeds[0]?.name, 'ETH / USD')
  assert.equal(feeds[0]?.proxyAddress, '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612')
})

test('Chainlink usecase projects feeds with no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([createFeedResponse(), {
    ...createFeedResponse(),
    name: 'BTC / USD',
    assetName: 'Bitcoin',
    path: 'btc-usd',
  }])) as typeof fetch
  try {
    const result = await listChainlinkFeeds({ query: 'ETH' })

    assert.equal(result.kind, 'chainlink.feeds')
    assert.equal(result.api.provider, 'chainlink')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.network, 'ethereum-mainnet')
    assert.equal(result.query.limit, 100)
    assert.equal(result.source.file, 'feeds-mainnet.json')
    assert.equal(result.count, 1)
    assert.equal(result.feeds[0]?.name, 'ETH / USD')
    assert.deepEqual(result.feeds[0]?.pair, ['ETH', 'USD'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Chainlink usecase filters category and asset class', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([createFeedResponse(), {
    ...createFeedResponse(),
    name: 'Custom Feed',
    feedCategory: 'custom',
    docs: { assetClass: 'custom' },
  }])) as typeof fetch
  try {
    const result = await listChainlinkFeeds({ category: 'verified', assetClass: 'rates', limit: 1 })

    assert.equal(result.count, 1)
    assert.equal(result.totalMatched, 1)
    assert.equal(result.feeds[0]?.category, 'verified')
    assert.equal(result.feeds[0]?.assetClass, 'rates')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Chainlink usecase validates curated inputs', async () => {
  await assert.rejects(() => listChainlinkFeeds({ network: 'base-mainnet' }), /supported/u)
  await assert.rejects(() => listChainlinkFeeds({ limit: 101 }), /1 to 100/u)
})

test('Chainlink client surfaces provider errors', async () => {
  const client = new ChainlinkClient({
    fetchImpl: (async () => jsonResponse({ error: 'not found' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listFeeds({ network: 'ethereum-mainnet' }),
    /not found/u,
  )
})

function createFeedResponse(): Record<string, unknown> {
  return {
    name: 'ETH / USD',
    path: 'eth-usd',
    proxyAddress: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    contractAddress: '0x3607e46698d218B3a5Cae44bF381475C0a5e2ca7',
    pair: ['ETH', 'USD'],
    heartbeat: 3600,
    assetName: 'Ethereum',
    feedCategory: 'verified',
    docs: {
      assetClass: 'rates',
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
