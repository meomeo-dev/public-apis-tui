import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const QURAN_API_DEFAULT_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1'
export const QURAN_API_DEFAULT_EDITION = 'eng-ummmuhammad'
export const QURAN_API_DEFAULT_CHAPTER = 1
export const QURAN_API_DEFAULT_VERSE = 1
export const QURAN_API_DEFAULT_CHAPTER_LIMIT = 286
export const QURAN_API_MAX_CHAPTER_LIMIT = 286

export type QuranApiClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type QuranApiVerseQuery = {
  edition?: string | undefined
  chapter?: number | undefined
  verse?: number | undefined
}

export type QuranApiChapterQuery = {
  edition?: string | undefined
  chapter?: number | undefined
  offset?: number | undefined
  limit?: number | undefined
}

export type QuranApiVerse = {
  chapter: number
  verse: number
  text: string
}

export type QuranApiChapterPage = {
  verses: QuranApiVerse[]
  totalVerses: number
}

export class QuranApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: QuranApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? QURAN_API_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getVerse(query: QuranApiVerseQuery = {}): Promise<QuranApiVerse> {
    const normalized = normalizeVerseQuery(query)
    const parsed = await this.fetchJson(this.createUrl(`/editions/${encodeURIComponent(normalized.edition)}/${String(normalized.chapter)}/${String(normalized.verse)}.json`))
    return parseVerse(parsed)
  }

  async getChapter(query: QuranApiChapterQuery = {}): Promise<QuranApiChapterPage> {
    const normalized = normalizeChapterQuery(query)
    const parsed = await this.fetchJson(this.createUrl(`/editions/${encodeURIComponent(normalized.edition)}/${String(normalized.chapter)}.json`))
    const verses = parseChapter(parsed)
    return {
      verses: verses.slice(normalized.offset, normalized.offset + normalized.limit),
      totalVerses: verses.length,
    }
  }

  private createUrl(path: string): URL {
    return new URL(`${this.baseUrl}${path}`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Quran-api returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'Quran-api request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeQuranApiVerseQuery(query: QuranApiVerseQuery = {}): { edition: string; chapter: number; verse: number } {
  return normalizeVerseQuery(query)
}

export function normalizeQuranApiChapterQuery(query: QuranApiChapterQuery = {}): { edition: string; chapter: number; offset: number; limit: number } {
  return normalizeChapterQuery(query)
}

function normalizeVerseQuery(query: QuranApiVerseQuery = {}): { edition: string; chapter: number; verse: number } {
  return {
    edition: query.edition?.trim() || QURAN_API_DEFAULT_EDITION,
    chapter: clampChapter(query.chapter),
    verse: clampPositiveInteger(query.verse, QURAN_API_DEFAULT_VERSE),
  }
}

function normalizeChapterQuery(query: QuranApiChapterQuery = {}): { edition: string; chapter: number; offset: number; limit: number } {
  return {
    edition: query.edition?.trim() || QURAN_API_DEFAULT_EDITION,
    chapter: clampChapter(query.chapter),
    offset: clampOffset(query.offset),
    limit: clampChapterLimit(query.limit),
  }
}

function parseVerse(value: unknown): QuranApiVerse {
  if (!isRecord(value) || typeof value.chapter !== 'number' || typeof value.verse !== 'number' || typeof value.text !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Quran-api verse response is missing required fields.')
  }
  return { chapter: value.chapter, verse: value.verse, text: value.text }
}

function parseChapter(value: unknown): QuranApiVerse[] {
  if (Array.isArray(value)) {
    return value.map(parseVerse)
  }
  if (isRecord(value) && Array.isArray(value.chapter)) {
    return value.chapter.map(parseVerse)
  }
  throw new RuntimeFailure('OPEN_API_FAILED', 'Quran-api chapter response is missing chapter array.')
}

function clampChapter(value: number | undefined): number {
  const normalized = clampPositiveInteger(value, QURAN_API_DEFAULT_CHAPTER)
  return Math.min(normalized, 114)
}

function clampChapterLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return QURAN_API_DEFAULT_CHAPTER_LIMIT
  }
  return Math.min(Math.trunc(value), QURAN_API_MAX_CHAPTER_LIMIT)
}

function clampOffset(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 0) {
    return 0
  }
  return Math.trunc(value)
}

function clampPositiveInteger(value: number | undefined, defaultValue: number): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return defaultValue
  }
  return Math.trunc(value)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
