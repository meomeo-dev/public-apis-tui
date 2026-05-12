import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NEWSDATA_DEFAULT_BASE_URL = 'https://newsdata.io/api/1'
export const NEWSDATA_ENV_API_KEY = 'NEWSDATAIO_API_KEY'
export const NEWSDATA_DEFAULT_LANGUAGE = 'en'
export const NEWSDATA_DEFAULT_SIZE = 10
export const NEWSDATA_FREE_MAX_SIZE = 10
export const NEWSDATA_PAID_MAX_SIZE = 50

export type NewsDataSearchIn = 'all' | 'title' | 'meta'
export type NewsDataSort = 'pubdateasc' | 'relevancy' | 'source' | 'fetched_at'

export type NewsDataLatestInput = {
  apiKey?: string | undefined
  query?: string | undefined
  searchIn?: NewsDataSearchIn | undefined
  language?: string | undefined
  country?: string | undefined
  category?: string | undefined
  domain?: string | undefined
  sort?: NewsDataSort | undefined
  dedupe?: boolean | undefined
  size?: number | undefined
  page?: string | undefined
}

export type NormalizedNewsDataLatestInput = {
  language: string
  searchIn: NewsDataSearchIn
  size: number
  query?: string | undefined
  country?: string | undefined
  category?: string | undefined
  domain?: string | undefined
  sort?: NewsDataSort | undefined
  dedupe?: boolean | undefined
  page?: string | undefined
}

export type NewsDataSource = {
  id?: string | undefined
  name?: string | undefined
  url?: string | undefined
  icon?: string | undefined
  priority?: number | undefined
}

export type NewsDataArticle = {
  id: string
  title: string
  url: string
  description?: string | null | undefined
  content?: string | null | undefined
  keywords: string[]
  creator: string[]
  language?: string | undefined
  countries: string[]
  categories: string[]
  datatype?: string | undefined
  publishedAt?: string | undefined
  publishedAtTimezone?: string | undefined
  fetchedAt?: string | undefined
  imageUrl?: string | null | undefined
  videoUrl?: string | null | undefined
  duplicate?: boolean | undefined
  sentiment?: string | undefined
  source: NewsDataSource
}

export type NewsDataEnvelope = {
  status: string
  totalResults: number
  nextPage?: string | undefined
  results: NewsDataArticle[]
}

export class NewsDataClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? NEWSDATA_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async latest(input: NormalizedNewsDataLatestInput): Promise<NewsDataEnvelope> {
    const url = new URL(`${this.baseUrl}/latest`)
    url.searchParams.set('apikey', this.apiKey)
    url.searchParams.set('language', input.language)
    url.searchParams.set('size', String(input.size))
    appendQueryParam(url, input.searchIn, input.query)
    appendOptionalParam(url, 'country', input.country)
    appendOptionalParam(url, 'category', input.category)
    appendOptionalParam(url, 'domain', input.domain)
    appendOptionalParam(url, 'sort', input.sort)
    appendOptionalParam(url, 'page', input.page)
    if (input.dedupe === true) {
      url.searchParams.set('removeduplicate', '1')
    }
    return this.fetchJson(url)
  }

  private async fetchJson(url: URL): Promise<NewsDataEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NewsData.io request failed: ${String(error)}`, {
        provider: 'newsdata',
        endpoint: redactApiKey(url.href),
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NewsData.io returned a non-JSON response: ${String(error)}`, {
        provider: 'newsdata',
        endpoint: redactApiKey(url.href),
        status: response.status,
      })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `NewsData.io request failed with HTTP ${response.status}.`, {
        provider: 'newsdata',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parseEnvelope(parsed)
  }
}

export function normalizeNewsDataLatestInput(input: NewsDataLatestInput = {}): NormalizedNewsDataLatestInput {
  const searchIn = normalizeSearchIn(input.searchIn ?? 'all')
  return {
    language: normalizeCodeList(input.language ?? NEWSDATA_DEFAULT_LANGUAGE, '--language', 5),
    searchIn,
    size: normalizeInteger(input.size ?? NEWSDATA_DEFAULT_SIZE, '--size', 1, NEWSDATA_FREE_MAX_SIZE),
    ...(input.query !== undefined ? { query: normalizeQuery(input.query) } : {}),
    ...(input.country !== undefined ? { country: normalizeCodeList(input.country, '--country', 5) } : {}),
    ...(input.category !== undefined ? { category: normalizeTokenList(input.category, '--category', 5) } : {}),
    ...(input.domain !== undefined ? { domain: normalizeTokenList(input.domain, '--domain', 5) } : {}),
    ...(input.sort !== undefined ? { sort: normalizeSort(input.sort) } : {}),
    ...(input.dedupe !== undefined ? { dedupe: input.dedupe } : {}),
    ...(input.page !== undefined ? { page: normalizePage(input.page) } : {}),
  }
}

function parseEnvelope(value: unknown): NewsDataEnvelope {
  if (!isRecord(value) || value.status !== 'success' || typeof value.totalResults !== 'number' || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NewsData.io latest response had an unexpected schema.')
  }
  return {
    status: value.status,
    totalResults: value.totalResults,
    ...(typeof value.nextPage === 'string' && value.nextPage.trim() !== '' ? { nextPage: value.nextPage } : {}),
    results: value.results.filter(isRecord).map(parseArticle),
  }
}

function parseArticle(value: Record<string, unknown>): NewsDataArticle {
  const id = optionalString(value.article_id)
  const title = optionalString(value.title)
  const url = optionalString(value.link)
  if (id === undefined || title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NewsData.io article was missing article_id, title, or link.')
  }
  return {
    id,
    title,
    url,
    description: optionalNullableString(value.description),
    content: optionalNullableString(value.content),
    keywords: parseStringArray(value.keywords),
    creator: parseStringArray(value.creator),
    language: optionalString(value.language),
    countries: parseStringArray(value.country),
    categories: parseStringArray(value.category),
    datatype: optionalString(value.datatype),
    publishedAt: optionalString(value.pubDate),
    publishedAtTimezone: optionalString(value.pubDateTZ),
    fetchedAt: optionalString(value.fetched_at),
    imageUrl: optionalNullableString(value.image_url),
    videoUrl: optionalNullableString(value.video_url),
    duplicate: typeof value.duplicate === 'boolean' ? value.duplicate : undefined,
    sentiment: optionalString(value.sentiment),
    source: {
      id: optionalString(value.source_id),
      name: optionalString(value.source_name),
      url: optionalString(value.source_url),
      icon: optionalString(value.source_icon),
      priority: typeof value.source_priority === 'number' ? value.source_priority : undefined,
    },
  }
}

function appendQueryParam(url: URL, searchIn: NewsDataSearchIn, query: string | undefined): void {
  if (query === undefined) {
    return
  }
  const paramName = searchIn === 'title' ? 'qInTitle' : searchIn === 'meta' ? 'qInMeta' : 'q'
  url.searchParams.set(paramName, query)
}

function appendOptionalParam(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(name, value)
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[NEWSDATA_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${NEWSDATA_ENV_API_KEY}.`, {
      env: NEWSDATA_ENV_API_KEY,
      remediation: `Set ${NEWSDATA_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function normalizeQuery(value: string): string {
  const normalized = normalizeText(value, '--query')
  if (normalized.length > 512) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be at most 512 characters for NewsData.io.')
  }
  return normalized
}

function normalizeCodeList(value: string, label: string, maxItems: number): string {
  const entries = normalizeCsv(value, label, maxItems)
  if (entries.some(entry => !/^[a-z]{2}$/u.test(entry.toLowerCase()))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a comma-separated list of two-letter codes.`)
  }
  return entries.map(entry => entry.toLowerCase()).join(',')
}

function normalizeTokenList(value: string, label: string, maxItems: number): string {
  const entries = normalizeCsv(value, label, maxItems)
  if (entries.some(entry => !/^[a-z0-9][a-z0-9._-]*$/iu.test(entry))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a comma-separated list of simple tokens.`)
  }
  return entries.map(entry => entry.toLowerCase()).join(',')
}

function normalizeCsv(value: string, label: string, maxItems: number): string[] {
  const entries = normalizeText(value, label).split(',').map(entry => entry.trim()).filter(entry => entry !== '')
  if (entries.length === 0 || entries.length > maxItems) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must contain between 1 and ${maxItems} item(s).`)
  }
  return entries
}

function normalizeSearchIn(value: string): NewsDataSearchIn {
  if (value === 'all' || value === 'title' || value === 'meta') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--search-in must be one of: all, title, meta.')
}

function normalizeSort(value: string): NewsDataSort {
  if (value === 'pubdateasc' || value === 'relevancy' || value === 'source' || value === 'fetched_at') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--sort must be one of: pubdateasc, relevancy, source, fetched_at.')
}

function normalizePage(value: string): string {
  const normalized = normalizeText(value, '--page')
  if (!/^[A-Za-z0-9_-]+$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--page must be the opaque nextPage token returned by NewsData.io.')
  }
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  }
  return normalized
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '').map(entry => entry.trim())
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return optionalString(value)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && value.status === 'error'
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.message === 'string') {
    return value.message
  }
  if (isRecord(value.results) && typeof value.results.message === 'string') {
    return value.results.message
  }
  return undefined
}

function redactErrorPayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }
  return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [
    key,
    /apikey|api_key|token|secret/iu.test(key) ? '[redacted]' : entryValue,
  ]))
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]apikey=)[^&]+/iu, '$1[redacted]')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
