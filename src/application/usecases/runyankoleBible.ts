import {
  RunyankoleBibleClient,
  type RunyankoleBibleBook,
  type RunyankoleBibleChapterVerse,
  type RunyankoleBibleVerse,
} from '../../infrastructure/openApis/runyankoleBibleClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RUNYANKOLE_BIBLE_DEFAULT_BOOK = 10
export const RUNYANKOLE_BIBLE_DEFAULT_CHAPTER = 1
export const RUNYANKOLE_BIBLE_DEFAULT_VERSE = 1
export const RUNYANKOLE_BIBLE_DEFAULT_QUERY = 'Ruhanga'
export const RUNYANKOLE_BIBLE_DEFAULT_LIMIT = 20
export const RUNYANKOLE_BIBLE_MAX_LIMIT = 100
export const RUNYANKOLE_BIBLE_MAX_OFFSET = 31_106

type RunyankoleBibleEndpoint =
  | 'GET /api/books'
  | 'GET /api/verse?book={book}&chapter={chapter}&verse={verse}'
  | 'GET /api/chapter?book={book}&chapter={chapter}'
  | 'GET /api/search?q={query}&limit={limit}&offset={offset}'
  | 'GET /api/random[?book={book}]'

type RunyankoleBibleApiMeta = {
  provider: 'runyankolebible'
  endpoint: RunyankoleBibleEndpoint
  docsUrl: 'https://runyankole-bible-api.vercel.app/'
  apiUrl: 'https://runyankole-bible-api.vercel.app'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  translation: 'Baibuli Erikwera 1964'
  attribution: 'The Bible Society of Uganda'
  boundary: string
  paginationPolicy: string
  excluded: string[]
}

type Pagination = {
  total: number
  returned: number
  limit: number
  offset: number
  nextOffset?: number | undefined
  maxLimit: number
}

export type RunyankoleBibleBooksInput = {
  limit?: number | undefined
  offset?: number | undefined
}

export type RunyankoleBibleVerseInput = {
  book?: number | undefined
  chapter?: number | undefined
  verse?: number | undefined
}

export type RunyankoleBibleChapterInput = {
  book?: number | undefined
  chapter?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type RunyankoleBibleSearchInput = {
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type RunyankoleBibleRandomInput = {
  book?: number | undefined
}

export type RunyankoleBibleBooksQuery = {
  limit: number
  offset: number
}

export type RunyankoleBibleReferenceQuery = {
  book: number
  chapter: number
  verse: number
}

export type RunyankoleBibleChapterQuery = {
  book: number
  chapter: number
  limit: number
  offset: number
}

export type RunyankoleBibleSearchQuery = {
  query: string
  limit: number
  offset: number
}

export type RunyankoleBibleRandomQuery = {
  book?: number | undefined
}

export type RunyankoleBibleBooksResult = {
  kind: 'runyankolebible.books'
  api: RunyankoleBibleApiMeta
  query: RunyankoleBibleBooksQuery
  pagination: Pagination
  count: number
  books: RunyankoleBibleBook[]
}

export type RunyankoleBibleVerseResult = {
  kind: 'runyankolebible.verse'
  api: RunyankoleBibleApiMeta
  query: RunyankoleBibleReferenceQuery
  verse: RunyankoleBibleVerse
}

export type RunyankoleBibleChapterResult = {
  kind: 'runyankolebible.chapter'
  api: RunyankoleBibleApiMeta
  query: RunyankoleBibleChapterQuery
  pagination: Pagination
  count: number
  book: {
    id: number
    shortName: string
    name: string
  }
  chapter: number
  totalVerses: number
  verses: Array<RunyankoleBibleChapterVerse & {
    bookId: number
    bookShort: string
    bookName: string
    chapter: number
  }>
}

export type RunyankoleBibleSearchResult = {
  kind: 'runyankolebible.search'
  api: RunyankoleBibleApiMeta
  query: RunyankoleBibleSearchQuery
  pagination: Pagination
  count: number
  verses: RunyankoleBibleVerse[]
}

export type RunyankoleBibleRandomResult = {
  kind: 'runyankolebible.random'
  api: RunyankoleBibleApiMeta
  query: RunyankoleBibleRandomQuery
  verse: RunyankoleBibleVerse
}

export async function getRunyankoleBibleBooks(
  input: RunyankoleBibleBooksInput = {},
): Promise<RunyankoleBibleBooksResult> {
  const query = normalizeRunyankoleBibleBooksInput(input)
  const books = await new RunyankoleBibleClient().books()
  const page = paginate(books, query)
  return {
    kind: 'runyankolebible.books',
    api: createApiMeta('GET /api/books'),
    query,
    pagination: page.pagination,
    count: page.items.length,
    books: page.items,
  }
}

export async function getRunyankoleBibleVerse(
  input: RunyankoleBibleVerseInput = {},
): Promise<RunyankoleBibleVerseResult> {
  const query = normalizeRunyankoleBibleVerseInput(input)
  return {
    kind: 'runyankolebible.verse',
    api: createApiMeta(
      'GET /api/verse?book={book}&chapter={chapter}&verse={verse}',
    ),
    query,
    verse: await new RunyankoleBibleClient().verse(
      query.book,
      query.chapter,
      query.verse,
    ),
  }
}

export async function getRunyankoleBibleChapter(
  input: RunyankoleBibleChapterInput = {},
): Promise<RunyankoleBibleChapterResult> {
  const query = normalizeRunyankoleBibleChapterInput(input)
  const chapter = await new RunyankoleBibleClient().chapter(
    query.book,
    query.chapter,
  )
  const verses = chapter.verses.map(verse => ({
    ...verse,
    bookId: chapter.bookId,
    bookShort: chapter.bookShort,
    bookName: chapter.bookName,
    chapter: chapter.chapter,
  }))
  const page = paginate(verses, query)
  return {
    kind: 'runyankolebible.chapter',
    api: createApiMeta('GET /api/chapter?book={book}&chapter={chapter}'),
    query,
    pagination: page.pagination,
    count: page.items.length,
    book: {
      id: chapter.bookId,
      shortName: chapter.bookShort,
      name: chapter.bookName,
    },
    chapter: chapter.chapter,
    totalVerses: chapter.verseCount,
    verses: page.items,
  }
}

export async function searchRunyankoleBible(
  input: RunyankoleBibleSearchInput = {},
): Promise<RunyankoleBibleSearchResult> {
  const query = normalizeRunyankoleBibleSearchInput(input)
  const search = await new RunyankoleBibleClient().search(
    query.query,
    query.limit,
    query.offset,
  )
  const nextOffset = search.offset + search.results.length < search.total
    ? search.offset + search.results.length
    : undefined
  return {
    kind: 'runyankolebible.search',
    api: createApiMeta(
      'GET /api/search?q={query}&limit={limit}&offset={offset}',
    ),
    query: {
      query: search.query,
      limit: search.limit,
      offset: search.offset,
    },
    pagination: {
      total: search.total,
      returned: search.results.length,
      limit: search.limit,
      offset: search.offset,
      ...(nextOffset !== undefined ? { nextOffset } : {}),
      maxLimit: RUNYANKOLE_BIBLE_MAX_LIMIT,
    },
    count: search.results.length,
    verses: search.results,
  }
}

export async function getRunyankoleBibleRandom(
  input: RunyankoleBibleRandomInput = {},
): Promise<RunyankoleBibleRandomResult> {
  const query = normalizeRunyankoleBibleRandomInput(input)
  return {
    kind: 'runyankolebible.random',
    api: createApiMeta('GET /api/random[?book={book}]'),
    query,
    verse: await new RunyankoleBibleClient().random(query.book),
  }
}

export function normalizeRunyankoleBibleBooksInput(
  input: RunyankoleBibleBooksInput = {},
): RunyankoleBibleBooksQuery {
  return {
    limit: normalizeLimit(input.limit, 66),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeRunyankoleBibleVerseInput(
  input: RunyankoleBibleVerseInput = {},
): RunyankoleBibleReferenceQuery {
  return {
    book: normalizeBook(input.book),
    chapter: normalizeChapter(input.chapter),
    verse: normalizeVerse(input.verse),
  }
}

export function normalizeRunyankoleBibleChapterInput(
  input: RunyankoleBibleChapterInput = {},
): RunyankoleBibleChapterQuery {
  return {
    book: normalizeBook(input.book),
    chapter: normalizeChapter(input.chapter),
    limit: normalizeLimit(input.limit, RUNYANKOLE_BIBLE_DEFAULT_LIMIT),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeRunyankoleBibleSearchInput(
  input: RunyankoleBibleSearchInput = {},
): RunyankoleBibleSearchQuery {
  return {
    query: normalizeSearchQuery(input.query),
    limit: normalizeLimit(input.limit, RUNYANKOLE_BIBLE_DEFAULT_LIMIT),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeRunyankoleBibleRandomInput(
  input: RunyankoleBibleRandomInput = {},
): RunyankoleBibleRandomQuery {
  return input.book === undefined ? {} : { book: normalizeBook(input.book) }
}

function paginate<T>(
  items: T[],
  query: { limit: number; offset: number },
): { items: T[]; pagination: Pagination } {
  const sliced = items.slice(query.offset, query.offset + query.limit)
  const nextOffset = query.offset + query.limit < items.length
    ? query.offset + query.limit
    : undefined
  return {
    items: sliced,
    pagination: {
      total: items.length,
      returned: sliced.length,
      limit: query.limit,
      offset: query.offset,
      ...(nextOffset !== undefined ? { nextOffset } : {}),
      maxLimit: RUNYANKOLE_BIBLE_MAX_LIMIT,
    },
  }
}

function createApiMeta(endpoint: RunyankoleBibleEndpoint): RunyankoleBibleApiMeta {
  return {
    provider: 'runyankolebible',
    endpoint,
    docsUrl: 'https://runyankole-bible-api.vercel.app/',
    apiUrl: 'https://runyankole-bible-api.vercel.app',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    translation: 'Baibuli Erikwera 1964',
    attribution: 'The Bible Society of Uganda',
    boundary: [
      'Documented read-only JSON endpoints only; HTML pages, browser',
      'scraping, arbitrary route proxying, upload, delete, account, and',
      'share workflows are excluded.',
    ].join(' '),
    paginationPolicy: [
      'Books and chapters are locally paginated. Search uses documented',
      `upstream limit and offset with limit cap ${RUNYANKOLE_BIBLE_MAX_LIMIT}.`,
    ].join(' '),
    excluded: [
      'Homepage HTML as data',
      'Undocumented path guesses',
      'Browser clickstream',
      'Bulk text download workflows',
      'Upload/delete/share workflows',
      'Binary or base64 payloads',
    ],
  }
}

function normalizeBook(value: number | undefined): number {
  const book = value ?? RUNYANKOLE_BIBLE_DEFAULT_BOOK
  if (!Number.isInteger(book) || book < 10 || book > 730) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Runyankole Bible --book must be an integer from 10 to 730.',
      { book: value },
    )
  }
  return book
}

function normalizeChapter(value: number | undefined): number {
  const chapter = value ?? RUNYANKOLE_BIBLE_DEFAULT_CHAPTER
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Runyankole Bible --chapter must be an integer from 1 to 150.',
      { chapter: value },
    )
  }
  return chapter
}

function normalizeVerse(value: number | undefined): number {
  const verse = value ?? RUNYANKOLE_BIBLE_DEFAULT_VERSE
  if (!Number.isInteger(verse) || verse < 1 || verse > 176) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Runyankole Bible --verse must be an integer from 1 to 176.',
      { verse: value },
    )
  }
  return verse
}

function normalizeSearchQuery(value: string | undefined): string {
  const query = value?.trim().replace(/\s+/gu, ' ')
    ?? RUNYANKOLE_BIBLE_DEFAULT_QUERY
  if (query.length < 2 || query.length > 80) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Runyankole Bible --query must be between 2 and 80 characters.',
      { query: value },
    )
  }
  if (hasUnsafeSearchQueryChars(query)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Runyankole Bible --query must not include slash, query, fragment,',
        'backslash, or control characters.',
      ].join(' '),
      { query: value },
    )
  }
  return query
}

function hasUnsafeSearchQueryChars(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    if (character === '/' || character === '?' || character === '#') return true
    if (character === '\\' || codePoint <= 0x1f || codePoint === 0x7f) {
      return true
    }
  }
  return false
}

function normalizeLimit(
  value: number | undefined,
  defaultValue: number,
): number {
  const limit = value ?? defaultValue
  if (!Number.isInteger(limit) || limit < 1 || limit > RUNYANKOLE_BIBLE_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Runyankole Bible --limit must be an integer from 1 to',
        `${RUNYANKOLE_BIBLE_MAX_LIMIT}.`,
      ].join(' '),
      { limit: value },
    )
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (
    !Number.isInteger(offset)
    || offset < 0
    || offset > RUNYANKOLE_BIBLE_MAX_OFFSET
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Runyankole Bible --offset must be an integer from 0 to',
        `${RUNYANKOLE_BIBLE_MAX_OFFSET}.`,
      ].join(' '),
      { offset: value },
    )
  }
  return offset
}
