import assert from 'node:assert/strict'
import test from 'node:test'
import { getQuranApiChapter, getQuranApiVerse } from '../src/application/usecases/quranApi.js'
import { QuranApiClient } from '../src/infrastructure/openApis/quranApiClient.js'

const verseFixture = { chapter: 4, verse: 157, text: 'And they did not kill him, nor did they crucify him.' }
const chapterFixture = {
  chapter: [
    { chapter: 1, verse: 1, text: 'In the name of Allah.' },
    { chapter: 1, verse: 2, text: 'All praise is due to Allah.' },
  ],
}

test('Quran-api client fetches documented CDN verse JSON', async () => {
  let requestedUrl: URL | undefined
  const client = new QuranApiClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(verseFixture)
    }) as typeof fetch,
  })

  const verse = await client.getVerse({ edition: 'eng-ummmuhammad', chapter: 4, verse: 157 })

  assert.equal(requestedUrl?.href, 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-ummmuhammad/4/157.json')
  assert.equal(verse.verse, 157)
})

test('Quran-api client fetches chapter JSON and applies CLI cap', async () => {
  let requestedUrl: URL | undefined
  const client = new QuranApiClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(chapterFixture)
    }) as typeof fetch,
  })

  const chapter = await client.getChapter({ edition: 'eng-ummmuhammad', chapter: 1, limit: 999 })

  assert.equal(requestedUrl?.href, 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-ummmuhammad/1.json')
  assert.equal(chapter.verses.length, 2)
  assert.equal(chapter.totalVerses, 2)
})

test('Quran-api client applies chapter offset for TUI page navigation', async () => {
  const client = new QuranApiClient({
    fetchImpl: (async () =>
      jsonResponse({
        chapter: Array.from({ length: 30 }, (_, verseIndex) => ({
          chapter: 2,
          verse: verseIndex + 1,
          text: `Verse ${String(verseIndex + 1)}`,
        })),
      })) as typeof fetch,
  })

  const chapter = await client.getChapter({ edition: 'eng-ummmuhammad', chapter: 2, offset: 20, limit: 5 })

  assert.equal(chapter.totalVerses, 30)
  assert.deepEqual(chapter.verses.map(verse => verse.verse), [21, 22, 23, 24, 25])
})

test('Quran-api usecases project no-auth metadata and readable defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/1/1.json')) {
      return jsonResponse({ chapter: 1, verse: 1, text: 'In the name of Allah.' })
    }
    assert.equal(url.pathname, '/gh/fawazahmed0/quran-api@1/editions/eng-ummmuhammad/1.json')
    return jsonResponse(chapterFixture)
  }) as typeof fetch

  try {
    const verse = await getQuranApiVerse()
    assert.equal(verse.kind, 'quranapi.verse')
    assert.equal((verse.api as Record<string, unknown>).authentication, 'none')
    assert.equal((verse.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((verse.verse as Record<string, unknown>).chapter, 1)

    const chapter = await getQuranApiChapter()
    assert.equal(chapter.kind, 'quranapi.chapter')
    assert.equal((chapter.query as Record<string, unknown>).offset, 0)
    assert.equal((chapter.query as Record<string, unknown>).limit, 286)
    assert.equal(chapter.totalVerses, 2)
    assert.equal((chapter.verses as Array<Record<string, unknown>>)[0]?.text, 'In the name of Allah.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
