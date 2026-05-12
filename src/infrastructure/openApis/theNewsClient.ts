import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const THENEWS_DEFAULT_BASE_URL = 'https://api.thenewsapi.com/v1'
export const THENEWS_ENV_API_KEY = 'THENEWSAPI_API_KEY'
export const THENEWS_DEFAULT_SEARCH = 'public api'
export const THENEWS_DEFAULT_LANGUAGE = 'en'
export const THENEWS_DEFAULT_PAGE = 1
export const THENEWS_MAX_LIMIT = 100

export type TheNewsSort = 'published_at' | 'published_on' | 'relevance_score'

export type TheNewsAllInput = {
  apiKey?: string | undefined
  search?: string | undefined
  language?: string | undefined
  locale?: string | undefined
  categories?: string | undefined
  domains?: string | undefined
  publishedAfter?: string | undefined
  publishedBefore?: string | undefined
  publishedOn?: string | undefined
  sort?: TheNewsSort | undefined
  limit?: number | undefined
  page?: number | undefined
}

export type NormalizedTheNewsAllInput = {
  search: string
  language: string
  page: number
  locale?: string | undefined
  categories?: string | undefined
  domains?: string | undefined
  publishedAfter?: string | undefined
  publishedBefore?: string | undefined
  publishedOn?: string | undefined
  sort?: TheNewsSort | undefined
  limit?: number | undefined
}

export type TheNewsArticle = {
  uuid: string
  title: string
  description?: string | null | undefined
  keywords?: string | null | undefined
  snippet?: string | null | undefined
  url: string
  imageUrl?: string | null | undefined
  language?: string | undefined
  publishedAt?: string | undefined
  source?: string | undefined
  categories: string[]
  locale?: string | undefined
  relevanceScore?: number | null | undefined
}

export type TheNewsMeta = {
  found: number
  returned: number
  limit: number
  page: number
}

export type TheNewsEnvelope = {
  data: TheNewsArticle[]
  meta: TheNewsMeta
}

export class TheNewsClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? THENEWS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async all(input: NormalizedTheNewsAllInput): Promise<TheNewsEnvelope> {
    const url = new URL(`${this.baseUrl}/news/all`)
    url.searchParams.set('api_token', this.apiKey)
    url.searchParams.set('search', input.search)
    url.searchParams.set('language', input.language)
    url.searchParams.set('page', String(input.page))
    appendOptionalParam(url, 'locale', input.locale)
    appendOptionalParam(url, 'categories', input.categories)
    appendOptionalParam(url, 'domains', input.domains)
    appendOptionalParam(url, 'published_after', input.publishedAfter)
    appendOptionalParam(url, 'published_before', input.publishedBefore)
    appendOptionalParam(url, 'published_on', input.publishedOn)
    appendOptionalParam(url, 'sort', input.sort)
    if (input.limit !== undefined) {
      url.searchParams.set('limit', String(input.limit))
    }
    return this.fetchJson(url)
  }

  private async fetchJson(url: URL): Promise<TheNewsEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `TheNewsAPI request failed: ${String(error)}`, { provider: 'thenews', endpoint: redactApiKey(url.href) })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `TheNewsAPI returned a non-JSON response: ${String(error)}`, { provider: 'thenews', endpoint: redactApiKey(url.href), status: response.status })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `TheNewsAPI request failed with HTTP ${response.status}.`, {
        provider: 'thenews',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parseEnvelope(parsed)
  }
}

export function normalizeTheNewsAllInput(input: TheNewsAllInput = {}): NormalizedTheNewsAllInput {
  return {
    search: normalizeText(input.search ?? THENEWS_DEFAULT_SEARCH, '--search'),
    language: normalizeCodeList(input.language ?? THENEWS_DEFAULT_LANGUAGE, '--language'),
    page: normalizeInteger(input.page ?? THENEWS_DEFAULT_PAGE, '--page', 1, 400),
    ...(input.locale !== undefined ? { locale: normalizeCodeList(input.locale, '--locale') } : {}),
    ...(input.categories !== undefined ? { categories: normalizeTokenList(input.categories, '--categories') } : {}),
    ...(input.domains !== undefined ? { domains: normalizeTokenList(input.domains, '--domains') } : {}),
    ...(input.publishedAfter !== undefined ? { publishedAfter: normalizeDateTime(input.publishedAfter, '--published-after') } : {}),
    ...(input.publishedBefore !== undefined ? { publishedBefore: normalizeDateTime(input.publishedBefore, '--published-before') } : {}),
    ...(input.publishedOn !== undefined ? { publishedOn: normalizeDate(input.publishedOn, '--published-on') } : {}),
    ...(input.sort !== undefined ? { sort: normalizeSort(input.sort) } : {}),
    ...(input.limit !== undefined ? { limit: normalizeInteger(input.limit, '--limit', 1, THENEWS_MAX_LIMIT) } : {}),
  }
}

function parseEnvelope(value: unknown): TheNewsEnvelope {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'TheNewsAPI response had an unexpected schema.')
  }
  const meta = value.meta
  if (typeof meta.found !== 'number' || typeof meta.returned !== 'number' || typeof meta.limit !== 'number' || typeof meta.page !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'TheNewsAPI response was missing meta pagination fields.')
  }
  return {
    data: value.data.filter(isRecord).map(parseArticle),
    meta: { found: meta.found, returned: meta.returned, limit: meta.limit, page: meta.page },
  }
}

function parseArticle(value: Record<string, unknown>): TheNewsArticle {
  const uuid = optionalString(value.uuid)
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (uuid === undefined || title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'TheNewsAPI article was missing uuid, title, or url.')
  }
  return {
    uuid,
    title,
    url,
    description: optionalNullableString(value.description),
    keywords: optionalNullableString(value.keywords),
    snippet: optionalNullableString(value.snippet),
    imageUrl: optionalNullableString(value.image_url),
    language: optionalString(value.language),
    publishedAt: optionalString(value.published_at),
    source: optionalString(value.source),
    categories: parseStringArray(value.categories),
    locale: optionalString(value.locale),
    relevanceScore: typeof value.relevance_score === 'number' || value.relevance_score === null ? value.relevance_score : undefined,
  }
}

function appendOptionalParam(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') url.searchParams.set(name, value)
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[THENEWS_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${THENEWS_ENV_API_KEY}.`, {
      env: THENEWS_ENV_API_KEY,
      remediation: `Set ${THENEWS_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function normalizeCodeList(value: string, label: string): string {
  const entries = normalizeCsv(value, label, 5)
  if (entries.some(entry => !/^[a-z]{2}$/u.test(entry.toLowerCase()))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a comma-separated list of two-letter codes.`)
  }
  return entries.map(entry => entry.toLowerCase()).join(',')
}

function normalizeTokenList(value: string, label: string): string {
  const entries = normalizeCsv(value, label, 10)
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

function normalizeDate(value: string, label: string): string {
  const normalized = normalizeText(value, label)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must use YYYY-MM-DD.`)
  return normalized
}

function normalizeDateTime(value: string, label: string): string {
  const normalized = normalizeText(value, label)
  if (!/^\d{4}(?:-\d{2}){0,2}(?:T\d{2}(?::\d{2}){0,2})?$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must use a documented TheNewsAPI date or datetime format.`)
  }
  return normalized
}

function normalizeSort(value: string): TheNewsSort {
  if (value === 'published_at' || value === 'published_on' || value === 'relevance_score') return value
  throw new RuntimeFailure('INVALID_ARGUMENT', '--sort must be one of: published_at, published_on, relevance_score.')
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  return value
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  return normalized
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  return optionalString(value)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && isRecord(value.error)
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.error)) return undefined
  return typeof value.error.message === 'string' ? value.error.message : undefined
}

function redactErrorPayload(value: unknown): unknown {
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [
    key,
    /api[-_]?token|token|secret/iu.test(key) ? '[redacted]' : entryValue,
  ]))
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]api_token=)[^&]+/iu, '$1[redacted]')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
