import assert from 'node:assert/strict'
import test from 'node:test'
import { getNekosBestRandom, searchNekosBest } from '../src/application/usecases/nekosBest.js'
import { NekosBestClient } from '../src/infrastructure/openApis/nekosBestClient.js'

test('NekosBest client sends documented random category request with User-Agent', async () => {
  let requestedUrl: URL | undefined
  let requestedUserAgent: string | undefined
  const client = new NekosBestClient({
    userAgent: 'public-apis-tui-test/1.0 (https://example.com)',
    fetchImpl: (async (input, init) => {
      requestedUrl = new URL(String(input))
      requestedUserAgent = new Headers(init?.headers).get('user-agent') ?? undefined
      return jsonResponse(createImageResponse())
    }) as typeof fetch,
  })

  const response = await client.random({ category: 'neko', amount: 20 })

  assert.equal(requestedUrl?.origin, 'https://nekos.best')
  assert.equal(requestedUrl?.pathname, '/api/v2/neko')
  assert.equal(requestedUrl?.searchParams.get('amount'), '20')
  assert.equal(requestedUserAgent, 'public-apis-tui-test/1.0 (https://example.com)')
  assert.equal(response.results[0]?.artistName, 'John Doe')
  assert.equal(response.results[0]?.dimensions.width, 420)
})

test('NekosBest client sends documented search request', async () => {
  let requestedUrl: URL | undefined
  const client = new NekosBestClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createGifResponse())
    }) as typeof fetch,
  })

  const response = await client.search({ query: 'Generic', type: 2, category: 'hug', amount: 2 })

  assert.equal(requestedUrl?.pathname, '/api/v2/search')
  assert.equal(requestedUrl?.searchParams.get('query'), 'Generic')
  assert.equal(requestedUrl?.searchParams.get('type'), '2')
  assert.equal(requestedUrl?.searchParams.get('category'), 'hug')
  assert.equal(requestedUrl?.searchParams.get('amount'), '2')
  assert.equal(response.results[0]?.animeName, 'Generic Anime Name')
})

test('NekosBest usecase normalizes defaults to documented maximum amount', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: URL | undefined
  globalThis.fetch = (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(createImageResponse())
  }) as typeof fetch
  try {
    const result = await getNekosBestRandom()

    assert.equal(requestedUrl?.pathname, '/api/v2/neko')
    assert.equal(requestedUrl?.searchParams.get('amount'), '20')
    assert.equal(result.kind, 'nekosbest.random')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.category, 'neko')
    assert.equal(result.query.amount, 20)
    assert.equal(result.assets[0]?.contentType, 'image')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NekosBest usecase maps human search type to documented enum', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: URL | undefined
  globalThis.fetch = (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(createGifResponse())
  }) as typeof fetch
  try {
    const result = await searchNekosBest({ query: 'Generic', type: 'gif', category: 'hug', amount: 2 })

    assert.equal(requestedUrl?.searchParams.get('type'), '2')
    assert.equal(result.kind, 'nekosbest.search')
    assert.deepEqual(result.query, { query: 'Generic', type: 'gif', typeCode: 2, amount: 2, category: 'hug' })
    assert.equal(result.assets[0]?.contentType, 'gif')
    assert.equal(result.assets[0]?.animeName, 'Generic Anime Name')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NekosBest usecase infers search result category from asset URLs', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createImageResponse())) as typeof fetch
  try {
    const result = await searchNekosBest({ query: 'neko', type: 'image', amount: 1 })

    assert.equal(result.query.category, undefined)
    assert.equal(result.assets[0]?.category, 'neko')
    assert.equal(result.assets[0]?.contentType, 'image')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NekosBest usecase validates curated option values', async () => {
  await assert.rejects(() => getNekosBestRandom({ amount: 21 }), /1 to 20/u)
  await assert.rejects(() => getNekosBestRandom({ category: 'unknown' }), /documented category/u)
  await assert.rejects(() => searchNekosBest({ query: '', type: 'image' }), /--query is required/u)
  await assert.rejects(() => searchNekosBest({ query: 'x', type: 'video' }), /image or gif/u)
})

test('NekosBest client surfaces provider JSON errors', async () => {
  const client = new NekosBestClient({
    fetchImpl: (async () => jsonResponse({ errors: { type: 'Invalid type.' }, code: 400 }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.search({ query: 'x', type: 1 }),
    /Invalid type/u,
  )
})

function createImageResponse(): unknown {
  return {
    results: [
      {
        artist_name: 'John Doe',
        artist_href: 'https://example.com/users/1',
        source_url: 'https://example.com/art/1',
        url: 'https://nekos.best/api/v2/neko/example.png',
        dimensions: { width: 420, height: 690 },
      },
    ],
  }
}

function createGifResponse(): unknown {
  return {
    results: [
      {
        anime_name: 'Generic Anime Name',
        url: 'https://nekos.best/api/v2/hug/example.gif',
        dimensions: { width: 498, height: 280 },
      },
    ],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
