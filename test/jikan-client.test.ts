import assert from 'node:assert/strict'
import test from 'node:test'
import { searchJikanAnime } from '../src/application/usecases/jikan.js'
import { JikanClient } from '../src/infrastructure/openApis/jikanClient.js'

const sampleAnimeResponse = {
  pagination: {
    last_visible_page: 10,
    has_next_page: true,
    current_page: 1,
    items: { count: 2, total: 20, per_page: 2 },
  },
  data: [
    {
      mal_id: 20,
      url: 'https://myanimelist.net/anime/20/Naruto',
      images: { jpg: { image_url: 'https://cdn.example/naruto.jpg' } },
      title: 'Naruto',
      title_english: 'Naruto',
      title_japanese: 'ナルト',
      type: 'TV',
      source: 'Manga',
      episodes: 220,
      status: 'Finished Airing',
      score: 8.02,
      rank: 724,
      popularity: 9,
      members: 3_113_432,
      rating: 'PG-13 - Teens 13 or older',
      synopsis: 'A ninja story.',
    },
    {
      mal_id: 1735,
      url: 'https://myanimelist.net/anime/1735/Naruto__Shippuuden',
      images: { jpg: { image_url: 'https://cdn.example/shippuuden.jpg' } },
      title: 'Naruto: Shippuuden',
      type: 'TV',
      episodes: 500,
      status: 'Finished Airing',
      score: 8.28,
    },
  ],
}

test('Jikan client sends curated anime search query and parses JSON response', async () => {
  const requests: string[] = []
  const client = new JikanClient({
    baseUrl: 'https://jikan.test/v4',
    fetchImpl: (async input => {
      requests.push(String(input))
      return jsonResponse(sampleAnimeResponse)
    }) as typeof fetch,
  })

  const result = await client.searchAnime({
    q: 'naruto',
    limit: 2,
    page: 1,
    sfw: true,
    type: 'tv',
    status: 'complete',
    orderBy: 'score',
    sort: 'desc',
  })

  assert.equal(requests[0], 'https://jikan.test/v4/anime?q=naruto&limit=2&page=1&sfw=true&type=tv&status=complete&order_by=score&sort=desc')
  assert.equal(result.pagination.items.perPage, 2)
  assert.equal(result.data[0]?.title, 'Naruto')
  assert.equal(result.data[0]?.imageUrl, 'https://cdn.example/naruto.jpg')
})

test('Jikan usecase projects no-auth metadata and normalized query', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(sampleAnimeResponse)) as typeof fetch
  try {
    const result = await searchJikanAnime({ query: ' Naruto ', limit: 2, orderBy: 'Score', sort: 'DESC' })

    assert.equal(result.kind, 'jikan.anime')
    assert.equal(result.api.provider, 'jikan')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.rateLimit, '3 requests/second and 60 requests/minute')
    assert.deepEqual(result.query, { limit: 2, page: 1, sfw: true, query: 'Naruto', orderBy: 'score', sort: 'desc' })
    assert.equal(result.pagination.total, 20)
    assert.equal(result.anime[0]?.url, 'https://myanimelist.net/anime/20/Naruto')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Jikan usecase validates curated option values', async () => {
  await assert.rejects(() => searchJikanAnime({ limit: 26 }), /1 to 25/u)
  await assert.rejects(() => searchJikanAnime({ page: 0 }), /positive integer/u)
  await assert.rejects(() => searchJikanAnime({ type: 'podcast' }), /--type must be one of/u)
  await assert.rejects(() => searchJikanAnime({ status: 'finished' }), /--status must be one of/u)
  await assert.rejects(() => searchJikanAnime({ sort: 'sideways' }), /--sort must be one of/u)
})

test('Jikan client surfaces provider JSON errors', async () => {
  const client = new JikanClient({
    fetchImpl: (async () => jsonResponse({ message: 'You are being rate limited.' }, 429)) as typeof fetch,
  })

  await assert.rejects(
    () => client.searchAnime({ q: 'naruto' }),
    /rate limited/u,
  )
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
