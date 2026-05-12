import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CURRENTS_DEFAULT_BASE_URL = 'https://api.currentsapi.services/v1'
export const CURRENTS_ENV_API_KEY = 'CURRENTS_API_KEY'
export const CURRENTS_DEFAULT_PAGE_SIZE = 300
export const CURRENTS_MAX_PAGE_SIZE = 300
export const CURRENTS_DEFAULT_LANGUAGE = 'en'
export const CURRENTS_DEFAULT_PAGE = 1
export const CURRENTS_MAX_PAGE = 1000

export type CurrentsNewsInput = {
  apiKey?: string | undefined
  language?: string | undefined
  country?: string | undefined
  category?: string | undefined
  keywords?: string | undefined
  pageSize?: number | undefined
  page?: number | undefined
}

export type NormalizedCurrentsNewsInput = {
  language: string
  pageSize: number
  page: number
  country?: string | undefined
  category?: string | undefined
  keywords?: string | undefined
}

export type CurrentsArticle = {
  id: string
  title: string
  description?: string | undefined
  url: string
  author?: string | undefined
  image?: string | undefined
  language?: string | undefined
  category: string[]
  published?: string | undefined
}

export type CurrentsRateLimit = {
  burstLimit?: string | undefined
  burstRemaining?: string | undefined
  burstReset?: string | undefined
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
  resetTime?: string | undefined
}

export type CurrentsNewsEnvelope = {
  status: string
  page: number
  articles: CurrentsArticle[]
  rateLimit: CurrentsRateLimit
}

export class CurrentsClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? CURRENTS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async latestNews(input: NormalizedCurrentsNewsInput): Promise<CurrentsNewsEnvelope> {
    const url = new URL(`${this.baseUrl}/latest-news`)
    url.searchParams.set('apiKey', this.apiKey)
    url.searchParams.set('language', input.language)
    url.searchParams.set('page_size', String(input.pageSize))
    url.searchParams.set('page', String(input.page))
    appendOptionalParam(url, 'country', input.country)
    appendOptionalParam(url, 'category', input.category)
    appendOptionalParam(url, 'keywords', input.keywords)

    const { parsed, rateLimit } = await this.fetchJson(url)
    return parseNewsEnvelope(parsed, rateLimit)
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: CurrentsRateLimit }> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Currents request failed: ${String(error)}`, {
        provider: 'currents',
        endpoint: redactApiKey(url.href),
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Currents returned a non-JSON response: ${String(error)}`, {
        provider: 'currents',
        endpoint: redactApiKey(url.href),
        status: response.status,
      })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Currents request failed with HTTP ${response.status}.`, {
        provider: 'currents',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeCurrentsNewsInput(input: CurrentsNewsInput = {}): NormalizedCurrentsNewsInput {
  return {
    language: normalizeLanguage(input.language),
    pageSize: normalizeInteger(input.pageSize ?? CURRENTS_DEFAULT_PAGE_SIZE, '--page-size', 1, CURRENTS_MAX_PAGE_SIZE),
    page: normalizeInteger(input.page ?? CURRENTS_DEFAULT_PAGE, '--page', 1, CURRENTS_MAX_PAGE),
    ...(input.country !== undefined ? { country: normalizeCode(input.country, '--country') } : {}),
    ...(input.category !== undefined ? { category: normalizeText(input.category, '--category') } : {}),
    ...(input.keywords !== undefined ? { keywords: normalizeText(input.keywords, '--keywords') } : {}),
  }
}

function parseNewsEnvelope(value: unknown, rateLimit: CurrentsRateLimit): CurrentsNewsEnvelope {
  if (!isRecord(value) || typeof value.status !== 'string' || !Array.isArray(value.news)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Currents latest-news response had an unexpected schema.')
  }
  return {
    status: value.status,
    page: typeof value.page === 'number' ? value.page : CURRENTS_DEFAULT_PAGE,
    articles: value.news.filter(isRecord).map(parseArticle),
    rateLimit,
  }
}

function parseArticle(value: Record<string, unknown>): CurrentsArticle {
  const id = optionalString(value.id)
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (id === undefined || title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Currents article was missing id, title, or url.')
  }
  return {
    id,
    title,
    description: optionalString(value.description),
    url,
    author: optionalString(value.author),
    image: optionalString(value.image),
    language: optionalString(value.language),
    category: readStringArray(value.category),
    published: optionalString(value.published),
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[CURRENTS_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${CURRENTS_ENV_API_KEY}.`, {
      env: CURRENTS_ENV_API_KEY,
      remediation: `Set ${CURRENTS_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function readRateLimit(headers: Headers): CurrentsRateLimit {
  return {
    burstLimit: headers.get('x-ratelimit-burst-limit') ?? undefined,
    burstRemaining: headers.get('x-ratelimit-burst-remaining') ?? undefined,
    burstReset: headers.get('x-ratelimit-burst-reset') ?? undefined,
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
    reset: headers.get('x-ratelimit-reset') ?? undefined,
    resetTime: headers.get('x-ratelimit-reset-time') ?? undefined,
  }
}

function normalizeLanguage(value: string | undefined): string {
  return normalizeCode(value ?? CURRENTS_DEFAULT_LANGUAGE, '--language')
}

function normalizeCode(value: string, label: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a two-letter code.`)
  }
  return normalized
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer from ${min} to ${max}.`)
  }
  return value
}

function appendOptionalParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, value)
  }
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(optionalString).filter((entry): entry is string => entry !== undefined) : []
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.error) ?? optionalString(value.status)
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && typeof value.status === 'string' && value.status.toLowerCase() !== 'ok'
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

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
