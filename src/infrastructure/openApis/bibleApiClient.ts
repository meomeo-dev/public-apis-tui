import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BIBLE_API_DEFAULT_BASE_URL = 'https://bible-api.com'

export type BibleApiPassageQuery = {
  reference: string
  translation?: string | undefined
}

export type BibleApiRandomQuery = {
  translation?: string | undefined
  book?: string | undefined
  chapter?: number | undefined
}

export type BibleApiTranslation = {
  identifier: string
  name: string
  language: string
  languageCode: string
  license: string
}

export type BibleApiVerse = {
  bookId: string
  bookName: string
  chapter: number
  verse: number
  text: string
}

export type BibleApiPassageResponse = {
  reference: string
  verses: BibleApiVerse[]
  text: string
  translationId: string
  translationName: string
  translationNote?: string | undefined
}

export type BibleApiRandomResponse = {
  translation: BibleApiTranslation
  randomVerse: BibleApiVerse
}

export type BibleApiClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class BibleApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: BibleApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? BIBLE_API_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getPassage(query: BibleApiPassageQuery): Promise<BibleApiPassageResponse> {
    const url = new URL(`/${encodeReferencePath(query.reference)}`, this.baseUrl)
    appendOptionalStringParam(url, 'translation', query.translation)
    const parsed = await this.fetchJson(url)
    return parsePassageResponse(parsed)
  }

  async getRandomVerse(query: BibleApiRandomQuery = {}): Promise<BibleApiRandomResponse> {
    const pathParts = ['data', query.translation?.trim() || 'web', 'random']
    if (query.book !== undefined && query.book.trim() !== '') {
      pathParts.push(query.book.trim())
      if (query.chapter !== undefined) {
        pathParts.push(String(query.chapter))
      }
    }
    const url = new URL(`/${pathParts.map(encodeURIComponent).join('/')}`, this.baseUrl)
    const parsed = await this.fetchJson(url)
    return parseRandomResponse(parsed)
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || isApiError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? response.statusText ?? 'Bible-api request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parsePassageResponse(value: unknown): BibleApiPassageResponse {
  if (!isRecord(value) || typeof value.reference !== 'string' || typeof value.text !== 'string' || typeof value.translation_id !== 'string' || typeof value.translation_name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api passage response is missing required fields.')
  }
  if (!Array.isArray(value.verses)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api passage response verses field must be an array.')
  }
  return {
    reference: value.reference,
    verses: value.verses.map(parseVerse),
    text: value.text,
    translationId: value.translation_id,
    translationName: value.translation_name,
    ...(typeof value.translation_note === 'string' ? { translationNote: value.translation_note } : {}),
  }
}

function parseRandomResponse(value: unknown): BibleApiRandomResponse {
  if (!isRecord(value) || !isRecord(value.translation) || !isRecord(value.random_verse)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api random response is missing required fields.')
  }
  return {
    translation: parseTranslation(value.translation),
    randomVerse: parseVerse(value.random_verse),
  }
}

function parseTranslation(value: Record<string, unknown>): BibleApiTranslation {
  if (typeof value.identifier !== 'string' || typeof value.name !== 'string' || typeof value.language !== 'string' || typeof value.language_code !== 'string' || typeof value.license !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api translation response is missing required fields.')
  }
  return {
    identifier: value.identifier,
    name: value.name,
    language: value.language,
    languageCode: value.language_code,
    license: value.license,
  }
}

function parseVerse(value: unknown): BibleApiVerse {
  if (!isRecord(value) || typeof value.book_id !== 'string' || typeof value.chapter !== 'number' || typeof value.verse !== 'number' || typeof value.text !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api verse response is missing required fields.')
  }
  const bookName = typeof value.book_name === 'string' ? value.book_name : typeof value.book === 'string' ? value.book : undefined
  if (bookName === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bible-api verse response is missing book name.')
  }
  return {
    bookId: value.book_id,
    bookName,
    chapter: value.chapter,
    verse: value.verse,
    text: value.text,
  }
}

function encodeReferencePath(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/gu, '+')
}

function appendOptionalStringParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isApiError(value: unknown): boolean {
  return isRecord(value) && typeof value.error === 'string'
}

function readApiError(value: unknown): string | undefined {
  return isRecord(value) && typeof value.error === 'string' ? value.error : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
