import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GITA_TELUGU_DEFAULT_BASE_URL = 'https://gita-api.vercel.app'

export type GitaLanguage = 'tel' | 'odi'

export type GitaVerseQuery = {
  language: GitaLanguage
  chapter?: number | undefined
  verse?: number | undefined
  serial?: number | undefined
}

export type GitaVerse = {
  chapterNo: number
  verseNo: number | number[]
  language: string
  chapterName: string
  verse: string | string[]
  transliteration?: string | string[] | undefined
  synonyms?: string | string[] | Array<[string, string]> | undefined
  audioLink?: string | undefined
  translation: string
  purport: string | string[]
}

export type GitaTeluguClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class GitaTeluguClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: GitaTeluguClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? GITA_TELUGU_DEFAULT_BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getVerse(query: GitaVerseQuery): Promise<GitaVerse> {
    const path = query.serial === undefined
      ? `${query.language}/verse/${query.chapter ?? 1}/${query.verse ?? 1}`
      : `${query.language}/verse/${query.serial}`
    const response = await this.fetchImpl(new URL(path, `${this.baseUrl.replace(/\/$/u, '')}/`), {
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'Gita Telugu API returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || isApiError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Gita Telugu API request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseVerse(parsed)
  }
}

function parseVerse(value: unknown): GitaVerse {
  if (!isRecord(value) || typeof value.chapter_no !== 'number' || typeof value.language !== 'string' || typeof value.chapter_name !== 'string' || typeof value.translation !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Gita Telugu API verse response is missing required fields.')
  }
  if (!isStringOrStringArray(value.verse) || !isStringOrStringArray(value.purport) || !isVerseNumber(value.verse_no)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Gita Telugu API verse response has an unsupported verse shape.')
  }

  return {
    chapterNo: value.chapter_no,
    verseNo: value.verse_no,
    language: value.language,
    chapterName: value.chapter_name,
    verse: value.verse,
    ...(isStringOrStringArray(value.transliteration) ? { transliteration: value.transliteration } : {}),
    ...(isSynonyms(value.synonyms) ? { synonyms: value.synonyms } : {}),
    ...(typeof value.audio_link === 'string' ? { audioLink: value.audio_link } : {}),
    translation: value.translation,
    purport: value.purport,
  }
}

function isApiError(value: unknown): boolean {
  return isRecord(value) && typeof value.error === 'string' && typeof value.message === 'string'
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function isVerseNumber(value: unknown): value is number | number[] {
  return typeof value === 'number' || (Array.isArray(value) && value.every(entry => typeof entry === 'number'))
}

function isStringOrStringArray(value: unknown): value is string | string[] {
  return typeof value === 'string' || (Array.isArray(value) && value.every(entry => typeof entry === 'string'))
}

function isSynonyms(value: unknown): value is string | string[] | Array<[string, string]> {
  return isStringOrStringArray(value) || (Array.isArray(value) && value.every(entry => Array.isArray(entry) && entry.length === 2 && entry.every(part => typeof part === 'string')))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
