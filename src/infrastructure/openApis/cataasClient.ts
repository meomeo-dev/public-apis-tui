import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CATAAS_DEFAULT_BASE_URL = 'https://cataas.com'

export type CataasCatQuery = {
  tag?: string | undefined
}

export type CataasCatsQuery = {
  tags?: string | undefined
  skip?: number | undefined
  limit?: number | undefined
}

export type CataasRandomCat = {
  id: string
  tags: string[]
  created_at: string
  url: string
  mimetype: string
}

export type CataasListedCat = {
  id: string
  tags: string[]
  mimetype: string
  createdAt: string
}

export type CataasClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class CataasClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: CataasClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? CATAAS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getRandomCat(query: CataasCatQuery = {}): Promise<CataasRandomCat> {
    const path = query.tag === undefined ? '/cat' : `/cat/${encodeURIComponent(query.tag)}`
    return parseRandomCat(await this.getJson(path, { json: true }))
  }

  async listTags(): Promise<string[]> {
    const value = await this.getJson('/api/tags', {})
    if (!Array.isArray(value)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Cataas tags response must be an array.')
    }
    return value.filter((item): item is string => typeof item === 'string')
  }

  async listCats(query: CataasCatsQuery = {}): Promise<CataasListedCat[]> {
    const value = await this.getJson('/api/cats', query)
    if (!Array.isArray(value)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Cataas cats response must be an array.')
    }
    return value.map(parseListedCat)
  }

  private async getJson(path: string, query: Record<string, unknown>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    appendOptionalStringParam(url, 'tags', query.tags)
    appendOptionalNumberParam(url, 'skip', query.skip)
    appendOptionalNumberParam(url, 'limit', query.limit)
    if (query.json === true) {
      url.searchParams.set('json', 'true')
    }

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
      throw new RuntimeFailure('OPEN_API_FAILED', 'Cataas returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'Cataas request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
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

function parseRandomCat(value: unknown): CataasRandomCat {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Cataas random cat response must be an object.')
  }
  return {
    id: readString(value, 'id'),
    tags: readStringArray(value, 'tags'),
    created_at: readString(value, 'created_at'),
    url: readString(value, 'url'),
    mimetype: readString(value, 'mimetype'),
  }
}

function parseListedCat(value: unknown): CataasListedCat {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Cataas listed cat response must be an object.')
  }
  return {
    id: readString(value, 'id'),
    tags: readStringArray(value, 'tags'),
    mimetype: readString(value, 'mimetype'),
    createdAt: readString(value, 'createdAt'),
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Cataas field ${key} must be a string.`)
  }
  return value
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Cataas field ${key} must be an array.`)
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
