import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CROSSREF_DEFAULT_BASE_URL = 'https://api.crossref.org'

export type CrossrefWorksQuery = {
  query?: string | undefined
  rows?: number | undefined
  offset?: number | undefined
  filter?: string | undefined
  sort?: string | undefined
  order?: string | undefined
  select?: string | undefined
  mailto?: string | undefined
}

export type CrossrefWorkQuery = {
  doi: string
  mailto?: string | undefined
}

export type CrossrefDateParts = {
  dateParts?: number[][] | undefined
}

export type CrossrefAuthor = {
  given?: string | undefined
  family?: string | undefined
  name?: string | undefined
}

export type CrossrefWork = {
  DOI: string
  title?: string[] | undefined
  subtitle?: string[] | undefined
  author?: CrossrefAuthor[] | undefined
  publisher?: string | undefined
  type?: string | undefined
  issued?: CrossrefDateParts | undefined
  publishedPrint?: CrossrefDateParts | undefined
  publishedOnline?: CrossrefDateParts | undefined
  containerTitle?: string[] | undefined
  isReferencedByCount?: number | undefined
  URL?: string | undefined
  abstract?: string | undefined
}

export type CrossrefRateLimit = {
  limit?: string | undefined
  interval?: string | undefined
  concurrencyLimit?: string | undefined
  apiPool?: string | undefined
}

export type CrossrefWorksResponse = {
  totalResults: number
  itemsPerPage: number
  nextOffset: number
  items: CrossrefWork[]
  rateLimit: CrossrefRateLimit
}

export type CrossrefWorkResponse = {
  work: CrossrefWork
  rateLimit: CrossrefRateLimit
}

export type CrossrefClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class CrossrefClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: CrossrefClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? CROSSREF_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listWorks(query: CrossrefWorksQuery = {}): Promise<CrossrefWorksResponse> {
    const url = new URL('/works', this.baseUrl)
    appendOptionalStringParam(url, 'query', query.query)
    appendOptionalNumberParam(url, 'rows', query.rows)
    appendOptionalNumberParam(url, 'offset', query.offset)
    appendOptionalStringParam(url, 'filter', query.filter)
    appendOptionalStringParam(url, 'sort', query.sort)
    appendOptionalStringParam(url, 'order', query.order)
    appendOptionalStringParam(url, 'select', query.select)
    appendOptionalStringParam(url, 'mailto', query.mailto)
    const { parsed, rateLimit } = await this.fetchJson(url)
    return parseWorksResponse(parsed, rateLimit, query.offset ?? 0)
  }

  async getWork(query: CrossrefWorkQuery): Promise<CrossrefWorkResponse> {
    const url = new URL(`/works/${encodeURIComponent(query.doi)}`, this.baseUrl)
    appendOptionalStringParam(url, 'mailto', query.mailto)
    const { parsed, rateLimit } = await this.fetchJson(url)
    return {
      work: parseMessageWork(parsed),
      rateLimit,
    }
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: CrossrefRateLimit }> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI; https://github.com/public-apis/public-apis',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Crossref REST API returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || isCrossrefError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readCrossrefError(parsed) ?? response.statusText ?? 'Crossref REST API request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

function parseWorksResponse(value: unknown, rateLimit: CrossrefRateLimit, offset: number): CrossrefWorksResponse {
  const message = readCrossrefMessage(value)
  if (!Array.isArray(message.items) || typeof message['total-results'] !== 'number' || typeof message['items-per-page'] !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Crossref works response is missing result metadata.')
  }
  const items = message.items.map(parseWork)
  return {
    totalResults: message['total-results'],
    itemsPerPage: message['items-per-page'],
    nextOffset: offset + items.length,
    items,
    rateLimit,
  }
}

function parseMessageWork(value: unknown): CrossrefWork {
  return parseWork(readCrossrefMessage(value))
}

function readCrossrefMessage(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.message)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Crossref response is missing message object.')
  }
  return value.message
}

function parseWork(value: unknown): CrossrefWork {
  if (!isRecord(value) || typeof value.DOI !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Crossref work item is missing DOI.')
  }
  return {
    DOI: value.DOI,
    ...(isStringArray(value.title) ? { title: value.title } : {}),
    ...(isStringArray(value.subtitle) ? { subtitle: value.subtitle } : {}),
    ...(Array.isArray(value.author) ? { author: value.author.filter(isRecord).map(parseAuthor) } : {}),
    ...(typeof value.publisher === 'string' ? { publisher: value.publisher } : {}),
    ...(typeof value.type === 'string' ? { type: value.type } : {}),
    ...(isDateParts(value.issued) ? { issued: parseDateParts(value.issued) } : {}),
    ...(isDateParts(value['published-print']) ? { publishedPrint: parseDateParts(value['published-print']) } : {}),
    ...(isDateParts(value['published-online']) ? { publishedOnline: parseDateParts(value['published-online']) } : {}),
    ...(isStringArray(value['container-title']) ? { containerTitle: value['container-title'] } : {}),
    ...(typeof value['is-referenced-by-count'] === 'number' ? { isReferencedByCount: value['is-referenced-by-count'] } : {}),
    ...(typeof value.URL === 'string' ? { URL: value.URL } : {}),
    ...(typeof value.abstract === 'string' ? { abstract: value.abstract } : {}),
  }
}

function parseAuthor(value: Record<string, unknown>): CrossrefAuthor {
  return {
    ...(typeof value.given === 'string' ? { given: value.given } : {}),
    ...(typeof value.family === 'string' ? { family: value.family } : {}),
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
  }
}

function parseDateParts(value: Record<string, unknown>): CrossrefDateParts {
  return {
    dateParts: Array.isArray(value['date-parts'])
      ? value['date-parts'].filter((part): part is number[] => Array.isArray(part) && part.every(entry => typeof entry === 'number'))
      : undefined,
  }
}

function isCrossrefError(value: unknown): boolean {
  return isRecord(value) && value.status === 'failed'
}

function readCrossrefError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function readRateLimit(headers: Headers): CrossrefRateLimit {
  return {
    limit: headers.get('x-rate-limit-limit') ?? undefined,
    interval: headers.get('x-rate-limit-interval') ?? undefined,
    concurrencyLimit: headers.get('x-concurrency-limit') ?? undefined,
    apiPool: headers.get('x-api-pool') ?? undefined,
  }
}

function appendOptionalStringParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isDateParts(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Array.isArray(value['date-parts'])
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
