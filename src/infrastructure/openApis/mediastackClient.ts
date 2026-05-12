import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MEDIASTACK_DEFAULT_BASE_URL = 'https://api.mediastack.com/v1'
export const MEDIASTACK_ENV_API_KEY = 'MEDIASTACK_API_KEY'

export type MediastackSort = 'published_desc' | 'published_asc' | 'popularity'

export type MediastackNewsQuery = {
  keywords?: string | undefined
  sources?: string | undefined
  categories?: string | undefined
  countries?: string | undefined
  languages?: string | undefined
  date?: string | undefined
  sort?: MediastackSort | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type MediastackPagination = {
  limit: number
  offset: number
  count: number
  total: number
}

export type MediastackArticle = {
  author: string | null
  title: string
  description: string | null
  url: string
  source: string
  image: string | null
  category: string
  language: string
  country: string
  published_at: string
}

export type MediastackNewsResponse = {
  pagination: MediastackPagination
  data: MediastackArticle[]
}

export type MediastackClientOptions = {
  apiKey?: string | undefined
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class MediastackClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: MediastackClientOptions = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? MEDIASTACK_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listNews(query: MediastackNewsQuery = {}): Promise<MediastackNewsResponse> {
    const url = this.buildUrl('/news', query)
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Mediastack returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || isMediastackErrorResponse(parsed)) {
      throw createMediastackFailure(parsed, response.status, response.statusText)
    }

    return parseNewsResponse(parsed)
  }

  private buildUrl(path: string, query: MediastackNewsQuery): URL {
    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set('access_key', this.apiKey)
    appendOptionalParam(url, 'keywords', query.keywords)
    appendOptionalParam(url, 'sources', query.sources)
    appendOptionalParam(url, 'categories', query.categories)
    appendOptionalParam(url, 'countries', query.countries)
    appendOptionalParam(url, 'languages', query.languages)
    appendOptionalParam(url, 'date', query.date)
    appendOptionalParam(url, 'sort', query.sort)
    appendOptionalNumberParam(url, 'limit', query.limit)
    appendOptionalNumberParam(url, 'offset', query.offset)
    return url
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[MEDIASTACK_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${MEDIASTACK_ENV_API_KEY}.`, {
      env: MEDIASTACK_ENV_API_KEY,
      remediation: `Export ${MEDIASTACK_ENV_API_KEY} before calling Mediastack commands.`,
    })
  }

  return resolved.trim()
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function parseNewsResponse(value: unknown): MediastackNewsResponse {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Mediastack response must be an object.')
  }

  const record = value as Record<string, unknown>
  const pagination = parsePagination(record.pagination)
  const data = parseArticles(record.data)
  return { pagination, data }
}

function parsePagination(value: unknown): MediastackPagination {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Mediastack response is missing pagination metadata.')
  }

  const record = value as Record<string, unknown>
  return {
    limit: readNumber(record, 'limit'),
    offset: readNumber(record, 'offset'),
    count: readNumber(record, 'count'),
    total: readNumber(record, 'total'),
  }
}

function parseArticles(value: unknown): MediastackArticle[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Mediastack response data must be an array.')
  }

  return value.map(parseArticle)
}

function parseArticle(value: unknown): MediastackArticle {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Mediastack article must be an object.')
  }

  const record = value as Record<string, unknown>
  return {
    author: readNullableString(record, 'author'),
    title: readString(record, 'title'),
    description: readNullableString(record, 'description'),
    url: readString(record, 'url'),
    source: readString(record, 'source'),
    image: readNullableString(record, 'image'),
    category: readString(record, 'category'),
    language: readString(record, 'language'),
    country: readString(record, 'country'),
    published_at: readString(record, 'published_at'),
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Mediastack field ${key} must be a string.`)
  }

  return value
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value === null || typeof value === 'string') {
    return value
  }

  throw new RuntimeFailure('OPEN_API_FAILED', `Mediastack field ${key} must be a string or null.`)
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Mediastack pagination field ${key} must be a number.`)
  }

  return value
}

function isMediastackErrorResponse(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && 'error' in value
}

function createMediastackFailure(value: unknown, status: number, statusText: string): RuntimeFailure {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const error = (value as Record<string, unknown>).error
    if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
      const record = error as Record<string, unknown>
      return new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(record, statusText), {
        status,
        code: typeof record.code === 'string' ? record.code : undefined,
        context: typeof record.context === 'object' && record.context !== null ? record.context : undefined,
      })
    }
  }

  return new RuntimeFailure('OPEN_API_FAILED', statusText || 'Mediastack request failed.', { status })
}

function readErrorMessage(record: Record<string, unknown>, fallback: string): string {
  const message = record.message
  return typeof message === 'string' && message.trim() !== '' ? message : fallback
}
