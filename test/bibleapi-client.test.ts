import assert from 'node:assert/strict'
import test from 'node:test'
import { getBibleApiPassage, getBibleApiRandom } from '../src/application/usecases/bibleApi.js'
import { BibleApiClient } from '../src/infrastructure/openApis/bibleApiClient.js'

test('Bible-api client fetches passage reference with translation query', async () => {
  let requestedUrl: URL | undefined
  const client = new BibleApiClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createPassageResponse())
    }) as typeof fetch,
  })

  const passage = await client.getPassage({ reference: 'John 3:16', translation: 'web' })

  assert.equal(requestedUrl?.href, 'https://bible-api.com/John+3%3A16?translation=web')
  assert.equal(passage.reference, 'John 3:16')
  assert.equal(passage.verses[0]?.bookName, 'John')
})

test('Bible-api client fetches random verse scoped by translation, book, and chapter', async () => {
  let requestedUrl: URL | undefined
  const client = new BibleApiClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createRandomResponse())
    }) as typeof fetch,
  })

  const random = await client.getRandomVerse({ translation: 'web', book: 'JHN', chapter: 3 })

  assert.equal(requestedUrl?.href, 'https://bible-api.com/data/web/random/JHN/3')
  assert.equal(random.translation.identifier, 'web')
  assert.equal(random.randomVerse.bookName, 'John')
})

test('Bible-api usecases project TUI-ready metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return url.pathname.includes('/random') ? jsonResponse(createRandomResponse()) : jsonResponse(createPassageResponse())
  }) as typeof fetch
  try {
    const passage = await getBibleApiPassage({ reference: 'John 3:16', translation: 'web', maxVerses: 1 })
    assert.equal(passage.kind, 'bibleapi.passage')
    assert.equal(passage.api.provider, 'bible-api')
    assert.equal(passage.api.authentication, 'none')
    assert.equal(passage.api.usesBrowserClickstream, false)
    assert.equal(passage.query.maxVerses, 1)
    assert.equal(passage.count, 1)
    assert.equal(passage.translation.id, 'web')

    const random = await getBibleApiRandom({ translation: 'web', book: 'JHN', chapter: 3 })
    assert.equal(random.kind, 'bibleapi.random')
    assert.equal(random.query.book, 'JHN')
    assert.equal(random.translation.license, 'Public Domain')
    assert.equal(random.verse.text, 'Random verse text.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Bible-api usecases validate curated inputs', async () => {
  await assert.rejects(() => getBibleApiPassage({ reference: 'x'.repeat(121) }), /120 characters/u)
  await assert.rejects(() => getBibleApiPassage({ translation: '../bad' }), /translation/u)
  await assert.rejects(() => getBibleApiPassage({ maxVerses: 101 }), /1 to 100/u)
  await assert.rejects(() => getBibleApiRandom({ chapter: 3 }), /requires --book/u)
  await assert.rejects(() => getBibleApiRandom({ book: 'bad book' }), /--book/u)
  await assert.rejects(() => getBibleApiRandom({ book: 'JHN', chapter: 151 }), /1 to 150/u)
})

test('Bible-api client surfaces provider errors', async () => {
  const client = new BibleApiClient({
    fetchImpl: (async () => jsonResponse({ error: 'not found' }, 404)) as typeof fetch,
  })

  await assert.rejects(
    () => client.getPassage({ reference: 'Unknown 1:1', translation: 'web' }),
    /not found/u,
  )
})

function createPassageResponse(): Record<string, unknown> {
  return {
    reference: 'John 3:16',
    verses: [
      {
        book_id: 'JHN',
        book_name: 'John',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world.',
      },
    ],
    text: 'For God so loved the world.',
    translation_id: 'web',
    translation_name: 'World English Bible',
  }
}

function createRandomResponse(): Record<string, unknown> {
  return {
    translation: {
      identifier: 'web',
      name: 'World English Bible',
      language: 'English',
      language_code: 'eng',
      license: 'Public Domain',
    },
    random_verse: {
      book_id: 'JHN',
      book: 'John',
      chapter: 3,
      verse: 16,
      text: 'Random verse text.',
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
