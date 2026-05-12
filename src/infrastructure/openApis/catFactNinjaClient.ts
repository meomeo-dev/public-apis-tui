import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CAT_FACT_NINJA_DEFAULT_BASE_URL = 'https://catfact.ninja'

export type CatFactQuery = {
  maxLength?: number | undefined
}

export type CatFactsQuery = {
  maxLength?: number | undefined
  limit?: number | undefined
  page?: number | undefined
}

export type CatBreedsQuery = {
  limit?: number | undefined
  page?: number | undefined
}

export type CatFact = {
  fact: string
  length: number
}

export type CatBreed = {
  breed: string
  country: string
  origin: string
  coat: string
  pattern: string
}

export type CatFactPagination<T> = {
  current_page: number
  data: T[]
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export type CatFactNinjaClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class CatFactNinjaClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: CatFactNinjaClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? CAT_FACT_NINJA_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getRandomFact(query: CatFactQuery = {}): Promise<CatFact> {
    return parseFact(await this.getJson('/fact', query))
  }

  async listFacts(query: CatFactsQuery = {}): Promise<CatFactPagination<CatFact>> {
    return parsePaginatedResponse(await this.getJson('/facts', query), parseFact)
  }

  async listBreeds(query: CatBreedsQuery = {}): Promise<CatFactPagination<CatBreed>> {
    return parsePaginatedResponse(await this.getJson('/breeds', query), parseBreed)
  }

  private async getJson(path: string, query: Record<string, unknown>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    appendOptionalNumberParam(url, 'max_length', query.maxLength)
    appendOptionalNumberParam(url, 'limit', query.limit)
    appendOptionalNumberParam(url, 'page', query.page)
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'CatFact Ninja returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw createCatFactFailure(parsed, response.status, response.statusText)
    }

    return parsed
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalNumberParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function parseFact(value: unknown): CatFact {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CatFact Ninja fact must be an object.')
  }

  const record = value as Record<string, unknown>
  return {
    fact: readString(record, 'fact'),
    length: readNumber(record, 'length'),
  }
}

function parseBreed(value: unknown): CatBreed {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CatFact Ninja breed must be an object.')
  }

  const record = value as Record<string, unknown>
  return {
    breed: readString(record, 'breed'),
    country: readString(record, 'country'),
    origin: readString(record, 'origin'),
    coat: readString(record, 'coat'),
    pattern: readString(record, 'pattern'),
  }
}

function parsePaginatedResponse<T>(
  value: unknown,
  parseItem: (item: unknown) => T,
): CatFactPagination<T> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CatFact Ninja paginated response must be an object.')
  }

  const record = value as Record<string, unknown>
  const data = record.data
  if (!Array.isArray(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CatFact Ninja paginated response data must be an array.')
  }

  return {
    current_page: readNumber(record, 'current_page'),
    data: data.map(parseItem),
    first_page_url: readString(record, 'first_page_url'),
    from: readNullableNumber(record, 'from'),
    last_page: readNumber(record, 'last_page'),
    last_page_url: readString(record, 'last_page_url'),
    next_page_url: readNullableString(record, 'next_page_url'),
    path: readString(record, 'path'),
    per_page: readNumber(record, 'per_page'),
    prev_page_url: readNullableString(record, 'prev_page_url'),
    to: readNullableNumber(record, 'to'),
    total: readNumber(record, 'total'),
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `CatFact Ninja field ${key} must be a string.`)
  }
  return value
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value === null || typeof value === 'string') {
    return value
  }
  throw new RuntimeFailure('OPEN_API_FAILED', `CatFact Ninja field ${key} must be a string or null.`)
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `CatFact Ninja field ${key} must be a number.`)
  }
  return value
}

function readNullableNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  if (value === null || typeof value === 'number') {
    return value
  }
  throw new RuntimeFailure('OPEN_API_FAILED', `CatFact Ninja field ${key} must be a number or null.`)
}

function createCatFactFailure(value: unknown, status: number, statusText: string): RuntimeFailure {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const message = typeof record.message === 'string' ? record.message : statusText
    return new RuntimeFailure('OPEN_API_FAILED', message || 'CatFact Ninja request failed.', {
      status,
      errors: record.errors,
    })
  }

  return new RuntimeFailure('OPEN_API_FAILED', statusText || 'CatFact Ninja request failed.', { status })
}
