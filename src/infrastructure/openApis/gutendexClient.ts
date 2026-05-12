import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GUTENDEX_DEFAULT_BASE_URL = 'https://gutendex.com'

export type GutendexBooksQuery = {
  search?: string | undefined
  topic?: string | undefined
  languages?: string | undefined
  page?: number | undefined
  sort?: string | undefined
  ids?: string | undefined
}

export type GutendexBookQuery = {
  id: number
}

export type GutendexPerson = {
  name: string
  birthYear?: number | undefined
  deathYear?: number | undefined
}

export type GutendexBook = {
  id: number
  title: string
  authors: GutendexPerson[]
  translators: GutendexPerson[]
  summaries: string[]
  subjects: string[]
  bookshelves: string[]
  languages: string[]
  copyright: boolean | null
  mediaType: string
  formats: Record<string, string>
  downloadCount: number
}

export type GutendexBooksResponse = {
  count: number
  next: string | null
  previous: string | null
  results: GutendexBook[]
}

export type GutendexClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class GutendexClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: GutendexClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? GUTENDEX_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listBooks(query: GutendexBooksQuery = {}): Promise<GutendexBooksResponse> {
    const url = new URL('/books/', this.baseUrl)
    appendOptionalStringParam(url, 'search', query.search)
    appendOptionalStringParam(url, 'topic', query.topic)
    appendOptionalStringParam(url, 'languages', query.languages)
    appendOptionalStringParam(url, 'sort', query.sort)
    appendOptionalStringParam(url, 'ids', query.ids)
    appendOptionalNumberParam(url, 'page', query.page)
    const parsed = await this.fetchJson(url)
    return parseBooksResponse(parsed)
  }

  async getBook(query: GutendexBookQuery): Promise<GutendexBook> {
    const url = new URL(`/books/${query.id}/`, this.baseUrl)
    const parsed = await this.fetchJson(url)
    return parseBook(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Gutendex returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || isApiError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? response.statusText ?? 'Gutendex request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parseBooksResponse(value: unknown): GutendexBooksResponse {
  if (!isRecord(value) || typeof value.count !== 'number' || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Gutendex books response is missing required fields.')
  }
  return {
    count: value.count,
    next: typeof value.next === 'string' ? value.next : null,
    previous: typeof value.previous === 'string' ? value.previous : null,
    results: value.results.map(parseBook),
  }
}

function parseBook(value: unknown): GutendexBook {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.title !== 'string' || !Array.isArray(value.languages) || typeof value.media_type !== 'string' || !isRecord(value.formats) || typeof value.download_count !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Gutendex book response is missing required fields.')
  }
  return {
    id: value.id,
    title: value.title,
    authors: Array.isArray(value.authors) ? value.authors.map(parsePerson) : [],
    translators: Array.isArray(value.translators) ? value.translators.map(parsePerson) : [],
    summaries: filterStringArray(value.summaries),
    subjects: filterStringArray(value.subjects),
    bookshelves: filterStringArray(value.bookshelves),
    languages: value.languages.filter((entry): entry is string => typeof entry === 'string'),
    copyright: typeof value.copyright === 'boolean' || value.copyright === null ? value.copyright : null,
    mediaType: value.media_type,
    formats: Object.fromEntries(Object.entries(value.formats).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
    downloadCount: value.download_count,
  }
}

function parsePerson(value: unknown): GutendexPerson {
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Gutendex person response is missing name.')
  }
  return {
    name: value.name,
    ...(typeof value.birth_year === 'number' ? { birthYear: value.birth_year } : {}),
    ...(typeof value.death_year === 'number' ? { deathYear: value.death_year } : {}),
  }
}

function filterStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
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

function isApiError(value: unknown): boolean {
  return isRecord(value) && typeof value.detail === 'string'
}

function readApiError(value: unknown): string | undefined {
  return isRecord(value) && typeof value.detail === 'string' ? value.detail : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
