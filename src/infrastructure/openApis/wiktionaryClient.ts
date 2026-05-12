import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WIKTIONARY_DEFAULT_BASE_URL = 'https://en.wiktionary.org'
export const WIKTIONARY_DEFAULT_QUERY = 'hello'
export const WIKTIONARY_DEFAULT_TITLE = 'hello'
export const WIKTIONARY_DEFAULT_LIMIT = 50
export const WIKTIONARY_MAX_LIMIT = 50
export const WIKTIONARY_DEFAULT_EXTRACT_CHARS = 4000
export const WIKTIONARY_MAX_EXTRACT_CHARS = 12000

export type WiktionarySearchInput = {
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type WiktionaryExtractInput = {
  title?: string | undefined
  chars?: number | undefined
  redirects?: boolean | undefined
}

export type NormalizedWiktionarySearchInput = {
  query: string
  limit: number
  offset: number
}

export type NormalizedWiktionaryExtractInput = {
  title: string
  chars: number
  redirects: boolean
}

export type WiktionarySearchResponse = {
  totalHits?: number | undefined
  items: Array<{
    pageId: number
    title: string
    size?: number | undefined
    wordCount?: number | undefined
    snippet: string
    timestamp?: string | undefined
  }>
  continueOffset?: number | undefined
}

export type WiktionaryExtractResponse = {
  pageId?: number | undefined
  title: string
  extract: string
  missing: boolean
}

export type WiktionaryClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class WiktionaryClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: WiktionaryClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? WIKTIONARY_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async search(input: WiktionarySearchInput = {}): Promise<WiktionarySearchResponse> {
    const query = normalizeWiktionarySearchInput(input)
    const url = this.createApiUrl({
      action: 'query',
      list: 'search',
      srsearch: query.query,
      srlimit: query.limit,
      sroffset: query.offset,
    })
    const parsed = await this.fetchJson(url)
    return parseSearchResponse(parsed)
  }

  async extract(input: WiktionaryExtractInput = {}): Promise<WiktionaryExtractResponse> {
    const query = normalizeWiktionaryExtractInput(input)
    const url = this.createApiUrl({
      action: 'query',
      prop: 'extracts',
      titles: query.title,
      exchars: query.chars,
      exlimit: 1,
      explaintext: 1,
      redirects: query.redirects ? 1 : 0,
    })
    const parsed = await this.fetchJson(url)
    return parseExtractResponse(parsed)
  }

  private createApiUrl(query: Record<string, string | number>): URL {
    const url = new URL('/w/api.php', this.baseUrl)
    url.searchParams.set('format', 'json')
    url.searchParams.set('formatversion', '2')
    url.searchParams.set('origin', '*')
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
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
      throw new RuntimeFailure('OPEN_API_FAILED', `Wiktionary request failed: ${String(error)}`, {
        provider: 'wiktionary',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Wiktionary returned a non-JSON response.', {
        provider: 'wiktionary',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok || readApiError(parsed) !== undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? response.statusText ?? 'Wiktionary request failed.', {
        provider: 'wiktionary',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeWiktionarySearchInput(input: WiktionarySearchInput = {}): NormalizedWiktionarySearchInput {
  return {
    query: normalizeText(input.query, WIKTIONARY_DEFAULT_QUERY, 'query', 200),
    limit: normalizeInteger(input.limit, WIKTIONARY_DEFAULT_LIMIT, WIKTIONARY_MAX_LIMIT, 'limit', 1),
    offset: normalizeInteger(input.offset, 0, Number.MAX_SAFE_INTEGER, 'offset', 0),
  }
}

export function normalizeWiktionaryExtractInput(input: WiktionaryExtractInput = {}): NormalizedWiktionaryExtractInput {
  return {
    title: normalizeText(input.title, WIKTIONARY_DEFAULT_TITLE, 'title', 200),
    chars: normalizeInteger(input.chars, WIKTIONARY_DEFAULT_EXTRACT_CHARS, WIKTIONARY_MAX_EXTRACT_CHARS, 'chars', 1),
    redirects: input.redirects ?? true,
  }
}

function parseSearchResponse(value: unknown): WiktionarySearchResponse {
  if (!isRecord(value) || !isRecord(value.query) || !Array.isArray(value.query.search)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wiktionary search response must include query.search.')
  }
  const searchInfo = isRecord(value.query.searchinfo) ? value.query.searchinfo : {}
  const continuation = isRecord(value.continue) ? value.continue : {}
  return {
    ...(typeof searchInfo.totalhits === 'number' ? { totalHits: searchInfo.totalhits } : {}),
    items: value.query.search.map(parseSearchItem),
    ...(typeof continuation.sroffset === 'number' ? { continueOffset: continuation.sroffset } : {}),
  }
}

function parseSearchItem(value: unknown): WiktionarySearchResponse['items'][number] {
  if (!isRecord(value) || typeof value.pageid !== 'number' || typeof value.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wiktionary search item must include pageid and title.')
  }
  return {
    pageId: value.pageid,
    title: value.title,
    ...(typeof value.size === 'number' ? { size: value.size } : {}),
    ...(typeof value.wordcount === 'number' ? { wordCount: value.wordcount } : {}),
    snippet: typeof value.snippet === 'string' ? stripHtml(value.snippet) : '',
    ...(typeof value.timestamp === 'string' ? { timestamp: value.timestamp } : {}),
  }
}

function parseExtractResponse(value: unknown): WiktionaryExtractResponse {
  if (!isRecord(value) || !isRecord(value.query) || !Array.isArray(value.query.pages)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wiktionary extract response must include query.pages.')
  }
  const page = value.query.pages.find(isRecord)
  if (page === undefined || typeof page.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wiktionary extract response did not include a page title.')
  }
  return {
    ...(typeof page.pageid === 'number' ? { pageId: page.pageid } : {}),
    title: page.title,
    extract: typeof page.extract === 'string' ? page.extract : '',
    missing: page.missing === true,
  }
}

function normalizeText(value: string | undefined, defaultValue: string, label: string, maxLength: number): string {
  const normalized = (value ?? defaultValue).trim()
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Wiktionary --${label} must be between 1 and ${maxLength} characters.`, { value })
  }
  return normalized
}

function normalizeInteger(value: number | undefined, defaultValue: number, maxValue: number, optionName: string, minValue: number): number {
  if (value === undefined) {
    return defaultValue
  }
  if (!Number.isInteger(value) || value < minValue || value > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Wiktionary --${optionName} must be an integer between ${minValue} and ${maxValue}.`, { value })
  }
  return value
}

function readApiError(value: unknown): string | undefined {
  if (isRecord(value) && isRecord(value.error)) {
    return typeof value.error.info === 'string' ? value.error.info : 'Wiktionary API returned an error.'
  }
  return undefined
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/gu, '').replace(/&quot;/gu, '"').replace(/&#039;/gu, "'").replace(/&amp;/gu, '&')
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
