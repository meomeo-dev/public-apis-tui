import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NYTIMES_DEFAULT_BASE_URL = 'https://api.nytimes.com/svc'
export const NYTIMES_ENV_API_KEY = 'NYTIMES_API_KEY'
export const NYTIMES_DEFAULT_QUERY = 'public api'
export const NYTIMES_DEFAULT_PAGE = 0
export const NYTIMES_MAX_PAGE = 100
export const NYTIMES_ARTICLE_SEARCH_PAGE_SIZE = 10
export const NYTIMES_DEFAULT_TOP_SECTION = 'home'
export const NYTIMES_DEFAULT_TOP_LIMIT = 100
export const NYTIMES_MAX_TOP_LIMIT = 100

export type NyTimesSort = 'newest' | 'oldest' | 'relevance'

export type NyTimesSearchInput = {
  apiKey?: string | undefined
  query?: string | undefined
  filterQuery?: string | undefined
  beginDate?: string | undefined
  endDate?: string | undefined
  sort?: NyTimesSort | undefined
  page?: number | undefined
}

export type NyTimesTopStoriesInput = {
  apiKey?: string | undefined
  section?: string | undefined
  limit?: number | undefined
}

export type NormalizedNyTimesSearchInput = {
  query: string
  page: number
  filterQuery?: string | undefined
  beginDate?: string | undefined
  endDate?: string | undefined
  sort?: NyTimesSort | undefined
}

export type NormalizedNyTimesTopStoriesInput = {
  section: string
  limit: number
}

export type NyTimesArticle = {
  id: string
  title: string
  abstract?: string | undefined
  url?: string | undefined
  source?: string | undefined
  byline?: string | undefined
  section?: string | undefined
  subsection?: string | undefined
  publishedAt?: string | undefined
  updatedAt?: string | undefined
  documentType?: string | undefined
}

export type NyTimesSearchEnvelope = {
  status: string
  hits: number
  offset: number
  articles: NyTimesArticle[]
}

export type NyTimesTopStoriesEnvelope = {
  status: string
  section: string
  numResults: number
  articles: NyTimesArticle[]
}

export class NyTimesClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? NYTIMES_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async search(input: NormalizedNyTimesSearchInput): Promise<NyTimesSearchEnvelope> {
    const url = new URL(`${this.baseUrl}/search/v2/articlesearch.json`)
    url.searchParams.set('api-key', this.apiKey)
    url.searchParams.set('q', input.query)
    url.searchParams.set('page', String(input.page))
    appendOptionalParam(url, 'fq', input.filterQuery)
    appendOptionalParam(url, 'begin_date', input.beginDate)
    appendOptionalParam(url, 'end_date', input.endDate)
    appendOptionalParam(url, 'sort', input.sort)
    return parseSearchEnvelope(await this.fetchJson(url))
  }

  async topStories(input: NormalizedNyTimesTopStoriesInput): Promise<NyTimesTopStoriesEnvelope> {
    const url = new URL(`${this.baseUrl}/topstories/v2/${input.section}.json`)
    url.searchParams.set('api-key', this.apiKey)
    const parsed = await this.fetchJson(url)
    const envelope = parseTopStoriesEnvelope(parsed)
    return { ...envelope, articles: envelope.articles.slice(0, input.limit) }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NYTimes request failed: ${String(error)}`, {
        provider: 'nytimes',
        endpoint: redactApiKey(url.href),
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NYTimes returned a non-JSON response: ${String(error)}`, {
        provider: 'nytimes',
        endpoint: redactApiKey(url.href),
        status: response.status,
      })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `NYTimes request failed with HTTP ${response.status}.`, {
        provider: 'nytimes',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parsed
  }
}

export function normalizeNyTimesSearchInput(input: NyTimesSearchInput = {}): NormalizedNyTimesSearchInput {
  return {
    query: normalizeText(input.query ?? NYTIMES_DEFAULT_QUERY, '--query'),
    page: normalizeInteger(input.page ?? NYTIMES_DEFAULT_PAGE, '--page', 0, NYTIMES_MAX_PAGE),
    ...(input.filterQuery !== undefined ? { filterQuery: normalizeText(input.filterQuery, '--filter-query') } : {}),
    ...(input.beginDate !== undefined ? { beginDate: normalizeDate(input.beginDate, '--begin-date') } : {}),
    ...(input.endDate !== undefined ? { endDate: normalizeDate(input.endDate, '--end-date') } : {}),
    ...(input.sort !== undefined ? { sort: normalizeSort(input.sort) } : {}),
  }
}

export function normalizeNyTimesTopStoriesInput(input: NyTimesTopStoriesInput = {}): NormalizedNyTimesTopStoriesInput {
  return {
    section: normalizeSection(input.section ?? NYTIMES_DEFAULT_TOP_SECTION),
    limit: normalizeInteger(input.limit ?? NYTIMES_DEFAULT_TOP_LIMIT, '--limit', 1, NYTIMES_MAX_TOP_LIMIT),
  }
}

function parseSearchEnvelope(value: unknown): NyTimesSearchEnvelope {
  if (!isRecord(value) || typeof value.status !== 'string' || !isRecord(value.response)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYTimes Article Search response had an unexpected schema.')
  }
  if (value.response.docs !== null && !Array.isArray(value.response.docs)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYTimes Article Search response had an unexpected schema.')
  }
  const docs = Array.isArray(value.response.docs) ? value.response.docs : []
  const metadata = isRecord(value.response.metadata) ? value.response.metadata : {}
  return {
    status: value.status,
    hits: typeof metadata.hits === 'number' ? metadata.hits : docs.length,
    offset: typeof metadata.offset === 'number' ? metadata.offset : 0,
    articles: docs.filter(isRecord).map(parseSearchArticle),
  }
}

function parseSearchArticle(value: Record<string, unknown>): NyTimesArticle {
  const id = optionalString(value._id) ?? optionalString(value.uri) ?? optionalString(value.web_url)
  const headline = isRecord(value.headline) ? optionalString(value.headline.main) ?? optionalString(value.headline.print_headline) : undefined
  if (id === undefined || headline === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYTimes search article was missing id or headline.')
  }
  const byline = isRecord(value.byline) ? optionalString(value.byline.original) : undefined
  return {
    id,
    title: headline,
    abstract: optionalString(value.abstract),
    url: optionalString(value.web_url),
    source: optionalString(value.source),
    byline,
    section: optionalString(value.section_name),
    subsection: optionalString(value.subsection_name),
    publishedAt: optionalString(value.pub_date),
    documentType: optionalString(value.document_type),
  }
}

function parseTopStoriesEnvelope(value: unknown): NyTimesTopStoriesEnvelope {
  if (!isRecord(value) || typeof value.status !== 'string' || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYTimes Top Stories response had an unexpected schema.')
  }
  return {
    status: value.status,
    section: optionalString(value.section) ?? NYTIMES_DEFAULT_TOP_SECTION,
    numResults: typeof value.num_results === 'number' ? value.num_results : value.results.length,
    articles: value.results.filter(isRecord).map(parseTopStory),
  }
}

function parseTopStory(value: Record<string, unknown>): NyTimesArticle {
  const uri = optionalString(value.uri) ?? optionalString(value.url)
  const title = optionalString(value.title)
  if (uri === undefined || title === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYTimes top story was missing uri or title.')
  }
  return {
    id: uri,
    title,
    abstract: optionalString(value.abstract),
    url: optionalString(value.url),
    byline: optionalString(value.byline),
    section: optionalString(value.section),
    subsection: optionalString(value.subsection),
    publishedAt: optionalString(value.published_date),
    updatedAt: optionalString(value.updated_date),
    documentType: optionalString(value.item_type) ?? optionalString(value.material_type_facet),
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[NYTIMES_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${NYTIMES_ENV_API_KEY}.`, {
      env: NYTIMES_ENV_API_KEY,
      remediation: `Set ${NYTIMES_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function normalizeSort(value: string): NyTimesSort {
  if (value !== 'newest' && value !== 'oldest' && value !== 'relevance') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--sort must be newest, oldest, or relevance.')
  }
  return value
}

function normalizeDate(value: string, label: string): string {
  const normalized = normalizeText(value, label)
  if (!/^\d{8}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must use YYYYMMDD format.`)
  }
  return normalized
}

function normalizeSection(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]+(?:-[a-z]+)*$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--section must be a NYTimes top-stories section slug.')
  }
  return normalized
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
  return optionalString(value.faultstring) ?? optionalString(value.message) ?? optionalString(value.error) ?? optionalString(value.status)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && typeof value.status === 'string' && value.status.toUpperCase() === 'ERROR'
}

function redactErrorPayload(value: unknown): unknown {
  return isRecord(value) ? { ...value, 'api-key': '<redacted>', apiKey: '<redacted>' } : value
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]api-key=)[^&]+/u, '$1<redacted>').replace(/([?&]apiKey=)[^&]+/u, '$1<redacted>')
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
