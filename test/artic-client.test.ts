import assert from 'node:assert/strict'
import test from 'node:test'
import { listArtInstituteChicagoArtworks } from '../src/application/usecases/artInstituteChicago.js'
import { ArtInstituteChicagoClient } from '../src/infrastructure/openApis/artInstituteChicagoClient.js'

test('Art Institute of Chicago client searches artworks with curated fields and headers', async () => {
  const seen: { url?: string | undefined; headers?: Headers | undefined } = {}
  const client = new ArtInstituteChicagoClient({
    fetchImpl: (async (input, init) => {
      seen.url = String(input)
      seen.headers = new Headers(init?.headers)
      return jsonResponse(createArticResponse())
    }) as typeof fetch,
  })

  const response = await client.listArtworks({
    query: 'cats',
    limit: 3,
    page: 2,
    fields: 'id,title,artist_display,date_display,image_id,is_public_domain',
  })

  assert.equal(seen.url, 'https://api.artic.edu/api/v1/artworks/search?q=cats&limit=3&page=2&fields=id%2Ctitle%2Cartist_display%2Cdate_display%2Cimage_id%2Cis_public_domain')
  assert.match(seen.headers?.get('AIC-User-Agent') ?? '', /public-apis-tui/)
  assert.equal(response.pagination.total, 131_926)
  assert.equal(response.data[0]?.title, 'Lion (One of a Pair, South Pedestal)')
  assert.equal(response.data[0]?.imageId, '6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360')
})

test('Art Institute of Chicago usecase returns TUI-ready artwork metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createArticResponse())) as typeof fetch
  try {
    const result = await listArtInstituteChicagoArtworks({ query: 'cats', limit: 3 })

    assert.equal(result.kind, 'artic.artworks')
    assert.equal(result.api.provider, 'art-institute-chicago')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, {
      query: 'cats',
      limit: 3,
      page: 1,
      fields: 'id,title,artist_display,date_display,image_id,is_public_domain',
    })
    assert.equal(result.pagination.total, 131_926)
    assert.equal(result.artworks[0]?.artworkUrl, 'https://www.artic.edu/artworks/656')
    assert.equal(result.artworks[0]?.imageUrl, 'https://www.artic.edu/iiif/2/6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360/full/843,/0/default.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Art Institute of Chicago usecase validates curated limits', async () => {
  await assert.rejects(() => listArtInstituteChicagoArtworks({ limit: 101 }), /1 to 100/u)
  await assert.rejects(() => listArtInstituteChicagoArtworks({ limit: 0 }), /1 to 100/u)
  await assert.rejects(() => listArtInstituteChicagoArtworks({ page: 0 }), /positive integer/u)
  await assert.rejects(() => listArtInstituteChicagoArtworks({ fields: 'id,title description' }), /comma-separated/u)
})

test('Art Institute of Chicago client surfaces provider errors', async () => {
  const client = new ArtInstituteChicagoClient({
    fetchImpl: (async () => jsonResponse({ message: 'Invalid page' }, 400)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listArtworks({ page: 0 }),
    /Invalid page/u,
  )
})

function createArticResponse(): Record<string, unknown> {
  return {
    pagination: {
      total: 131_926,
      limit: 3,
      offset: 0,
      total_pages: 43_976,
      current_page: 1,
    },
    data: [
      {
        _score: 91.43464,
        id: 656,
        title: 'Lion (One of a Pair, South Pedestal)',
        date_display: '1893',
        artist_display: 'Edward Kemeys (American, 1843–1907)',
        image_id: '6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360',
        is_public_domain: false,
      },
    ],
    info: {
      license_text: 'Data is licensed under CC0 and Terms and Conditions of artic.edu.',
      license_links: [
        'https://creativecommons.org/publicdomain/zero/1.0/',
        'https://www.artic.edu/terms',
      ],
      version: '1.14',
    },
    config: {
      iiif_url: 'https://www.artic.edu/iiif/2',
      website_url: 'http://www.artic.edu',
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
