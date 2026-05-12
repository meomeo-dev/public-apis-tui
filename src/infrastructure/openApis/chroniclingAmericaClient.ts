import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CHRONICLING_AMERICA_DEFAULT_BASE_URL = 'https://www.loc.gov'
export const CHRONICLING_AMERICA_DEFAULT_QUERY = 'lincoln'
export const CHRONICLING_AMERICA_DEFAULT_COUNT = 1000
export const CHRONICLING_AMERICA_MAX_COUNT = 1000
export const CHRONICLING_AMERICA_DEFAULT_PAGE = 1
export const CHRONICLING_AMERICA_MAX_PAGE = 100

export type ChroniclingAmericaSearchInput = {
  query?: string | undefined
  count?: number | undefined
  page?: number | undefined
  dates?: string | undefined
}

export type NormalizedChroniclingAmericaSearchInput = {
  query: string
  count: number
  page: number
  dates?: string | undefined
}

export type ChroniclingAmericaItem = {
  id: string
  title: string
  url?: string | undefined
  date?: string | undefined
  digitized?: boolean | undefined
  description?: string | undefined
  imageUrl?: string | undefined
  subjects: string[]
  locations: string[]
  partOf: string[]
  originalFormats: string[]
  onlineFormats: string[]
}

export type ChroniclingAmericaPagination = {
  current: number
  perPage: number
  total?: number | undefined
  from?: number | undefined
  to?: number | undefined
  nextUrl?: string | undefined
  previousUrl?: string | undefined
}

export type ChroniclingAmericaSearchEnvelope = {
  items: ChroniclingAmericaItem[]
  pagination: ChroniclingAmericaPagination
  timestamp?: string | undefined
}

export class ChroniclingAmericaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async search(input: NormalizedChroniclingAmericaSearchInput): Promise<ChroniclingAmericaSearchEnvelope> {
    const url = this.createUrl('/collections/chronicling-america/')
    url.searchParams.set('fo', 'json')
    url.searchParams.set('at', 'results,pagination')
    url.searchParams.set('q', input.query)
    url.searchParams.set('c', String(input.count))
    url.searchParams.set('sp', String(input.page))
    if (input.dates !== undefined) {
      url.searchParams.set('dates', input.dates)
    }

    const parsed = await this.fetchJson(url)
    return parseSearchEnvelope(parsed)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname.replace(/^\/+/u, ''), normalizeBaseUrl(this.options.baseUrl ?? CHRONICLING_AMERICA_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Chronicling America request failed: ${String(error)}`, {
        provider: 'chroniclingamerica',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Chronicling America response body could not be read: ${String(error)}`, {
        provider: 'chroniclingamerica',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Chronicling America is currently returning a Cloudflare challenge HTML page instead of the documented LOC JSON API response; retry later or use cached/offline data.', {
        provider: 'chroniclingamerica',
        endpoint: url.href,
        status: response.status,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Chronicling America returned a non-JSON response: ${String(error)}`, {
        provider: 'chroniclingamerica',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Chronicling America request failed with HTTP ${response.status}.`, {
        provider: 'chroniclingamerica',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeChroniclingAmericaSearchInput(input: ChroniclingAmericaSearchInput = {}): NormalizedChroniclingAmericaSearchInput {
  return {
    query: normalizeText(input.query, CHRONICLING_AMERICA_DEFAULT_QUERY, '--query'),
    count: normalizeInteger(input.count ?? CHRONICLING_AMERICA_DEFAULT_COUNT, '--count', 1, CHRONICLING_AMERICA_MAX_COUNT),
    page: normalizeInteger(input.page ?? CHRONICLING_AMERICA_DEFAULT_PAGE, '--page', 1, CHRONICLING_AMERICA_MAX_PAGE),
    ...(input.dates !== undefined ? { dates: normalizeDates(input.dates) } : {}),
  }
}

function parseSearchEnvelope(value: unknown): ChroniclingAmericaSearchEnvelope {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Chronicling America search response had an unexpected schema.')
  }
  const pagination = isRecord(value.pagination) ? value.pagination : {}
  return {
    items: value.results.filter(isRecord).map(parseItem),
    pagination: {
      current: readNumber(pagination.current) ?? CHRONICLING_AMERICA_DEFAULT_PAGE,
      perPage: readNumber(pagination.perpage) ?? CHRONICLING_AMERICA_DEFAULT_COUNT,
      total: readNumber(pagination.total),
      from: readNumber(pagination.from),
      to: readNumber(pagination.to),
      nextUrl: optionalString(pagination.next),
      previousUrl: optionalString(pagination.previous),
    },
    timestamp: optionalString(value.timestamp),
  }
}

function parseItem(value: Record<string, unknown>): ChroniclingAmericaItem {
  const id = optionalString(value.id)
  const title = optionalString(value.title)
  if (id === undefined || title === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Chronicling America result item was missing id or title.')
  }
  const descriptions = readStringArray(value.description)
  const imageUrls = readStringArray(value.image_url).filter(url => url.startsWith('http'))
  return {
    id,
    title,
    url: optionalString(value.url),
    date: optionalString(value.date),
    digitized: typeof value.digitized === 'boolean' ? value.digitized : undefined,
    description: descriptions[0],
    imageUrl: imageUrls[0],
    subjects: readStringArray(value.subject),
    locations: readStringArray(value.location),
    partOf: readStringArray(value.partof),
    originalFormats: readStringArray(value.original_format),
    onlineFormats: readStringArray(value.online_format),
  }
}

function normalizeText(value: string | undefined, fallback: string, label: string): string {
  const normalized = (value ?? fallback).trim()
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

function normalizeDates(value: string): string {
  const dates = value.trim()
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?(?:\/\d{4}(?:-\d{2}(?:-\d{2})?)?)?$/u.test(dates)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--dates must be YYYY, YYYY-MM, YYYY-MM-DD, or start/end with the same formats.')
  }
  return dates
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(optionalString).filter((entry): entry is string => entry !== undefined) : []
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
