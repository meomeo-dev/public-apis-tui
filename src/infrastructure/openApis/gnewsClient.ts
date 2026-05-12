import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GNEWS_DEFAULT_BASE_URL = 'https://gnews.io/api/v4'
export const GNEWS_ENV_API_KEY = 'GNEWS_API_KEY'
export const GNEWS_DEFAULT_MAX = 100
export const GNEWS_MAX_RESULTS = 100
export const GNEWS_DEFAULT_PAGE = 1
export const GNEWS_MAX_ARTICLE_WINDOW = 1000
export const GNEWS_DEFAULT_SEARCH_QUERY = 'public api'
export const GNEWS_DEFAULT_CATEGORY = 'general'

export type GNewsSortBy = 'publishedAt' | 'relevance'
export type GNewsCategory =
  | 'general'
  | 'world'
  | 'nation'
  | 'business'
  | 'technology'
  | 'entertainment'
  | 'sports'
  | 'science'
  | 'health'

export type GNewsSearchInput = {
  apiKey?: string | undefined
  query?: string | undefined
  language?: string | undefined
  country?: string | undefined
  max?: number | undefined
  searchIn?: string | undefined
  nullable?: string | undefined
  from?: string | undefined
  to?: string | undefined
  sortBy?: GNewsSortBy | undefined
  page?: number | undefined
  expand?: string | undefined
}

export type GNewsHeadlinesInput = {
  apiKey?: string | undefined
  category?: GNewsCategory | undefined
  query?: string | undefined
  language?: string | undefined
  country?: string | undefined
  max?: number | undefined
  nullable?: string | undefined
  from?: string | undefined
  to?: string | undefined
  page?: number | undefined
  expand?: string | undefined
}

export type NormalizedGNewsSearchInput = {
  query: string
  max: number
  page: number
  language?: string | undefined
  country?: string | undefined
  searchIn?: string | undefined
  nullable?: string | undefined
  from?: string | undefined
  to?: string | undefined
  sortBy?: GNewsSortBy | undefined
  expand?: string | undefined
}

export type NormalizedGNewsHeadlinesInput = {
  category: GNewsCategory
  max: number
  page: number
  query?: string | undefined
  language?: string | undefined
  country?: string | undefined
  nullable?: string | undefined
  from?: string | undefined
  to?: string | undefined
  expand?: string | undefined
}

export type GNewsSource = {
  id?: string | undefined
  name?: string | undefined
  url?: string | undefined
  country?: string | undefined
}

export type GNewsArticle = {
  id?: string | undefined
  title: string
  description?: string | null | undefined
  content?: string | null | undefined
  url: string
  image?: string | null | undefined
  publishedAt: string
  language?: string | undefined
  source?: GNewsSource | undefined
}

export type GNewsEnvelope = {
  information?: string | undefined
  totalArticles: number
  articles: GNewsArticle[]
}

export class GNewsClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? GNEWS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async search(input: NormalizedGNewsSearchInput): Promise<GNewsEnvelope> {
    const url = this.buildUrl('/search')
    url.searchParams.set('q', input.query)
    this.appendSharedParams(url, input)
    appendOptionalParam(url, 'in', input.searchIn)
    appendOptionalParam(url, 'nullable', input.nullable)
    appendOptionalParam(url, 'from', input.from)
    appendOptionalParam(url, 'to', input.to)
    appendOptionalParam(url, 'sortby', input.sortBy)
    appendOptionalParam(url, 'expand', input.expand)
    return this.fetchJson(url)
  }

  async topHeadlines(input: NormalizedGNewsHeadlinesInput): Promise<GNewsEnvelope> {
    const url = this.buildUrl('/top-headlines')
    url.searchParams.set('category', input.category)
    this.appendSharedParams(url, input)
    appendOptionalParam(url, 'q', input.query)
    appendOptionalParam(url, 'nullable', input.nullable)
    appendOptionalParam(url, 'from', input.from)
    appendOptionalParam(url, 'to', input.to)
    appendOptionalParam(url, 'expand', input.expand)
    return this.fetchJson(url)
  }

  private buildUrl(path: string): URL {
    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set('apikey', this.apiKey)
    return url
  }

  private appendSharedParams(url: URL, input: { max: number; page: number; language?: string | undefined; country?: string | undefined }): void {
    url.searchParams.set('max', String(input.max))
    url.searchParams.set('page', String(input.page))
    appendOptionalParam(url, 'lang', input.language)
    appendOptionalParam(url, 'country', input.country)
  }

  private async fetchJson(url: URL): Promise<GNewsEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GNews request failed: ${String(error)}`, {
        provider: 'gnews',
        endpoint: redactApiKey(url.href),
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GNews returned a non-JSON response: ${String(error)}`, {
        provider: 'gnews',
        endpoint: redactApiKey(url.href),
        status: response.status,
      })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `GNews request failed with HTTP ${response.status}.`, {
        provider: 'gnews',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parseEnvelope(parsed)
  }
}

export function normalizeGNewsSearchInput(input: GNewsSearchInput = {}): NormalizedGNewsSearchInput {
  const max = normalizeInteger(input.max ?? GNEWS_DEFAULT_MAX, '--max', 1, GNEWS_MAX_RESULTS)
  return {
    query: normalizeQuery(input.query ?? GNEWS_DEFAULT_SEARCH_QUERY),
    max,
    page: normalizePage(input.page ?? GNEWS_DEFAULT_PAGE, max),
    ...(input.language !== undefined ? { language: normalizeCode(input.language, '--language') } : {}),
    ...(input.country !== undefined ? { country: normalizeCode(input.country, '--country') } : {}),
    ...(input.searchIn !== undefined ? { searchIn: normalizeFieldList(input.searchIn, '--search-in', ['title', 'description', 'content']) } : {}),
    ...(input.nullable !== undefined ? { nullable: normalizeFieldList(input.nullable, '--nullable', ['description', 'content', 'image']) } : {}),
    ...(input.from !== undefined ? { from: normalizeText(input.from, '--from') } : {}),
    ...(input.to !== undefined ? { to: normalizeText(input.to, '--to') } : {}),
    ...(input.sortBy !== undefined ? { sortBy: normalizeSortBy(input.sortBy) } : {}),
    ...(input.expand !== undefined ? { expand: normalizeExpand(input.expand) } : {}),
  }
}

export function normalizeGNewsHeadlinesInput(input: GNewsHeadlinesInput = {}): NormalizedGNewsHeadlinesInput {
  const max = normalizeInteger(input.max ?? GNEWS_DEFAULT_MAX, '--max', 1, GNEWS_MAX_RESULTS)
  return {
    category: normalizeCategory(input.category ?? GNEWS_DEFAULT_CATEGORY),
    max,
    page: normalizePage(input.page ?? GNEWS_DEFAULT_PAGE, max),
    ...(input.query !== undefined ? { query: normalizeQuery(input.query) } : {}),
    ...(input.language !== undefined ? { language: normalizeCode(input.language, '--language') } : {}),
    ...(input.country !== undefined ? { country: normalizeCode(input.country, '--country') } : {}),
    ...(input.nullable !== undefined ? { nullable: normalizeFieldList(input.nullable, '--nullable', ['description', 'content', 'image']) } : {}),
    ...(input.from !== undefined ? { from: normalizeText(input.from, '--from') } : {}),
    ...(input.to !== undefined ? { to: normalizeText(input.to, '--to') } : {}),
    ...(input.expand !== undefined ? { expand: normalizeExpand(input.expand) } : {}),
  }
}

function parseEnvelope(value: unknown): GNewsEnvelope {
  if (!isRecord(value) || typeof value.totalArticles !== 'number' || !Array.isArray(value.articles)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'GNews response had an unexpected schema.')
  }
  return {
    information: optionalString(value.information),
    totalArticles: value.totalArticles,
    articles: value.articles.filter(isRecord).map(parseArticle),
  }
}

function parseArticle(value: Record<string, unknown>): GNewsArticle {
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  const publishedAt = optionalString(value.publishedAt)
  if (title === undefined || url === undefined || publishedAt === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'GNews article was missing title, url, or publishedAt.')
  }
  return {
    id: optionalString(value.id),
    title,
    description: optionalNullableString(value.description),
    content: optionalNullableString(value.content),
    url,
    image: optionalNullableString(value.image),
    publishedAt,
    language: optionalString(value.lang),
    source: parseSource(value.source),
  }
}

function parseSource(value: unknown): GNewsSource | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    id: optionalString(value.id),
    name: optionalString(value.name),
    url: optionalString(value.url),
    country: optionalString(value.country),
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[GNEWS_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${GNEWS_ENV_API_KEY}.`, {
      env: GNEWS_ENV_API_KEY,
      remediation: `Set ${GNEWS_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function normalizeQuery(value: string): string {
  const normalized = normalizeText(value, '--query')
  if (normalized.length > 200) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be at most 200 characters for GNews.')
  }
  return normalized
}

function normalizeCode(value: string, label: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a two-letter code.`)
  }
  return normalized
}

function normalizeFieldList(value: string, label: string, allowed: string[]): string {
  const fields = normalizeText(value, label).split(',').map(field => field.trim()).filter(field => field !== '')
  if (fields.length === 0 || fields.some(field => !allowed.includes(field))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a comma-separated list of: ${allowed.join(', ')}.`)
  }
  return fields.join(',')
}

function normalizeSortBy(value: string): GNewsSortBy {
  if (value !== 'publishedAt' && value !== 'relevance') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--sort-by must be publishedAt or relevance.')
  }
  return value
}

function normalizeCategory(value: string): GNewsCategory {
  const normalized = value.trim().toLowerCase()
  const allowed: GNewsCategory[] = ['general', 'world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health']
  if (!allowed.includes(normalized as GNewsCategory)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--category must be one of: ${allowed.join(', ')}.`)
  }
  return normalized as GNewsCategory
}

function normalizeExpand(value: string): string {
  const normalized = normalizeText(value, '--expand')
  if (normalized !== 'content') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--expand must be content.')
  }
  return normalized
}

function normalizePage(value: number, max: number): number {
  const page = normalizeInteger(value, '--page', 1, GNEWS_MAX_ARTICLE_WINDOW)
  const maxPage = Math.max(1, Math.ceil(GNEWS_MAX_ARTICLE_WINDOW / max))
  if (page > maxPage) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--page must be from 1 to ${maxPage} when --max is ${max}.`)
  }
  return page
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer from ${min} to ${max}.`)
  }
  return value
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return normalized
}

function appendOptionalParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, value)
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (Array.isArray(value.errors)) {
    return value.errors.map(entry => (typeof entry === 'string' ? entry : JSON.stringify(entry))).join('; ')
  }
  if (isRecord(value.errors)) {
    return Object.entries(value.errors).map(([key, entryValue]) => `${key}: ${String(entryValue)}`).join('; ')
  }
  return optionalString(value.message) ?? optionalString(value.error)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && value.errors !== undefined
}

function redactErrorPayload(value: unknown): unknown {
  return isRecord(value) ? { ...value, apikey: '<redacted>', apiKey: '<redacted>' } : value
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]apikey=)[^&]+/u, '$1<redacted>').replace(/([?&]apiKey=)[^&]+/u, '$1<redacted>')
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return optionalString(value)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
