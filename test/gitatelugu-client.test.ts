import assert from 'node:assert/strict'
import test from 'node:test'
import { getGitaTeluguVerse } from '../src/application/usecases/gitaTelugu.js'
import { GitaTeluguClient } from '../src/infrastructure/openApis/gitaTeluguClient.js'

test('Gita Telugu client fetches chapter verse path', async () => {
  let requestedUrl: URL | undefined
  const client = new GitaTeluguClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createVerseResponse())
    }) as typeof fetch,
  })

  const verse = await client.getVerse({ language: 'tel', chapter: 1, verse: 1 })

  assert.equal(requestedUrl?.href, 'https://gita-api.vercel.app/tel/verse/1/1')
  assert.equal(verse.chapterNo, 1)
  assert.equal(verse.translation, 'Translation text')
})

test('Gita Telugu client fetches serial verse path', async () => {
  let requestedUrl: URL | undefined
  const client = new GitaTeluguClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createVerseResponse())
    }) as typeof fetch,
  })

  await client.getVerse({ language: 'odi', serial: 2 })

  assert.equal(requestedUrl?.href, 'https://gita-api.vercel.app/odi/verse/2')
})

test('Gita Telugu usecase projects verse metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createVerseResponse())) as typeof fetch
  try {
    const result = await getGitaTeluguVerse({ language: 'tel', chapter: 1, verse: 1 })

    assert.equal(result.kind, 'gitatelugu.verse')
    assert.equal(result.api.provider, 'gita-telugu')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.deepEqual(result.query, { language: 'tel', chapter: 1, verse: 1 })
    assert.deepEqual(result.verse.text, ['Verse text'])
    assert.deepEqual(result.verse.purport, ['Purport line'])
    assert.equal(result.navigation.previous, undefined)
    assert.equal(result.navigation.next?.command, 'public-apis apis run gitatelugu.verse -- --language tel --chapter 1 --verse 2')
    assert.equal(result.navigation.alternateLanguage.command, 'public-apis apis run gitatelugu.verse -- --language odi --chapter 1 --verse 1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Gita Telugu usecase projects chapter boundary navigation', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createVerseResponse({ chapter_no: 1, verse_no: 47 }))) as typeof fetch
  try {
    const result = await getGitaTeluguVerse({ language: 'tel', chapter: 1, verse: 47 })

    assert.equal(result.navigation.previous?.command, 'public-apis apis run gitatelugu.verse -- --language tel --chapter 1 --verse 46')
    assert.equal(result.navigation.next?.command, 'public-apis apis run gitatelugu.verse -- --language tel --chapter 2 --verse 1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Gita Telugu usecase projects end-of-book navigation', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createVerseResponse({ chapter_no: 18, verse_no: 78 }))) as typeof fetch
  try {
    const result = await getGitaTeluguVerse({ language: 'odi', chapter: 18, verse: 78 })

    assert.equal(result.navigation.next, undefined)
    assert.equal(result.navigation.previous?.command, 'public-apis apis run gitatelugu.verse -- --language odi --chapter 18 --verse 77')
    assert.equal(result.navigation.alternateLanguage.command, 'public-apis apis run gitatelugu.verse -- --language tel --chapter 18 --verse 78')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Gita Telugu usecase validates curated inputs', async () => {
  await assert.rejects(() => getGitaTeluguVerse({ language: 'eng' }), /tel or odi/u)
  await assert.rejects(() => getGitaTeluguVerse({ chapter: 19 }), /1 to 18/u)
  await assert.rejects(() => getGitaTeluguVerse({ verse: 79 }), /1 to 78/u)
  await assert.rejects(() => getGitaTeluguVerse({ serial: 701 }), /1 to 700/u)
})

test('Gita Telugu client surfaces API errors', async () => {
  const client = new GitaTeluguClient({
    fetchImpl: (async () => jsonResponse({ error: 'Language not implemented', message: 'Language eng not implemented yet' })) as typeof fetch,
  })

  await assert.rejects(
    () => client.getVerse({ language: 'tel', chapter: 1, verse: 1 }),
    /Language eng not implemented/u,
  )
})

function createVerseResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    chapter_no: 1,
    verse_no: 1,
    language: 'telugu',
    chapter_name: '1. Chapter',
    verse: 'Verse text',
    transliteration: '',
    synonyms: 'Synonyms text',
    audio_link: 'https://www.holy-bhagavad-gita.org/public/audio/001_001.mp3',
    translation: 'Translation text',
    purport: ['Purport line'],
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
