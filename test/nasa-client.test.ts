import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listNasaAsset,
  normalizeNasaAssetInput,
  normalizeNasaSearchInput,
  searchNasaImages,
} from '../src/application/usecases/nasa.js'
import { NasaClient } from '../src/infrastructure/openApis/nasaClient.js'

test('NASA client calls documented Image Library search endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new NasaClient(
    'https://images-api.nasa.gov',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        collection: {
          href: 'http://images-api.nasa.gov/search?q=apollo%2011',
          metadata: { total_hits: 1510 },
          items: [createSearchItem()],
        },
      })
    }) as typeof fetch,
  )

  const response = await client.search({
    query: 'apollo 11',
    mediaType: 'image',
    center: 'JSC',
    yearStart: 1969,
    yearEnd: 1970,
    page: 2,
    pageSize: 3,
  })

  assert.equal(requestedUrl?.origin, 'https://images-api.nasa.gov')
  assert.equal(requestedUrl?.pathname, '/search')
  assert.equal(requestedUrl?.searchParams.get('q'), 'apollo 11')
  assert.equal(requestedUrl?.searchParams.get('media_type'), 'image')
  assert.equal(requestedUrl?.searchParams.get('center'), 'JSC')
  assert.equal(requestedUrl?.searchParams.get('year_start'), '1969')
  assert.equal(requestedUrl?.searchParams.get('year_end'), '1970')
  assert.equal(requestedUrl?.searchParams.get('page'), '2')
  assert.equal(requestedUrl?.searchParams.get('page_size'), '3')
  assert.equal(response.totalHits, 1510)
  assert.equal(response.items[0]?.nasaId, 'jsc2007e034221')
  assert.equal(
    response.items[0]?.previewUrl,
    'https://images-assets.nasa.gov/thumb.jpg',
  )
})

test('NASA client calls documented asset manifest endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new NasaClient(
    'https://images-api.nasa.gov',
    (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({
        collection: {
          href: 'http://images-api.nasa.gov/asset/as11-40-5874',
          items: [
            {
              href: [
                'https://images-assets.nasa.gov/image/as11-40-5874/',
                'as11-40-5874~orig.jpg',
              ].join(''),
            },
            {
              href: [
                'https://images-assets.nasa.gov/image/as11-40-5874/',
                'as11-40-5874~medium.jpg',
              ].join(''),
            },
          ],
        },
      })
    }) as typeof fetch,
  )

  const response = await client.asset({ nasaId: 'as11-40-5874' })

  assert.equal(requestedUrl?.origin, 'https://images-api.nasa.gov')
  assert.equal(requestedUrl?.pathname, '/asset/as11-40-5874')
  assert.equal(response.files[0]?.role, 'original')
  assert.equal(response.files[0]?.extension, 'jpg')
  assert.equal(response.files[1]?.role, 'medium')
})

test('NASA usecases project bounded no-auth metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/asset/')) {
      return jsonResponse({
        collection: {
          items: [
            { href: 'https://images-assets.nasa.gov/image/a/a~orig.jpg' },
            { href: 'https://images-assets.nasa.gov/image/a/a~large.jpg' },
          ],
        },
      })
    }
    return jsonResponse({
      collection: {
        metadata: { total_hits: 1 },
        items: [createSearchItem()],
      },
    })
  }) as typeof fetch

  try {
    const search = await searchNasaImages({
      query: 'apollo 11',
      mediaType: 'image',
      pageSize: 1,
    })
    assert.equal(search.kind, 'nasa.search')
    assert.equal(search.api.provider, 'nasa')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.match(search.api.boundary, /no api\.nasa\.gov/u)
    assert.equal(search.pagination.totalHits, 1)
    assert.equal(search.items[0]?.title, 'Apollo 11 spacecraft pre-launch')

    const asset = await listNasaAsset({ nasaId: 'as11-40-5874', limit: 1 })
    assert.equal(asset.kind, 'nasa.asset')
    assert.equal(asset.files.length, 1)
    assert.equal(asset.pagination.hasMore, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NASA client rejects Cloudflare challenge HTML clearly', async () => {
  const client = new NasaClient(
    'https://images-api.nasa.gov',
    (async () => {
      return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'cf-mitigated': 'challenge',
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
        },
      })
    }) as typeof fetch,
  )

  await assert.rejects(
    () => client.search({
      query: 'apollo 11',
      mediaType: 'image',
      page: 1,
      pageSize: 1,
    }),
    /Cloudflare challenge HTML/u,
  )
})

test('NASA normalizers enforce curated bounds', () => {
  assert.deepEqual(normalizeNasaSearchInput({}), {
    query: 'apollo 11',
    mediaType: 'image',
    page: 1,
    pageSize: 10,
  })
  assert.equal(normalizeNasaSearchInput({ mediaType: 'VIDEO' }).mediaType, 'video')
  assert.equal(normalizeNasaSearchInput({ yearStart: '1969' }).yearStart, 1969)
  assert.throws(
    () => normalizeNasaSearchInput({ mediaType: 'pdf' }),
    /media-type must be one of image, audio, video/u,
  )
  assert.throws(
    () => normalizeNasaSearchInput({ pageSize: 51 }),
    /page-size must be between 1 and 50/u,
  )
  assert.throws(
    () => normalizeNasaSearchInput({ yearStart: 1970, yearEnd: 1969 }),
    /year-end must be greater than or equal/u,
  )
  assert.throws(
    () => normalizeNasaSearchInput({ query: '' }),
    /query must be 1-120 characters/u,
  )
  assert.deepEqual(normalizeNasaAssetInput({}), {
    nasaId: 'as11-40-5874',
    limit: 10,
  })
  assert.throws(
    () => normalizeNasaAssetInput({ limit: 0 }),
    /limit must be between 1 and 50/u,
  )
})

function createSearchItem() {
  return {
    href: 'https://images-assets.nasa.gov/image/jsc2007e034221/collection.json',
    data: [
      {
        center: 'JSC',
        date_created: '1969-07-11T00:00:00Z',
        description: 'Personnel atop the mobile service structure.',
        keywords: ['Apollo', 'Apollo 11', 'Launch'],
        media_type: 'image',
        nasa_id: 'jsc2007e034221',
        title: 'Apollo 11 spacecraft pre-launch',
      },
    ],
    links: [
      {
        href: 'https://images-assets.nasa.gov/thumb.jpg',
        rel: 'preview',
        render: 'image',
      },
    ],
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
