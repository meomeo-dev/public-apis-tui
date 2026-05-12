import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NEWSAPI_DEFAULT_BASE_URL = 'https://newsapi.org/v2'
export const NEWSAPI_ENV_API_KEY = 'NEWSAPI_API_KEY'
export const NEWSAPI_DEFAULT_PAGE_SIZE = 100
export const NEWSAPI_MAX_PAGE_SIZE = 100
export const NEWSAPI_DEFAULT_PAGE = 1
export const NEWSAPI_MAX_PAGE = 100
export const NEWSAPI_DEFAULT_QUERY = 'public api'
export const NEWSAPI_DEFAULT_COUNTRY = 'us'

export type NewsApiSortBy = 'relevancy' | 'popularity' | 'publishedAt'

export type NewsApiHeadlinesInput = {
  apiKey?: string | undefined
  country?: string | undefined
  category?: string | undefined
  sources?: string | undefined
  query?: string | undefined
  pageSize?: number | undefined
  page?: number | undefined
}

export type NewsApiEverythingInput = {
  apiKey?: string | undefined
  query?: string | undefined
  searchIn?: string | undefined
  sources?: string | undefined
  domains?: string | undefined
  excludeDomains?: string | undefined
  from?: string | undefined
  to?: string | undefined
  language?: string | undefined
  sortBy?: NewsApiSortBy | undefined
  pageSize?: number | undefined
  page?: number | undefined
}

export type NormalizedNewsApiHeadlinesInput = {
  country?: string | undefined
  pageSize: number
  page: number
  category?: string | undefined
  sources?: string | undefined
  query?: string | undefined
}

export type NormalizedNewsApiEverythingInput = {
  query: string
  pageSize: number
  page: number
  searchIn?: string | undefined
  sources?: string | undefined
  domains?: string | undefined
  excludeDomains?: string | undefined
  from?: string | undefined
  to?: string | undefined
  language?: string | undefined
  sortBy?: NewsApiSortBy | undefined
}

export type NewsApiSource = {
  id?: string | null | undefined
  name?: string | undefined
}

export type NewsApiArticle = {
  title: string
  description?: string | null | undefined
  url: string
  author?: string | null | undefined
  urlToImage?: string | null | undefined
  publishedAt?: string | undefined
  content?: string | null | undefined
  source?: NewsApiSource | undefined
}

export type NewsApiEnvelope = {
  status: string
  totalResults: number
  articles: NewsApiArticle[]
}

export class NewsApiClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? NEWSAPI_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async topHeadlines(input: NormalizedNewsApiHeadlinesInput): Promise<NewsApiEnvelope> {
    const url = this.buildUrl('/top-headlines')
    appendOptionalParam(url, 'country', input.country)
    appendOptionalParam(url, 'category', input.category)
    appendOptionalParam(url, 'sources', input.sources)
    appendOptionalParam(url, 'q', input.query)
    appendPaging(url, input.pageSize, input.page)
    return this.fetchJson(url)
  }

  async everything(input: NormalizedNewsApiEverythingInput): Promise<NewsApiEnvelope> {
    const url = this.buildUrl('/everything')
    url.searchParams.set('q', input.query)
    appendOptionalParam(url, 'searchIn', input.searchIn)
    appendOptionalParam(url, 'sources', input.sources)
    appendOptionalParam(url, 'domains', input.domains)
    appendOptionalParam(url, 'excludeDomains', input.excludeDomains)
    appendOptionalParam(url, 'from', input.from)
    appendOptionalParam(url, 'to', input.to)
    appendOptionalParam(url, 'language', input.language)
    appendOptionalParam(url, 'sortBy', input.sortBy)
    appendPaging(url, input.pageSize, input.page)
    return this.fetchJson(url)
  }

  private buildUrl(path: string): URL {
    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set('apiKey', this.apiKey)
    return url
  }

  private async fetchJson(url: URL): Promise<NewsApiEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NewsAPI request failed: ${String(error)}`, { provider: 'newsapi', endpoint: redactApiKey(url.href) })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NewsAPI returned a non-JSON response: ${String(error)}`, { provider: 'newsapi', endpoint: redactApiKey(url.href), status: response.status })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `NewsAPI request failed with HTTP ${response.status}.`, {
        provider: 'newsapi',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parseEnvelope(parsed)
  }
}

export function normalizeNewsApiHeadlinesInput(input: NewsApiHeadlinesInput = {}): NormalizedNewsApiHeadlinesInput {
  const hasSources = input.sources !== undefined && input.sources.trim() !== ''
  return {
    ...(hasSources && input.country === undefined ? {} : { country: normalizeCode(input.country ?? NEWSAPI_DEFAULT_COUNTRY, '--country') }),
    pageSize: normalizeInteger(input.pageSize ?? NEWSAPI_DEFAULT_PAGE_SIZE, '--page-size', 1, NEWSAPI_MAX_PAGE_SIZE),
    page: normalizeInteger(input.page ?? NEWSAPI_DEFAULT_PAGE, '--page', 1, NEWSAPI_MAX_PAGE),
    ...(input.category !== undefined ? { category: normalizeCategory(input.category) } : {}),
    ...(input.sources !== undefined ? { sources: normalizeCsv(input.sources, '--sources') } : {}),
    ...(input.query !== undefined ? { query: normalizeText(input.query, '--query') } : {}),
  }
}

export function normalizeNewsApiEverythingInput(input: NewsApiEverythingInput = {}): NormalizedNewsApiEverythingInput {
  return {
    query: normalizeText(input.query ?? NEWSAPI_DEFAULT_QUERY, '--query'),
    pageSize: normalizeInteger(input.pageSize ?? NEWSAPI_DEFAULT_PAGE_SIZE, '--page-size', 1, NEWSAPI_MAX_PAGE_SIZE),
    page: normalizeInteger(input.page ?? NEWSAPI_DEFAULT_PAGE, '--page', 1, NEWSAPI_MAX_PAGE),
    ...(input.searchIn !== undefined ? { searchIn: normalizeFieldList(input.searchIn, '--search-in') } : {}),
    ...(input.sources !== undefined ? { sources: normalizeCsv(input.sources, '--sources') } : {}),
    ...(input.domains !== undefined ? { domains: normalizeCsv(input.domains, '--domains') } : {}),
    ...(input.excludeDomains !== undefined ? { excludeDomains: normalizeCsv(input.excludeDomains, '--exclude-domains') } : {}),
    ...(input.from !== undefined ? { from: normalizeText(input.from, '--from') } : {}),
    ...(input.to !== undefined ? { to: normalizeText(input.to, '--to') } : {}),
    ...(input.language !== undefined ? { language: normalizeCode(input.language, '--language') } : {}),
    ...(input.sortBy !== undefined ? { sortBy: normalizeSortBy(input.sortBy) } : {}),
  }
}

function parseEnvelope(value: unknown): NewsApiEnvelope {
  if (!isRecord(value) || value.status !== 'ok' || typeof value.totalResults !== 'number' || !Array.isArray(value.articles)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NewsAPI response had an unexpected schema.')
  }
  return {
    status: value.status,
    totalResults: value.totalResults,
    articles: value.articles.filter(isRecord).map(parseArticle),
  }
}

function parseArticle(value: Record<string, unknown>): NewsApiArticle {
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NewsAPI article was missing title or url.')
  }
  return {
    title,
    description: optionalNullableString(value.description),
    url,
    author: optionalNullableString(value.author),
    urlToImage: optionalNullableString(value.urlToImage),
    publishedAt: optionalString(value.publishedAt),
    content: optionalNullableString(value.content),
    source: parseSource(value.source),
  }
}

function parseSource(value: unknown): NewsApiSource | undefined {
  return isRecord(value) ? { id: optionalNullableString(value.id), name: optionalString(value.name) } : undefined
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[NEWSAPI_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${NEWSAPI_ENV_API_KEY}.`, { env: NEWSAPI_ENV_API_KEY, remediation: `Set ${NEWSAPI_ENV_API_KEY} in the environment or local provider config.` })
  }
  return resolved.trim()
}

function appendPaging(url: URL, pageSize: number, page: number): void {
  url.searchParams.set('pageSize', String(pageSize))
  url.searchParams.set('page', String(page))
}

function appendOptionalParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined) url.searchParams.set(key, value)
}

function normalizeCode(value: string, label: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(normalized)) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a two-letter code.`)
  return normalized
}

function normalizeCategory(value: string): string {
  const normalized = value.trim().toLowerCase()
  const allowed = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']
  if (!allowed.includes(normalized)) throw new RuntimeFailure('INVALID_ARGUMENT', `--category must be one of: ${allowed.join(', ')}.`)
  return normalized
}

function normalizeSortBy(value: string): NewsApiSortBy {
  if (value !== 'relevancy' && value !== 'popularity' && value !== 'publishedAt') throw new RuntimeFailure('INVALID_ARGUMENT', '--sort-by must be relevancy, popularity, or publishedAt.')
  return value
}

function normalizeFieldList(value: string, label: string): string {
  const fields = normalizeCsv(value, label).split(',')
  const allowed = ['title', 'description', 'content']
  if (fields.some(field => !allowed.includes(field))) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must contain title, description, and/or content.`)
  return fields.join(',')
}

function normalizeCsv(value: string, label: string): string {
  const entries = normalizeText(value, label).split(',').map(entry => entry.trim()).filter(Boolean)
  if (entries.length === 0) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  return entries.join(',')
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer from ${min} to ${max}.`)
  return value
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  return normalized
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return optionalString(value.message) ?? optionalString(value.code) ?? optionalString(value.status)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && value.status === 'error'
}

function redactErrorPayload(value: unknown): unknown {
  return isRecord(value) ? { ...value, apiKey: '<redacted>' } : value
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]apiKey=)[^&]+/u, '$1<redacted>')
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  return optionalString(value)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
