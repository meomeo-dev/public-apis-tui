import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FREE_DICTIONARY_DEFAULT_BASE_URL = 'https://api.dictionaryapi.dev'
export const FREE_DICTIONARY_DEFAULT_LANGUAGE = 'en'
export const FREE_DICTIONARY_DEFAULT_WORD = 'hello'
export const FREE_DICTIONARY_DEFAULT_DEFINITION_LIMIT = 10
export const FREE_DICTIONARY_MAX_DEFINITION_LIMIT = 50

export type FreeDictionaryDefineInput = {
  word?: string | undefined
  language?: string | undefined
  definitionLimit?: number | undefined
}

export type NormalizedFreeDictionaryDefineInput = {
  word: string
  language: string
  definitionLimit: number
}

export type FreeDictionaryRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type FreeDictionaryEntry = {
  word: string
  phonetic?: string | undefined
  phonetics: Array<{
    text?: string | undefined
    audio?: string | undefined
    sourceUrl?: string | undefined
    license?: { name?: string | undefined; url?: string | undefined } | undefined
  }>
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string | undefined
      synonyms: string[]
      antonyms: string[]
    }>
    synonyms: string[]
    antonyms: string[]
  }>
  license?: { name?: string | undefined; url?: string | undefined } | undefined
  sourceUrls: string[]
}

export type FreeDictionaryResponse = {
  entries: FreeDictionaryEntry[]
  rateLimit: FreeDictionaryRateLimit
}

export type FreeDictionaryClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class FreeDictionaryClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: FreeDictionaryClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? FREE_DICTIONARY_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async define(input: FreeDictionaryDefineInput = {}): Promise<FreeDictionaryResponse> {
    const query = normalizeFreeDictionaryDefineInput(input)
    const url = new URL(`${this.baseUrl}/api/v2/entries/${encodeURIComponent(query.language)}/${encodeURIComponent(query.word)}`)

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Free Dictionary request failed: ${String(error)}`, {
        provider: 'free-dictionary',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Free Dictionary returned a non-JSON response.', {
        provider: 'free-dictionary',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Free Dictionary request failed with HTTP ${response.status}.`, {
        provider: 'free-dictionary',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Free Dictionary response must be an array of entries.', {
        provider: 'free-dictionary',
        endpoint: url.href,
      })
    }

    return {
      entries: parsed.map(parseEntry),
      rateLimit: readRateLimit(response.headers),
    }
  }
}

export function normalizeFreeDictionaryDefineInput(input: FreeDictionaryDefineInput = {}): NormalizedFreeDictionaryDefineInput {
  return {
    word: normalizeWord(input.word),
    language: normalizeLanguage(input.language),
    definitionLimit: normalizeInteger(input.definitionLimit, FREE_DICTIONARY_DEFAULT_DEFINITION_LIMIT, FREE_DICTIONARY_MAX_DEFINITION_LIMIT, 'definition-limit'),
  }
}

function parseEntry(value: unknown): FreeDictionaryEntry {
  if (!isRecord(value) || typeof value.word !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Free Dictionary entry must include a word.')
  }
  return {
    word: value.word,
    ...(typeof value.phonetic === 'string' ? { phonetic: value.phonetic } : {}),
    phonetics: Array.isArray(value.phonetics) ? value.phonetics.map(parsePhonetic) : [],
    meanings: Array.isArray(value.meanings) ? value.meanings.map(parseMeaning) : [],
    ...(isRecord(value.license) ? { license: parseLicense(value.license) } : {}),
    sourceUrls: parseStringArray(value.sourceUrls),
  }
}

function parsePhonetic(value: unknown): FreeDictionaryEntry['phonetics'][number] {
  if (!isRecord(value)) {
    return {}
  }
  return {
    ...(typeof value.text === 'string' && value.text.trim() !== '' ? { text: value.text } : {}),
    ...(typeof value.audio === 'string' && value.audio.trim() !== '' ? { audio: value.audio } : {}),
    ...(typeof value.sourceUrl === 'string' && value.sourceUrl.trim() !== '' ? { sourceUrl: value.sourceUrl } : {}),
    ...(isRecord(value.license) ? { license: parseLicense(value.license) } : {}),
  }
}

function parseMeaning(value: unknown): FreeDictionaryEntry['meanings'][number] {
  if (!isRecord(value) || typeof value.partOfSpeech !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Free Dictionary meaning must include partOfSpeech.')
  }
  return {
    partOfSpeech: value.partOfSpeech,
    definitions: Array.isArray(value.definitions) ? value.definitions.map(parseDefinition) : [],
    synonyms: parseStringArray(value.synonyms),
    antonyms: parseStringArray(value.antonyms),
  }
}

function parseDefinition(value: unknown): FreeDictionaryEntry['meanings'][number]['definitions'][number] {
  if (!isRecord(value) || typeof value.definition !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Free Dictionary definition row must include definition.')
  }
  return {
    definition: value.definition,
    ...(typeof value.example === 'string' && value.example.trim() !== '' ? { example: value.example } : {}),
    synonyms: parseStringArray(value.synonyms),
    antonyms: parseStringArray(value.antonyms),
  }
}

function parseLicense(value: Record<string, unknown>): { name?: string | undefined; url?: string | undefined } {
  return {
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
  }
}

function normalizeWord(value: string | undefined): string {
  const word = (value ?? FREE_DICTIONARY_DEFAULT_WORD).trim()
  if (word.length < 1 || word.length > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Free Dictionary --word must be between 1 and 100 characters.', { word: value })
  }
  if (!/^[\p{L}\p{M}' -]+$/u.test(word)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Free Dictionary --word supports letters, spaces, apostrophes, and hyphens only.', { word: value })
  }
  return word
}

function normalizeLanguage(value: string | undefined): string {
  const language = (value ?? FREE_DICTIONARY_DEFAULT_LANGUAGE).trim().toLowerCase()
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/u.test(language)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Free Dictionary --language must be a short language code such as en.', { language: value })
  }
  return language
}

function normalizeInteger(value: number | undefined, defaultValue: number, maxValue: number, optionName: string): number {
  if (value === undefined) {
    return defaultValue
  }
  if (!Number.isInteger(value) || value < 1 || value > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Free Dictionary --${optionName} must be an integer between 1 and ${maxValue}.`, { value })
  }
  return value
}

function readRateLimit(headers: Headers): FreeDictionaryRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
    reset: headers.get('x-ratelimit-reset') ?? undefined,
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message
  }
  if (isRecord(value) && typeof value.title === 'string') {
    return value.title
  }
  return undefined
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
