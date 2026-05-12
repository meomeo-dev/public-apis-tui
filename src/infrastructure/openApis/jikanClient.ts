import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const JIKAN_DEFAULT_BASE_URL = 'https://api.jikan.moe/v4'

export type JikanAnimeSearchQuery = {
  q?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  sfw?: boolean | undefined
  type?: string | undefined
  status?: string | undefined
  orderBy?: string | undefined
  sort?: string | undefined
}

export type JikanPagination = {
  lastVisiblePage: number
  hasNextPage: boolean
  currentPage: number
  items: {
    count: number
    total: number
    perPage: number
  }
}

export type JikanAnimeRow = {
  id: number
  url: string
  title: string
  titleEnglish?: string | undefined
  titleJapanese?: string | undefined
  type?: string | undefined
  source?: string | undefined
  episodes?: number | undefined
  status?: string | undefined
  score?: number | undefined
  rank?: number | undefined
  popularity?: number | undefined
  members?: number | undefined
  rating?: string | undefined
  synopsis?: string | undefined
  imageUrl?: string | undefined
}

export type JikanAnimeSearchResponse = {
  pagination: JikanPagination
  data: JikanAnimeRow[]
}

export type JikanClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class JikanClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: JikanClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? JIKAN_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchAnime(query: JikanAnimeSearchQuery = {}): Promise<JikanAnimeSearchResponse> {
    const url = new URL(`${this.baseUrl}/anime`)
    setOptionalString(url, 'q', query.q)
    setOptionalNumber(url, 'limit', query.limit)
    setOptionalNumber(url, 'page', query.page)
    setOptionalBoolean(url, 'sfw', query.sfw)
    setOptionalString(url, 'type', query.type)
    setOptionalString(url, 'status', query.status)
    setOptionalString(url, 'order_by', query.orderBy)
    setOptionalString(url, 'sort', query.sort)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui/0.5.0 no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Jikan returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readJikanError(parsed) ?? response.statusText ?? 'Jikan request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseAnimeSearch(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function setOptionalString(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, value)
  }
}

function setOptionalNumber(url: URL, name: string, value: number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, String(value))
  }
}

function setOptionalBoolean(url: URL, name: string, value: boolean | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, String(value))
  }
}

function parseAnimeSearch(value: unknown): JikanAnimeSearchResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Jikan anime search response must be an object.')
  }
  const pagination = value.pagination
  if (!isRecord(pagination)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Jikan anime search response must include pagination.')
  }
  const data = value.data
  if (!Array.isArray(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Jikan anime search response data must be an array.')
  }
  return {
    pagination: parsePagination(pagination),
    data: data.filter(isRecord).map(parseAnimeRow),
  }
}

function parsePagination(value: Record<string, unknown>): JikanPagination {
  const items = value.items
  if (!isRecord(items)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Jikan pagination must include items.')
  }
  return {
    lastVisiblePage: readNumber(value, 'last_visible_page'),
    hasNextPage: readBoolean(value, 'has_next_page'),
    currentPage: readNumber(value, 'current_page'),
    items: {
      count: readNumber(items, 'count'),
      total: readNumber(items, 'total'),
      perPage: readNumber(items, 'per_page'),
    },
  }
}

function parseAnimeRow(value: Record<string, unknown>): JikanAnimeRow {
  const images = isRecord(value.images) ? value.images : {}
  const jpg = isRecord(images.jpg) ? images.jpg : {}
  return {
    id: readNumber(value, 'mal_id'),
    url: readString(value, 'url'),
    title: readString(value, 'title'),
    ...readOptionalStringProperty(value, 'title_english', 'titleEnglish'),
    ...readOptionalStringProperty(value, 'title_japanese', 'titleJapanese'),
    ...readOptionalStringProperty(value, 'type', 'type'),
    ...readOptionalStringProperty(value, 'source', 'source'),
    ...readOptionalNumberProperty(value, 'episodes', 'episodes'),
    ...readOptionalStringProperty(value, 'status', 'status'),
    ...readOptionalNumberProperty(value, 'score', 'score'),
    ...readOptionalNumberProperty(value, 'rank', 'rank'),
    ...readOptionalNumberProperty(value, 'popularity', 'popularity'),
    ...readOptionalNumberProperty(value, 'members', 'members'),
    ...readOptionalStringProperty(value, 'rating', 'rating'),
    ...readOptionalStringProperty(value, 'synopsis', 'synopsis'),
    ...readOptionalStringProperty(jpg, 'image_url', 'imageUrl'),
  }
}

function readJikanError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.message === 'string') {
    return value.message
  }
  if (typeof value.error === 'string') {
    return value.error
  }
  return undefined
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Jikan field ${key} must be a string.`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Jikan field ${key} must be a number.`)
  }
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Jikan field ${key} must be a boolean.`)
  }
  return value
}

function readOptionalStringProperty<TName extends string>(
  record: Record<string, unknown>,
  key: string,
  propertyName: TName,
): { [Key in TName]?: string | undefined } {
  const value = record[key]
  if (value === undefined || value === null || value === '') {
    return {}
  }
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Jikan field ${key} must be a string when present.`)
  }
  return { [propertyName]: value } as { [Key in TName]?: string | undefined }
}

function readOptionalNumberProperty<TName extends string>(
  record: Record<string, unknown>,
  key: string,
  propertyName: TName,
): { [Key in TName]?: number | undefined } {
  const value = record[key]
  if (value === undefined || value === null) {
    return {}
  }
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Jikan field ${key} must be a number when present.`)
  }
  return { [propertyName]: value } as { [Key in TName]?: number | undefined }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
