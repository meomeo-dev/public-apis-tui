import assert from 'node:assert/strict'
import test from 'node:test'
import { listWaifuImImages, listWaifuImTags } from '../src/application/usecases/waifuIm.js'
import { WaifuImClient } from '../src/infrastructure/openApis/waifuImClient.js'

test('Waifu.im client sends documented images query parameters', async () => {
  let requestedUrl: URL | undefined
  const client = new WaifuImClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createImagesResponse())
    }) as typeof fetch,
  })

  const response = await client.listImages({
    isNsfw: 'False',
    includedTags: ['waifu', 'maid'],
    excludedTags: ['uniform'],
    isAnimated: 'All',
    orderBy: 'Favorites',
    orientation: 'Portrait',
    page: 2,
    pageSize: 3,
  })

  assert.equal(requestedUrl?.origin, 'https://api.waifu.im')
  assert.equal(requestedUrl?.pathname, '/images')
  assert.deepEqual(requestedUrl?.searchParams.getAll('IncludedTags'), ['waifu', 'maid'])
  assert.deepEqual(requestedUrl?.searchParams.getAll('ExcludedTags'), ['uniform'])
  assert.equal(requestedUrl?.searchParams.get('IsNsfw'), 'False')
  assert.equal(requestedUrl?.searchParams.get('IsAnimated'), 'All')
  assert.equal(requestedUrl?.searchParams.get('OrderBy'), 'Favorites')
  assert.equal(requestedUrl?.searchParams.get('Orientation'), 'Portrait')
  assert.equal(requestedUrl?.searchParams.get('Page'), '2')
  assert.equal(requestedUrl?.searchParams.get('PageSize'), '3')
  assert.equal(response.items[0]?.url, 'https://cdn.waifu.im/884.jpeg')
})

test('Waifu.im client sends documented tags query parameters', async () => {
  let requestedUrl: URL | undefined
  const client = new WaifuImClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createTagsResponse())
    }) as typeof fetch,
  })

  const response = await client.listTags({ name: 'Waifu', includedSlugs: ['waifu'], page: 1, pageSize: 100 })

  assert.equal(requestedUrl?.pathname, '/tags')
  assert.equal(requestedUrl?.searchParams.get('Name'), 'Waifu')
  assert.deepEqual(requestedUrl?.searchParams.getAll('IncludedSlugs'), ['waifu'])
  assert.equal(requestedUrl?.searchParams.get('PageSize'), '100')
  assert.equal(response.items[0]?.slug, 'waifu')
})

test('Waifu.im usecases project no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname === '/tags' ? createTagsResponse() : createImagesResponse())
  }) as typeof fetch
  try {
    const images = await listWaifuImImages({ includedTags: 'waifu,maid' })
    assert.equal(images.kind, 'waifuim.images')
    assert.equal(images.api.authentication, 'none')
    assert.equal(images.api.usesBrowserClickstream, false)
    assert.deepEqual(images.query.includedTags, ['waifu', 'maid'])
    assert.equal(images.query.nsfw, 'False')
    assert.equal(images.query.pageSize, 100)
    assert.equal(images.images[0]?.tags.includes('waifu'), true)

    const tags = await listWaifuImTags({ name: 'waifu' })
    assert.equal(tags.kind, 'waifuim.tags')
    assert.deepEqual(tags.query, { name: 'waifu', slugs: [], page: 1, pageSize: 100 })
    assert.equal(tags.tags[0]?.slug, 'waifu')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Waifu.im usecases validate curated options', async () => {
  await assert.rejects(() => listWaifuImImages({ pageSize: 101 }), /1 to 100/u)
  await assert.rejects(() => listWaifuImImages({ page: 0 }), /positive integer/u)
  await assert.rejects(() => listWaifuImImages({ nsfw: 'Maybe' }), /must be one of/u)
  await assert.rejects(() => listWaifuImImages({ orderBy: 'AddedToAlbum' }), /must be one of/u)
  await assert.rejects(() => listWaifuImTags({ pageSize: 0 }), /1 to 100/u)
})

test('Waifu.im client surfaces provider JSON errors', async () => {
  const client = new WaifuImClient({
    fetchImpl: (async () => jsonResponse({ error: 'bad request' }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listImages(),
    /Bad Request|Waifu.im request failed/u,
  )
})

function createImagesResponse(): unknown {
  return {
    items: [
      {
        id: 884,
        perceptualHash: 'fd7cc2c0854d3c5c',
        extension: '.jpeg',
        dominantColor: '#D3C2C3',
        source: 'https://reddit.com/g2v6s2/',
        artists: [{ id: 1, name: 'Artist', pixiv: null, twitter: 'https://twitter.example/artist' }],
        uploaderId: null,
        uploadedAt: '2021-11-02T11:16:19.048684Z',
        isNsfw: false,
        isAnimated: false,
        width: 2250,
        height: 4000,
        byteSize: 517067,
        url: 'https://cdn.waifu.im/884.jpeg',
        tags: [
          { id: 12, name: 'Waifu', slug: 'waifu', description: 'A female anime/manga character.', reviewStatus: 'Accepted', creatorId: null, imageCount: 4249 },
        ],
        reviewStatus: 'Accepted',
        favorites: 8,
        likedAt: null,
        addedToAlbumAt: null,
        albums: [],
      },
    ],
    pageNumber: 1,
    totalPages: 10,
    totalCount: 10,
    maxPageSize: -1,
    defaultPageSize: 1,
    hasPreviousPage: false,
    hasNextPage: true,
  }
}

function createTagsResponse(): unknown {
  return {
    items: [
      { id: 12, name: 'Waifu', slug: 'waifu', description: 'A female anime/manga character.', reviewStatus: 'Accepted', creatorId: null, imageCount: 4249 },
    ],
    pageNumber: 1,
    totalPages: 1,
    totalCount: 1,
    maxPageSize: -1,
    defaultPageSize: 30,
    hasPreviousPage: false,
    hasNextPage: false,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
