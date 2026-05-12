import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getRunyankoleBibleBooks,
  getRunyankoleBibleChapter,
  getRunyankoleBibleRandom,
  getRunyankoleBibleVerse,
  normalizeRunyankoleBibleSearchInput,
  searchRunyankoleBible,
} from '../src/application/usecases/runyankoleBible.js'
import {
  RunyankoleBibleClient,
} from '../src/infrastructure/openApis/runyankoleBibleClient.js'

test('Runyankole Bible client calls documented JSON endpoints', async () => {
  const requestedUrls: string[] = []
  const client = new RunyankoleBibleClient(
    'https://runyankole-bible-api.vercel.app',
    (async input => {
      requestedUrls.push(String(input))
      return responseForRunyankoleUrl(new URL(String(input)))
    }) as typeof fetch,
  )

  await client.books()
  await client.verse(10, 1, 1)
  await client.chapter(10, 1)
  await client.search('Ruhanga', 2, 1)
  await client.random(10)

  assert.deepEqual(requestedUrls, [
    'https://runyankole-bible-api.vercel.app/api/books',
    [
      'https://runyankole-bible-api.vercel.app/api/verse',
      '?book=10&chapter=1&verse=1',
    ].join(''),
    'https://runyankole-bible-api.vercel.app/api/chapter?book=10&chapter=1',
    [
      'https://runyankole-bible-api.vercel.app/api/search',
      '?q=Ruhanga&limit=2&offset=1',
    ].join(''),
    'https://runyankole-bible-api.vercel.app/api/random?book=10',
  ])
})

test('Runyankole Bible usecases project metadata and pagination', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    return responseForRunyankoleUrl(new URL(String(input)))
  }) as typeof fetch

  try {
    const books = await getRunyankoleBibleBooks({ limit: 1, offset: 1 })
    assert.equal(books.kind, 'runyankolebible.books')
    assert.equal(books.api.authentication, 'none')
    assert.equal(books.api.usesBrowserClickstream, false)
    assert.equal(books.books[0]?.id, 20)
    assert.equal(books.pagination.total, 2)

    const verse = await getRunyankoleBibleVerse({
      book: 10,
      chapter: 1,
      verse: 1,
    })
    assert.equal(verse.kind, 'runyankolebible.verse')
    assert.equal(verse.verse.text, 'Omu kutandika Ruhanga akahanga eiguru n\'ensi.')

    const chapter = await getRunyankoleBibleChapter({
      book: 10,
      chapter: 1,
      limit: 1,
      offset: 1,
    })
    assert.equal(chapter.kind, 'runyankolebible.chapter')
    assert.equal(chapter.verses[0]?.verse, 2)
    assert.equal(chapter.totalVerses, 2)

    const search = await searchRunyankoleBible({
      query: 'Ruhanga',
      limit: 2,
      offset: 1,
    })
    assert.equal(search.kind, 'runyankolebible.search')
    assert.equal(search.pagination.total, 4)
    assert.equal(search.pagination.nextOffset, 3)

    const random = await getRunyankoleBibleRandom({ book: 10 })
    assert.equal(random.kind, 'runyankolebible.random')
    assert.equal(random.verse.bookId, 10)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Runyankole Bible normalization rejects unsafe inputs', () => {
  assert.deepEqual(normalizeRunyankoleBibleSearchInput({}), {
    query: 'Ruhanga',
    limit: 20,
    offset: 0,
  })
  assert.throws(
    () => normalizeRunyankoleBibleSearchInput({ query: 'a' }),
    /between 2 and 80/u,
  )
  assert.throws(
    () => normalizeRunyankoleBibleSearchInput({ query: '../secret' }),
    /must not include slash/u,
  )
  assert.throws(
    () => normalizeRunyankoleBibleSearchInput({ limit: 101 }),
    /integer from 1 to 100/u,
  )
  assert.throws(
    () => normalizeRunyankoleBibleSearchInput({ offset: 31_107 }),
    /integer from 0 to 31106/u,
  )
})

test('Runyankole Bible client rejects HTML and provider errors', async () => {
  const htmlClient = new RunyankoleBibleClient(
    'https://runyankole-bible-api.vercel.app',
    (async () => new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })) as typeof fetch,
  )
  await assert.rejects(() => htmlClient.books(), /was not JSON/u)

  const errorClient = new RunyankoleBibleClient(
    'https://runyankole-bible-api.vercel.app',
    (async () => jsonResponse({ error: 'Verse not found' }, 404)) as typeof fetch,
  )
  await assert.rejects(() => errorClient.verse(999, 1, 1), /Verse not found/u)
})

test('Runyankole Bible client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new RunyankoleBibleClient(
    'https://runyankole-bible-api.vercel.app',
    (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  )

  await assert.rejects(
    () => client.books(),
    /Cloudflare challenge HTML page/u,
  )
})

function responseForRunyankoleUrl(url: URL): Response {
  if (url.pathname === '/api/books') {
    return jsonResponse({
      count: 2,
      books: [
        { id: 10, short_name: 'Kut', long_name: 'Okutandika' },
        { id: 20, short_name: 'Kur', long_name: 'Okuruga' },
      ],
    })
  }
  if (url.pathname === '/api/chapter') {
    return jsonResponse({
      book_id: 10,
      book_short: 'Kut',
      book_name: 'Okutandika',
      chapter: 1,
      verse_count: 2,
      verses: [
        { verse: 1, text: 'Omu kutandika Ruhanga akahanga eiguru n\'ensi.' },
        { verse: 2, text: 'Ensi ekaba etari mu buteeka.' },
      ],
    })
  }
  if (url.pathname === '/api/search') {
    return jsonResponse({
      query: url.searchParams.get('q'),
      total: 4,
      limit: Number(url.searchParams.get('limit')),
      offset: Number(url.searchParams.get('offset')),
      results: [
        createVerse({ verse: 2, text: 'Ruhanga yaagira ati.' }),
        createVerse({ verse: 3, text: 'Habeho omushana.' }),
      ],
    })
  }
  return jsonResponse(createVerse())
}

function createVerse(
  overrides: Partial<ReturnType<typeof baseVerse>> = {},
): Record<string, unknown> {
  return { ...baseVerse(), ...overrides }
}

function baseVerse(): Record<string, unknown> {
  return {
    book_id: 10,
    book_short: 'Kut',
    book_name: 'Okutandika',
    chapter: 1,
    verse: 1,
    text: 'Omu kutandika Ruhanga akahanga eiguru n\'ensi.',
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
