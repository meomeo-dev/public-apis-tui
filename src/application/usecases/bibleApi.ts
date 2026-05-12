import { BibleApiClient, type BibleApiVerse } from '../../infrastructure/openApis/bibleApiClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type BibleApiPassageInput = {
  reference?: string | undefined
  translation?: string | undefined
  maxVerses?: number | undefined
}

export type BibleApiRandomInput = {
  translation?: string | undefined
  book?: string | undefined
  chapter?: number | undefined
}

export type BibleApiMeta = {
  provider: 'bible-api'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /{reference}' | 'GET /data/{translation}/random[/book[/chapter]]'
  docsUrl: 'https://bible-api.com/'
  usesBrowserClickstream: false
  authentication: 'none'
  rateLimit: '15 requests / 30 seconds / IP'
  documentedMaximumResult: string
}

export type BibleApiVerseResult = {
  bookId: string
  bookName: string
  chapter: number
  verse: number
  text: string
}

export type BibleApiPassageResult = {
  kind: 'bibleapi.passage'
  api: BibleApiMeta
  query: {
    reference: string
    translation: string
    maxVerses: number
  }
  reference: string
  translation: {
    id: string
    name: string
    note?: string | undefined
  }
  count: number
  totalVerses: number
  text: string
  verses: BibleApiVerseResult[]
}

export type BibleApiRandomResult = {
  kind: 'bibleapi.random'
  api: BibleApiMeta
  query: {
    translation: string
    book?: string | undefined
    chapter?: number | undefined
  }
  translation: {
    id: string
    name: string
    language: string
    languageCode: string
    license: string
  }
  verse: BibleApiVerseResult
}

export async function getBibleApiPassage(input: BibleApiPassageInput = {}): Promise<BibleApiPassageResult> {
  const query = normalizePassageInput(input)
  const client = new BibleApiClient()
  const passage = await client.getPassage({ reference: query.reference, translation: query.translation })
  const verses = passage.verses.slice(0, query.maxVerses).map(toVerseResult)
  return {
    kind: 'bibleapi.passage',
    api: createApiMeta('GET /{reference}', 'Passage lookup returns all verses in the requested reference; CLI defaults/caps displayed rows at 30 for terminal and cache safety.'),
    query,
    reference: passage.reference,
    translation: {
      id: passage.translationId,
      name: passage.translationName,
      ...(passage.translationNote !== undefined ? { note: passage.translationNote } : {}),
    },
    count: verses.length,
    totalVerses: passage.verses.length,
    text: passage.text.trim(),
    verses,
  }
}

export async function getBibleApiRandom(input: BibleApiRandomInput = {}): Promise<BibleApiRandomResult> {
  const query = normalizeRandomInput(input)
  const client = new BibleApiClient()
  const random = await client.getRandomVerse(query)
  return {
    kind: 'bibleapi.random',
    api: createApiMeta('GET /data/{translation}/random[/book[/chapter]]', 'Random endpoint returns one verse; no pagination maximum applies.'),
    query,
    translation: {
      id: random.translation.identifier,
      name: random.translation.name,
      language: random.translation.language,
      languageCode: random.translation.languageCode,
      license: random.translation.license,
    },
    verse: toVerseResult(random.randomVerse),
  }
}

function normalizePassageInput(input: BibleApiPassageInput): BibleApiPassageResult['query'] {
  return {
    reference: normalizeReference(input.reference),
    translation: normalizeTranslation(input.translation),
    maxVerses: normalizeMaxVerses(input.maxVerses),
  }
}

function normalizeRandomInput(input: BibleApiRandomInput): BibleApiRandomResult['query'] {
  const book = normalizeOptionalBook(input.book)
  if (input.chapter !== undefined && book === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Bible-api --chapter requires --book for random verse filtering.', {
      chapter: input.chapter,
    })
  }
  return {
    translation: normalizeTranslation(input.translation),
    ...(book !== undefined ? { book } : {}),
    ...(input.chapter !== undefined ? { chapter: normalizeChapter(input.chapter) } : {}),
  }
}

function createApiMeta(endpoint: BibleApiMeta['endpoint'], documentedMaximumResult: string): BibleApiMeta {
  return {
    provider: 'bible-api',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://bible-api.com/',
    usesBrowserClickstream: false,
    authentication: 'none',
    rateLimit: '15 requests / 30 seconds / IP',
    documentedMaximumResult,
  }
}

function normalizeReference(value: string | undefined): string {
  const reference = value?.trim() || 'John 3:16'
  if (reference.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Bible-api --reference must be 120 characters or fewer.', {
      reference: value,
    })
  }
  return reference
}

function normalizeTranslation(value: string | undefined): string {
  const translation = value?.trim().toLowerCase() || 'web'
  if (!/^[a-z0-9_-]{2,32}$/u.test(translation)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Bible-api --translation must be a documented translation id such as web, kjv, or cuv.', {
      translation: value,
    })
  }
  return translation
}

function normalizeMaxVerses(value: number | undefined): number {
  const maxVerses = value ?? 30
  if (!Number.isInteger(maxVerses) || maxVerses < 1 || maxVerses > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Bible-api --max-verses must be an integer from 1 to 100.', {
      maxVerses: value,
    })
  }
  return maxVerses
}

function normalizeOptionalBook(value: string | undefined): string | undefined {
  const book = value?.trim().toUpperCase()
  if (book === undefined || book === '') {
    return undefined
  }
  if (!/^[1-3]?[A-Z]{2,4}$/u.test(book)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Bible-api --book must be a documented OSIS-style book id such as JHN, GEN, or 1CO.', {
      book: value,
    })
  }
  return book
}

function normalizeChapter(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 150) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Bible-api --chapter must be an integer from 1 to 150.', {
      chapter: value,
    })
  }
  return value
}

function toVerseResult(verse: BibleApiVerse): BibleApiVerseResult {
  return {
    bookId: verse.bookId,
    bookName: verse.bookName,
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text.trim(),
  }
}
