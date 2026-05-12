import assert from 'node:assert/strict'
import test from 'node:test'
import { listStudioGhibliFilms } from '../src/application/usecases/studioGhibli.js'
import { StudioGhibliClient } from '../src/infrastructure/openApis/studioGhibliClient.js'

test('Studio Ghibli client sends documented films request', async () => {
  let requestedUrl: URL | undefined
  const client = new StudioGhibliClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse([createFilmResponse()])
    }) as typeof fetch,
  })

  const films = await client.listFilms({ limit: 250, fields: 'id,title,release_date' })

  assert.equal(requestedUrl?.origin, 'https://ghibliapi.vercel.app')
  assert.equal(requestedUrl?.pathname, '/films')
  assert.equal(requestedUrl?.searchParams.get('limit'), '250')
  assert.equal(requestedUrl?.searchParams.get('fields'), 'id,title,release_date')
  assert.equal(films[0]?.title, 'My Neighbor Totoro')
  assert.equal(films[0]?.originalTitleRomanised, 'Tonari no Totoro')
})

test('Studio Ghibli usecase defaults limit to documented maximum and projects metadata', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: URL | undefined
  globalThis.fetch = (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse([createFilmResponse()])
  }) as typeof fetch
  try {
    const result = await listStudioGhibliFilms()

    assert.equal(requestedUrl?.searchParams.get('limit'), '250')
    assert.equal(result.kind, 'studioghibli.films')
    assert.equal(result.api.provider, 'studio-ghibli')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.documentedMaximumLimit, 250)
    assert.equal(result.query.limit, 250)
    assert.equal(result.films[0]?.runningTimeMinutes, 86)
    assert.equal(result.films[0]?.rtScore, 93)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Studio Ghibli usecase filters films client-side from documented fields', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse([
    createFilmResponse(),
    {
      ...createFilmResponse(),
      id: 'nausicaa',
      title: 'Nausicaä of the Valley of the Wind',
      original_title: '風の谷のナウシカ',
      original_title_romanised: 'Kaze no tani no Naushika',
      director: 'Hayao Miyazaki',
      release_date: '1984',
      rt_score: '89',
      url: 'https://ghibliapi.vercel.app/films/nausicaa',
    },
  ])) as typeof fetch
  try {
    const result = await listStudioGhibliFilms({ title: 'totoro', director: 'miyazaki', minScore: 90, releaseYear: '1988', limit: 2 })

    assert.equal(result.count, 1)
    assert.equal(result.films[0]?.title, 'My Neighbor Totoro')
    assert.deepEqual(result.query, { limit: 2, title: 'totoro', director: 'miyazaki', minScore: 90, releaseYear: '1988' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Studio Ghibli usecase validates curated option values', async () => {
  await assert.rejects(() => listStudioGhibliFilms({ limit: 251 }), /1 to 250/u)
  await assert.rejects(() => listStudioGhibliFilms({ minScore: 101 }), /0 to 100/u)
  await assert.rejects(() => listStudioGhibliFilms({ releaseYear: '88' }), /four-digit year/u)
})

test('Studio Ghibli client surfaces provider JSON errors', async () => {
  const client = new StudioGhibliClient({
    fetchImpl: (async () => jsonResponse({ error: 'not found' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.listFilms(),
    /Not Found|Studio Ghibli API request failed/u,
  )
})

function createFilmResponse(): Record<string, unknown> {
  return {
    id: '58611129-2dbc-4a81-a72f-77ddfc1b1b49',
    title: 'My Neighbor Totoro',
    original_title: 'となりのトトロ',
    original_title_romanised: 'Tonari no Totoro',
    image: 'https://image.tmdb.org/t/p/example.jpg',
    movie_banner: 'https://image.tmdb.org/t/p/banner.jpg',
    description: 'Two sisters move to the country and discover Totoros.',
    director: 'Hayao Miyazaki',
    producer: 'Hayao Miyazaki',
    release_date: '1988',
    running_time: '86',
    rt_score: '93',
    people: ['https://ghibliapi.vercel.app/people/one', 'https://ghibliapi.vercel.app/people/'],
    species: ['https://ghibliapi.vercel.app/species/one'],
    locations: ['https://ghibliapi.vercel.app/locations/'],
    vehicles: ['https://ghibliapi.vercel.app/vehicles/'],
    url: 'https://ghibliapi.vercel.app/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
