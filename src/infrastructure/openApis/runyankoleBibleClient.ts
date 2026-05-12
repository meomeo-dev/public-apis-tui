import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RUNYANKOLE_BIBLE_DEFAULT_BASE_URL =
  'https://runyankole-bible-api.vercel.app'

export type RunyankoleBibleBook = {
  id: number
  shortName: string
  longName: string
}

export type RunyankoleBibleVerse = {
  bookId: number
  bookShort: string
  bookName: string
  chapter: number
  verse: number
  text: string
}

export type RunyankoleBibleChapterVerse = {
  verse: number
  text: string
}

export type RunyankoleBibleChapter = {
  bookId: number
  bookShort: string
  bookName: string
  chapter: number
  verseCount: number
  verses: RunyankoleBibleChapterVerse[]
}

export type RunyankoleBibleSearchResponse = {
  query: string
  total: number
  limit: number
  offset: number
  results: RunyankoleBibleVerse[]
}

type BooksPayload = {
  count?: unknown
  books?: unknown
}

type BookPayload = {
  id?: unknown
  short_name?: unknown
  long_name?: unknown
}

type VersePayload = {
  book_id?: unknown
  book_short?: unknown
  book_name?: unknown
  chapter?: unknown
  verse?: unknown
  text?: unknown
}

type ChapterPayload = {
  book_id?: unknown
  book_short?: unknown
  book_name?: unknown
  chapter?: unknown
  verse_count?: unknown
  verses?: unknown
}

type ChapterVersePayload = {
  verse?: unknown
  text?: unknown
}

type SearchPayload = {
  query?: unknown
  total?: unknown
  limit?: unknown
  offset?: unknown
  results?: unknown
}

export class RunyankoleBibleClient {
  constructor(
    private readonly baseUrl = RUNYANKOLE_BIBLE_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async books(): Promise<RunyankoleBibleBook[]> {
    const parsed = await this.fetchJson('/api/books')
    return parseBooks(parsed)
  }

  async verse(
    book: number,
    chapter: number,
    verse: number,
  ): Promise<RunyankoleBibleVerse> {
    const url = this.createApiUrl('/api/verse')
    url.searchParams.set('book', String(book))
    url.searchParams.set('chapter', String(chapter))
    url.searchParams.set('verse', String(verse))
    return parseVerse(await this.fetchJson(url))
  }

  async chapter(book: number, chapter: number): Promise<RunyankoleBibleChapter> {
    const url = this.createApiUrl('/api/chapter')
    url.searchParams.set('book', String(book))
    url.searchParams.set('chapter', String(chapter))
    return parseChapter(await this.fetchJson(url))
  }

  async search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<RunyankoleBibleSearchResponse> {
    const url = this.createApiUrl('/api/search')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    return parseSearch(await this.fetchJson(url))
  }

  async random(book?: number | undefined): Promise<RunyankoleBibleVerse> {
    const url = this.createApiUrl('/api/random')
    if (book !== undefined) url.searchParams.set('book', String(book))
    return parseVerse(await this.fetchJson(url))
  }

  private createApiUrl(path: string): URL {
    return new URL(path, normalizeBaseUrl(this.baseUrl))
  }

  private async fetchJson(pathOrUrl: string | URL): Promise<unknown> {
    const url = typeof pathOrUrl === 'string'
      ? this.createApiUrl(pathOrUrl)
      : pathOrUrl
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Runyankole Bible request failed: ${String(error)}`,
        { provider: 'runyankolebible', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Runyankole Bible is currently returning a Cloudflare challenge',
          'HTML page instead of the documented JSON API response; retry',
          'later or use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    const contentType = response.headers.get('content-type') ?? undefined
    if (!contentType?.toLowerCase().includes('application/json')) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Runyankole Bible response was not JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Runyankole Bible response could not be parsed as JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    if (!response.ok || isApiError(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readApiError(parsed) ?? `Runyankole Bible HTTP ${response.status}.`,
        {
          ...details,
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'runyankolebible',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429)
    && contentType.includes('text/html')
    && (
      mitigated === 'challenge'
      || server.includes('cloudflare')
      || /<title>\s*just a moment/i.test(body)
    )
  )
}

function parseBooks(value: unknown): RunyankoleBibleBook[] {
  const books = isRecord(value) ? (value as BooksPayload).books : undefined
  if (!Array.isArray(books)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Runyankole Bible books response is missing books array.',
      { provider: 'runyankolebible' },
    )
  }
  return books.map(parseBook)
}

function parseBook(value: unknown): RunyankoleBibleBook {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Runyankole Bible book record was not an object.',
      { provider: 'runyankolebible' },
    )
  }
  const payload = value as BookPayload
  return {
    id: readInteger(payload.id, 'id'),
    shortName: readString(payload.short_name, 'short_name'),
    longName: readString(payload.long_name, 'long_name'),
  }
}

function parseVerse(value: unknown): RunyankoleBibleVerse {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Runyankole Bible verse record was not an object.',
      { provider: 'runyankolebible' },
    )
  }
  const payload = value as VersePayload
  return {
    bookId: readInteger(payload.book_id, 'book_id'),
    bookShort: readString(payload.book_short, 'book_short'),
    bookName: readString(payload.book_name, 'book_name'),
    chapter: readInteger(payload.chapter, 'chapter'),
    verse: readInteger(payload.verse, 'verse'),
    text: readString(payload.text, 'text'),
  }
}

function parseChapter(value: unknown): RunyankoleBibleChapter {
  const payload = isRecord(value) ? value as ChapterPayload : undefined
  const verses = payload?.verses
  if (payload === undefined || !Array.isArray(verses)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Runyankole Bible chapter response is missing verses array.',
      { provider: 'runyankolebible' },
    )
  }
  return {
    bookId: readInteger(payload.book_id, 'book_id'),
    bookShort: readString(payload.book_short, 'book_short'),
    bookName: readString(payload.book_name, 'book_name'),
    chapter: readInteger(payload.chapter, 'chapter'),
    verseCount: readInteger(payload.verse_count, 'verse_count'),
    verses: verses.map(parseChapterVerse),
  }
}

function parseChapterVerse(value: unknown): RunyankoleBibleChapterVerse {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Runyankole Bible chapter verse record was not an object.',
      { provider: 'runyankolebible' },
    )
  }
  const payload = value as ChapterVersePayload
  return {
    verse: readInteger(payload.verse, 'verse'),
    text: readString(payload.text, 'text'),
  }
}

function parseSearch(value: unknown): RunyankoleBibleSearchResponse {
  const payload = isRecord(value) ? value as SearchPayload : undefined
  const results = payload?.results
  if (payload === undefined || !Array.isArray(results)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Runyankole Bible search response is missing results array.',
      { provider: 'runyankolebible' },
    )
  }
  return {
    query: readString(payload.query, 'query'),
    total: readInteger(payload.total, 'total'),
    limit: readInteger(payload.limit, 'limit'),
    offset: readInteger(payload.offset, 'offset'),
    results: results.map(parseVerse),
  }
}

function readInteger(value: unknown, key: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Runyankole Bible response is missing integer field ${key}.`,
    { provider: 'runyankolebible', key },
  )
}

function readString(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Runyankole Bible response is missing string field ${key}.`,
    { provider: 'runyankolebible', key },
  )
}

function isApiError(value: unknown): boolean {
  return isRecord(value) && typeof value.error === 'string'
}

function readApiError(value: unknown): string | undefined {
  return isRecord(value) && typeof value.error === 'string'
    ? value.error
    : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
