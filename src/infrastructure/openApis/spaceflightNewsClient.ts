import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SPACEFLIGHT_NEWS_DEFAULT_BASE_URL = 'https://api.spaceflightnewsapi.net/v4'
export const SPACEFLIGHT_NEWS_DEFAULT_LIMIT = 500
export const SPACEFLIGHT_NEWS_MAX_LIMIT = 500
export const SPACEFLIGHT_NEWS_DEFAULT_OFFSET = 0
export const SPACEFLIGHT_NEWS_MAX_OFFSET = 100000
export const SPACEFLIGHT_NEWS_DEFAULT_ORDERING = '-published_at'

export type SpaceflightNewsArticlesInput = {
  limit?: number | undefined
  offset?: number | undefined
  search?: string | undefined
  newsSite?: string | undefined
  ordering?: string | undefined
}

export type NormalizedSpaceflightNewsArticlesInput = {
  limit: number
  offset: number
  ordering: string
  search?: string | undefined
  newsSite?: string | undefined
}

export type SpaceflightNewsAuthor = {
  name: string
}

export type SpaceflightNewsReference = {
  id?: number | string | undefined
  provider?: string | undefined
}

export type SpaceflightNewsArticle = {
  id: number
  title: string
  url: string
  imageUrl?: string | undefined
  newsSite?: string | undefined
  summary?: string | undefined
  publishedAt?: string | undefined
  updatedAt?: string | undefined
  featured?: boolean | undefined
  authors: SpaceflightNewsAuthor[]
  launches: SpaceflightNewsReference[]
  events: SpaceflightNewsReference[]
}

export type SpaceflightNewsEnvelope = {
  count: number
  next?: string | undefined
  previous?: string | undefined
  articles: SpaceflightNewsArticle[]
}

export class SpaceflightNewsClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listArticles(input: NormalizedSpaceflightNewsArticlesInput): Promise<SpaceflightNewsEnvelope> {
    const url = this.createUrl('/articles/')
    url.searchParams.set('limit', String(input.limit))
    url.searchParams.set('offset', String(input.offset))
    url.searchParams.set('ordering', input.ordering)
    if (input.search !== undefined) {
      url.searchParams.set('search', input.search)
    }
    if (input.newsSite !== undefined) {
      url.searchParams.set('news_site', input.newsSite)
    }
    const parsed = await this.fetchJson(url)
    return parseEnvelope(parsed)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname.replace(/^\/+/u, ''), normalizeBaseUrl(this.options.baseUrl ?? SPACEFLIGHT_NEWS_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui/0.5.0' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Spaceflight News request failed: ${String(error)}`, {
        provider: 'spaceflightnews',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Spaceflight News returned a non-JSON response: ${String(error)}`, {
        provider: 'spaceflightnews',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Spaceflight News request failed with HTTP ${response.status}.`, {
        provider: 'spaceflightnews',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeSpaceflightNewsArticlesInput(input: SpaceflightNewsArticlesInput = {}): NormalizedSpaceflightNewsArticlesInput {
  return {
    limit: normalizeInteger(input.limit ?? SPACEFLIGHT_NEWS_DEFAULT_LIMIT, '--limit', 1, SPACEFLIGHT_NEWS_MAX_LIMIT),
    offset: normalizeInteger(input.offset ?? SPACEFLIGHT_NEWS_DEFAULT_OFFSET, '--offset', 0, SPACEFLIGHT_NEWS_MAX_OFFSET),
    ordering: normalizeOrdering(input.ordering),
    ...(input.search !== undefined ? { search: normalizeText(input.search, '--search') } : {}),
    ...(input.newsSite !== undefined ? { newsSite: normalizeText(input.newsSite, '--news-site') } : {}),
  }
}

function parseEnvelope(value: unknown): SpaceflightNewsEnvelope {
  if (!isRecord(value) || typeof value.count !== 'number' || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Spaceflight News articles response had an unexpected schema.')
  }
  return {
    count: value.count,
    next: optionalString(value.next),
    previous: optionalString(value.previous),
    articles: value.results.filter(isRecord).map(parseArticle),
  }
}

function parseArticle(value: Record<string, unknown>): SpaceflightNewsArticle {
  const id = readNumber(value.id)
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (id === undefined || title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Spaceflight News article was missing id, title, or url.')
  }
  return {
    id,
    title,
    url,
    imageUrl: optionalString(value.image_url),
    newsSite: optionalString(value.news_site),
    summary: optionalString(value.summary),
    publishedAt: optionalString(value.published_at),
    updatedAt: optionalString(value.updated_at),
    featured: typeof value.featured === 'boolean' ? value.featured : undefined,
    authors: readAuthors(value.authors),
    launches: readReferences(value.launches),
    events: readReferences(value.events),
  }
}

function readAuthors(value: unknown): SpaceflightNewsAuthor[] {
  return Array.isArray(value) ? value.filter(isRecord).map(author => ({ name: optionalString(author.name) ?? 'unknown' })) : []
}

function readReferences(value: unknown): SpaceflightNewsReference[] {
  return Array.isArray(value) ? value.filter(isRecord).map(reference => ({ id: readNumber(reference.id) ?? optionalString(reference.id), provider: optionalString(reference.provider) })) : []
}

function normalizeOrdering(value: string | undefined): string {
  const ordering = value ?? SPACEFLIGHT_NEWS_DEFAULT_ORDERING
  if (!['-published_at', 'published_at', '-updated_at', 'updated_at'].includes(ordering)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ordering must be one of -published_at, published_at, -updated_at, updated_at.')
  }
  return ordering
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

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.detail) ?? optionalString(value.message) ?? optionalString(value.error)
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
