import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_LIBRARY_DEFAULT_BASE_URL = 'https://openlibrary.org'
export const OPEN_LIBRARY_SEARCH_DEFAULT_LIMIT = 100
export const OPEN_LIBRARY_SEARCH_MAX_LIMIT = 100

const OPEN_LIBRARY_SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'language',
  'edition_count',
  'cover_i',
  'ebook_access',
  'ia',
  'has_fulltext',
].join(',')

export type OpenLibraryClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type OpenLibrarySearchQuery = {
  query?: string | undefined
  title?: string | undefined
  author?: string | undefined
  subject?: string | undefined
  language?: string | undefined
  hasFulltext?: boolean | undefined
  ebookAccess?: string | undefined
  sort?: string | undefined
  page?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type OpenLibraryWorkQuery = {
  workKey: string
}

export type OpenLibrarySearchDoc = {
  key: string
  title: string
  authors: string[]
  firstPublishYear?: number | undefined
  languages: string[]
  editionCount?: number | undefined
  coverId?: number | undefined
  coverUrl?: string | undefined
  ebookAccess?: string | undefined
  internetArchiveIds: string[]
  hasFulltext?: boolean | undefined
  url: string
}

export type OpenLibrarySearchResponse = {
  numFound: number
  start: number
  numFoundExact?: boolean | undefined
  docs: OpenLibrarySearchDoc[]
}

export type OpenLibraryWorkAuthorRef = {
  key: string
}

export type OpenLibraryWork = {
  key: string
  title: string
  description?: string | undefined
  subjects: string[]
  firstPublishDate?: string | undefined
  authors: OpenLibraryWorkAuthorRef[]
  latestRevision?: number | undefined
  revision?: number | undefined
  url: string
}

export class OpenLibraryClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: OpenLibraryClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? OPEN_LIBRARY_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async search(query: OpenLibrarySearchQuery = {}): Promise<OpenLibrarySearchResponse> {
    const url = new URL('/search.json', this.baseUrl)
    appendOptionalStringParam(url, 'q', query.query)
    appendOptionalStringParam(url, 'title', query.title)
    appendOptionalStringParam(url, 'author', query.author)
    appendOptionalStringParam(url, 'subject', query.subject)
    appendOptionalStringParam(url, 'language', query.language)
    appendOptionalBooleanParam(url, 'has_fulltext', query.hasFulltext)
    appendOptionalStringParam(url, 'ebook_access', query.ebookAccess)
    appendOptionalStringParam(url, 'sort', query.sort)
    appendOptionalNumberParam(url, 'page', query.page)
    appendOptionalNumberParam(url, 'limit', clampLimit(query.limit ?? OPEN_LIBRARY_SEARCH_DEFAULT_LIMIT))
    appendOptionalNumberParam(url, 'offset', query.offset)
    url.searchParams.set('fields', OPEN_LIBRARY_SEARCH_FIELDS)
    const parsed = await this.fetchJson(url)
    return parseSearchResponse(parsed)
  }

  async getWork(query: OpenLibraryWorkQuery): Promise<OpenLibraryWork> {
    const url = new URL(`${normalizeWorkKey(query.workKey)}.json`, this.baseUrl)
    const parsed = await this.fetchJson(url)
    return parseWork(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const response = await this.fetchWithRetry(url)

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Open Library returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || isOpenLibraryError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readOpenLibraryError(parsed) ?? response.statusText ?? 'Open Library request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }

  private async fetchWithRetry(url: URL): Promise<Response> {
    const maxAttempts = 5
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'user-agent': 'public-apis-tui no-auth CLI (https://github.com/public-apis/public-apis)',
          },
        })
        if (!shouldRetryResponse(response) || attempt === maxAttempts) {
          return response
        }
      } catch (error) {
        lastError = error
        if (attempt === maxAttempts) {
          throw new RuntimeFailure('OPEN_API_FAILED', 'Open Library request failed after retrying transient network errors.', {
            cause: error instanceof Error ? error.message : String(error),
          })
        }
      }
      await delay(500 * attempt)
    }
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Library request failed after retrying transient network errors.', {
      cause: lastError instanceof Error ? lastError.message : String(lastError),
    })
  }
}

export function normalizeOpenLibraryWorkKey(value: string | undefined): string {
  return normalizeWorkKey(value ?? 'OL66554W')
}

export function clampOpenLibrarySearchLimit(value: number | undefined): number {
  return clampLimit(value ?? OPEN_LIBRARY_SEARCH_DEFAULT_LIMIT)
}

function parseSearchResponse(value: unknown): OpenLibrarySearchResponse {
  if (!isRecord(value) || typeof value.numFound !== 'number' || typeof value.start !== 'number' || !Array.isArray(value.docs)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Library search response is missing required fields.')
  }

  return {
    numFound: value.numFound,
    start: value.start,
    ...(typeof value.numFoundExact === 'boolean' ? { numFoundExact: value.numFoundExact } : {}),
    docs: value.docs.map(parseSearchDoc),
  }
}

function parseSearchDoc(value: unknown): OpenLibrarySearchDoc {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Library search document is missing key or title.')
  }

  const coverId = typeof value.cover_i === 'number' ? value.cover_i : undefined
  return {
    key: value.key,
    title: value.title,
    authors: filterStringArray(value.author_name),
    ...(typeof value.first_publish_year === 'number' ? { firstPublishYear: value.first_publish_year } : {}),
    languages: filterStringArray(value.language),
    ...(typeof value.edition_count === 'number' ? { editionCount: value.edition_count } : {}),
    ...(coverId !== undefined ? { coverId, coverUrl: createCoverUrl(coverId) } : {}),
    ...(typeof value.ebook_access === 'string' ? { ebookAccess: value.ebook_access } : {}),
    internetArchiveIds: filterStringArray(value.ia),
    ...(typeof value.has_fulltext === 'boolean' ? { hasFulltext: value.has_fulltext } : {}),
    url: createOpenLibraryUrl(value.key),
  }
}

function parseWork(value: unknown): OpenLibraryWork {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Library work response is missing key or title.')
  }

  return {
    key: value.key,
    title: value.title,
    ...(readDescription(value.description) !== undefined ? { description: readDescription(value.description) } : {}),
    subjects: filterStringArray(value.subjects),
    ...(typeof value.first_publish_date === 'string' ? { firstPublishDate: value.first_publish_date } : {}),
    authors: Array.isArray(value.authors) ? value.authors.map(parseWorkAuthorRef).filter((entry): entry is OpenLibraryWorkAuthorRef => entry !== undefined) : [],
    ...(typeof value.latest_revision === 'number' ? { latestRevision: value.latest_revision } : {}),
    ...(typeof value.revision === 'number' ? { revision: value.revision } : {}),
    url: createOpenLibraryUrl(value.key),
  }
}

function parseWorkAuthorRef(value: unknown): OpenLibraryWorkAuthorRef | undefined {
  if (!isRecord(value) || !isRecord(value.author) || typeof value.author.key !== 'string') {
    return undefined
  }
  return { key: value.author.key }
}

function readDescription(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (isRecord(value) && typeof value.value === 'string') {
    return value.value
  }
  return undefined
}

function filterStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function appendOptionalStringParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalBooleanParam(url: URL, key: string, value: boolean | undefined): void {
  if (typeof value === 'boolean') {
    url.searchParams.set(key, String(value))
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return OPEN_LIBRARY_SEARCH_DEFAULT_LIMIT
  }
  return Math.min(Math.trunc(value), OPEN_LIBRARY_SEARCH_MAX_LIMIT)
}

function normalizeWorkKey(value: string): string {
  const trimmed = value.trim().replace(/^https?:\/\/openlibrary\.org/u, '').replace(/\.json$/u, '')
  if (trimmed.startsWith('/works/')) {
    return trimmed
  }
  if (/^OL\d+W$/u.test(trimmed)) {
    return `/works/${trimmed}`
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Open Library work key must look like OL66554W or /works/OL66554W.', {
    workKey: value,
  })
}

function createCoverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
}

function createOpenLibraryUrl(key: string): string {
  return `https://openlibrary.org${key}`
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isOpenLibraryError(value: unknown): boolean {
  return isRecord(value) && (typeof value.error === 'string' || typeof value.message === 'string')
}

function shouldRetryResponse(response: Response): boolean {
  return response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds))
}

function readOpenLibraryError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.error === 'string') {
    return value.error
  }
  return typeof value.message === 'string' ? value.message : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
