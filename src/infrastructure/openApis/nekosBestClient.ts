import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NEKOS_BEST_DEFAULT_BASE_URL = 'https://nekos.best/api/v2'

export type NekosBestRandomQuery = {
  category: string
  amount?: number | undefined
}

export type NekosBestSearchQuery = {
  query: string
  type: 1 | 2
  category?: string | undefined
  amount?: number | undefined
}

export type NekosBestAsset = {
  url: string
  dimensions: {
    width: number
    height: number
  }
  artistName?: string | undefined
  artistHref?: string | undefined
  sourceUrl?: string | undefined
  animeName?: string | undefined
}

export type NekosBestResultsResponse = {
  results: NekosBestAsset[]
}

export type NekosBestClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
  userAgent?: string | undefined
}

export class NekosBestClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly userAgent: string

  constructor(options: NekosBestClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? NEKOS_BEST_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
    this.userAgent = options.userAgent ?? 'public-apis-tui/0.5.0 (https://github.com/public-apis/public-apis)'
  }

  async random(query: NekosBestRandomQuery): Promise<NekosBestResultsResponse> {
    const path = `/${encodeURIComponent(query.category)}`
    return this.getResults(path, { amount: query.amount })
  }

  async search(query: NekosBestSearchQuery): Promise<NekosBestResultsResponse> {
    return this.getResults('/search', {
      query: query.query,
      type: query.type,
      category: query.category,
      amount: query.amount,
    })
  }

  private async getResults(path: string, query: Record<string, unknown>): Promise<NekosBestResultsResponse> {
    const url = new URL(`${this.baseUrl}${path}`)
    appendOptionalStringParam(url, 'query', query.query)
    appendOptionalNumberParam(url, 'type', query.type)
    appendOptionalStringParam(url, 'category', query.category)
    appendOptionalNumberParam(url, 'amount', query.amount)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': this.userAgent,
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'NekosBest returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readNekosBestError(parsed) ?? (response.statusText || 'NekosBest request failed.'), {
        status: response.status,
        response: parsed,
      })
    }

    return parseResultsResponse(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalStringParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'string' && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function parseResultsResponse(value: unknown): NekosBestResultsResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NekosBest response must be an object.')
  }
  if (!Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NekosBest response field results must be an array.')
  }
  return {
    results: value.results.map(parseAsset),
  }
}

function parseAsset(value: unknown): NekosBestAsset {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NekosBest result item must be an object.')
  }
  const dimensions = readRecord(value, 'dimensions')
  return {
    url: readString(value, 'url'),
    dimensions: {
      width: readNumber(dimensions, 'width'),
      height: readNumber(dimensions, 'height'),
    },
    ...readOptionalString(value, 'artist_name', 'artistName'),
    ...readOptionalString(value, 'artist_href', 'artistHref'),
    ...readOptionalString(value, 'source_url', 'sourceUrl'),
    ...readOptionalString(value, 'anime_name', 'animeName'),
  }
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key]
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `NekosBest field ${key} must be an object.`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `NekosBest field ${key} must be a string.`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `NekosBest field ${key} must be a number.`)
  }
  return value
}

function readOptionalString(
  record: Record<string, unknown>,
  sourceKey: string,
  targetKey: 'artistName' | 'artistHref' | 'sourceUrl' | 'animeName',
): Partial<NekosBestAsset> {
  const value = record[sourceKey]
  return typeof value === 'string' && value.trim() !== '' ? { [targetKey]: value } : {}
}

function readNekosBestError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.message === 'string') {
    return value.message
  }
  if (!isRecord(value.errors)) {
    return undefined
  }
  const messages = Object.values(value.errors).filter((entry): entry is string => typeof entry === 'string')
  return messages.length > 0 ? messages.join('; ') : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
