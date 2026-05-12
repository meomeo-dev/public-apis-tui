import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MARKETAUX_DEFAULT_BASE_URL = 'https://api.marketaux.com/v1'
export const MARKETAUX_ENV_API_KEY = 'MARKETAUX_API_KEY'
export const MARKETAUX_DEFAULT_LIMIT = 100
export const MARKETAUX_MAX_LIMIT = 100
export const MARKETAUX_DEFAULT_PAGE = 1
export const MARKETAUX_MAX_RESULT_WINDOW = 20_000

export type MarketAuxNewsInput = {
  apiKey?: string | undefined
  search?: string | undefined
  symbols?: string | undefined
  countries?: string | undefined
  industries?: string | undefined
  language?: string | undefined
  sentimentMin?: number | undefined
  sentimentMax?: number | undefined
  publishedAfter?: string | undefined
  publishedBefore?: string | undefined
  limit?: number | undefined
  page?: number | undefined
}

export type NormalizedMarketAuxNewsInput = {
  limit: number
  page: number
  search?: string | undefined
  symbols?: string | undefined
  countries?: string | undefined
  industries?: string | undefined
  language?: string | undefined
  sentimentMin?: number | undefined
  sentimentMax?: number | undefined
  publishedAfter?: string | undefined
  publishedBefore?: string | undefined
}

export type MarketAuxMeta = {
  found: number
  returned: number
  limit: number
  page: number
}

export type MarketAuxEntity = {
  symbol?: string | undefined
  name?: string | undefined
  exchange?: string | undefined
  exchangeLong?: string | undefined
  country?: string | undefined
  type?: string | undefined
  industry?: string | undefined
  sentimentScore?: number | undefined
}

export type MarketAuxArticle = {
  uuid: string
  title: string
  description?: string | null | undefined
  snippet?: string | null | undefined
  url: string
  imageUrl?: string | null | undefined
  language?: string | undefined
  publishedAt?: string | undefined
  source?: string | undefined
  keywords?: string | undefined
  relevanceScore?: number | undefined
  entities: MarketAuxEntity[]
}

export type MarketAuxEnvelope = {
  meta: MarketAuxMeta
  articles: MarketAuxArticle[]
}

export class MarketAuxClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? MARKETAUX_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async listNews(input: NormalizedMarketAuxNewsInput): Promise<MarketAuxEnvelope> {
    const url = new URL(`${this.baseUrl}/news/all`)
    url.searchParams.set('api_token', this.apiKey)
    url.searchParams.set('limit', String(input.limit))
    url.searchParams.set('page', String(input.page))
    appendOptionalParam(url, 'search', input.search)
    appendOptionalParam(url, 'symbols', input.symbols)
    appendOptionalParam(url, 'countries', input.countries)
    appendOptionalParam(url, 'industries', input.industries)
    appendOptionalParam(url, 'language', input.language)
    appendOptionalNumberParam(url, 'sentiment_gte', input.sentimentMin)
    appendOptionalNumberParam(url, 'sentiment_lte', input.sentimentMax)
    appendOptionalParam(url, 'published_after', input.publishedAfter)
    appendOptionalParam(url, 'published_before', input.publishedBefore)
    return this.fetchJson(url)
  }

  private async fetchJson(url: URL): Promise<MarketAuxEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `MarketAux request failed: ${String(error)}`, {
        provider: 'marketaux',
        endpoint: redactApiToken(url.href),
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `MarketAux returned a non-JSON response: ${String(error)}`, {
        provider: 'marketaux',
        endpoint: redactApiToken(url.href),
        status: response.status,
      })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `MarketAux request failed with HTTP ${response.status}.`, {
        provider: 'marketaux',
        endpoint: redactApiToken(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parseEnvelope(parsed)
  }
}

export function normalizeMarketAuxNewsInput(input: MarketAuxNewsInput = {}): NormalizedMarketAuxNewsInput {
  const limit = normalizeInteger(input.limit ?? MARKETAUX_DEFAULT_LIMIT, '--limit', 1, MARKETAUX_MAX_LIMIT)
  return {
    limit,
    page: normalizePage(input.page ?? MARKETAUX_DEFAULT_PAGE, limit),
    ...(input.search !== undefined ? { search: normalizeText(input.search, '--search') } : {}),
    ...(input.symbols !== undefined ? { symbols: normalizeCsv(input.symbols, '--symbols') } : {}),
    ...(input.countries !== undefined ? { countries: normalizeCsv(input.countries, '--countries').toLowerCase() } : {}),
    ...(input.industries !== undefined ? { industries: normalizeCsv(input.industries, '--industries') } : {}),
    ...(input.language !== undefined ? { language: normalizeCode(input.language, '--language') } : {}),
    ...(input.sentimentMin !== undefined ? { sentimentMin: normalizeSentiment(input.sentimentMin, '--sentiment-min') } : {}),
    ...(input.sentimentMax !== undefined ? { sentimentMax: normalizeSentiment(input.sentimentMax, '--sentiment-max') } : {}),
    ...(input.publishedAfter !== undefined ? { publishedAfter: normalizeText(input.publishedAfter, '--published-after') } : {}),
    ...(input.publishedBefore !== undefined ? { publishedBefore: normalizeText(input.publishedBefore, '--published-before') } : {}),
  }
}

function parseEnvelope(value: unknown): MarketAuxEnvelope {
  if (!isRecord(value) || !isRecord(value.meta) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MarketAux response had an unexpected schema.')
  }
  return {
    meta: {
      found: readNumber(value.meta.found, 'meta.found'),
      returned: readNumber(value.meta.returned, 'meta.returned'),
      limit: readNumber(value.meta.limit, 'meta.limit'),
      page: readNumber(value.meta.page, 'meta.page'),
    },
    articles: value.data.filter(isRecord).map(parseArticle),
  }
}

function parseArticle(value: Record<string, unknown>): MarketAuxArticle {
  const uuid = optionalString(value.uuid)
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (uuid === undefined || title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MarketAux article was missing uuid, title, or url.')
  }
  return {
    uuid,
    title,
    description: optionalNullableString(value.description),
    snippet: optionalNullableString(value.snippet),
    url,
    imageUrl: optionalNullableString(value.image_url),
    language: optionalString(value.language),
    publishedAt: optionalString(value.published_at),
    source: optionalString(value.source),
    keywords: optionalString(value.keywords),
    relevanceScore: typeof value.relevance_score === 'number' ? value.relevance_score : undefined,
    entities: Array.isArray(value.entities) ? value.entities.filter(isRecord).map(parseEntity) : [],
  }
}

function parseEntity(value: Record<string, unknown>): MarketAuxEntity {
  return {
    symbol: optionalString(value.symbol),
    name: optionalString(value.name),
    exchange: optionalString(value.exchange),
    exchangeLong: optionalString(value.exchange_long),
    country: optionalString(value.country),
    type: optionalString(value.type),
    industry: optionalString(value.industry),
    sentimentScore: typeof value.sentiment_score === 'number' ? value.sentiment_score : undefined,
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[MARKETAUX_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${MARKETAUX_ENV_API_KEY}.`, {
      env: MARKETAUX_ENV_API_KEY,
      remediation: `Set ${MARKETAUX_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function normalizePage(value: number, limit: number): number {
  return normalizeInteger(value, '--page', 1, Math.max(1, Math.floor(MARKETAUX_MAX_RESULT_WINDOW / limit)))
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

function normalizeCsv(value: string, label: string): string {
  const entries = normalizeText(value, label).split(',').map(entry => entry.trim()).filter(entry => entry !== '')
  if (entries.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return entries.join(',')
}

function normalizeCode(value: string, label: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a two-letter code.`)
  }
  return normalized
}

function normalizeSentiment(value: number, label: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < -1 || value > 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a number from -1 to 1.`)
  }
  return value
}

function appendOptionalParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, value)
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `MarketAux response field ${label} must be a number.`)
  }
  return value
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (Array.isArray(value.errors)) {
    return value.errors.map(entry => (typeof entry === 'string' ? entry : JSON.stringify(entry))).join('; ')
  }
  if (isRecord(value.error)) {
    return optionalString(value.error.message) ?? optionalString(value.error.code)
  }
  return optionalString(value.message) ?? optionalString(value.error)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && (value.errors !== undefined || value.error !== undefined)
}

function redactErrorPayload(value: unknown): unknown {
  return isRecord(value) ? { ...value, api_token: '<redacted>', token: '<redacted>' } : value
}

function redactApiToken(value: string): string {
  return value.replace(/([?&]api_token=)[^&]+/u, '$1<redacted>')
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
