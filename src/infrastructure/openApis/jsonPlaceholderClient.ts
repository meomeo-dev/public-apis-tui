import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const JSON_PLACEHOLDER_DEFAULT_BASE_URL = 'https://jsonplaceholder.typicode.com'
export const JSON_PLACEHOLDER_DEFAULT_LIMIT = 100
export const JSON_PLACEHOLDER_MAX_LIMIT = 100
export const JSON_PLACEHOLDER_DEFAULT_POST_ID = 1

export type JsonPlaceholderPostsInput = {
  userId?: number | undefined
  limit?: number | undefined
}

export type NormalizedJsonPlaceholderPostsInput = {
  limit: number
  userId?: number | undefined
}

export type JsonPlaceholderPostInput = {
  id?: number | undefined
}

export type NormalizedJsonPlaceholderPostInput = {
  id: number
}

export type JsonPlaceholderRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
  totalCount?: string | undefined
}

export type JsonPlaceholderPost = {
  userId: number
  id: number
  title: string
  body: string
}

export class JsonPlaceholderClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async listPosts(input: NormalizedJsonPlaceholderPostsInput): Promise<{ posts: JsonPlaceholderPost[]; rateLimit: JsonPlaceholderRateLimit }> {
    const url = new URL('/posts', normalizeBaseUrl(this.options.baseUrl ?? JSON_PLACEHOLDER_DEFAULT_BASE_URL))
    url.searchParams.set('_limit', String(input.limit))
    if (input.userId !== undefined) {
      url.searchParams.set('userId', String(input.userId))
    }
    const { parsed, rateLimit } = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'JSONPlaceholder posts response must be an array.')
    }
    return { posts: parsed.map(parsePost), rateLimit }
  }

  async getPost(input: NormalizedJsonPlaceholderPostInput): Promise<{ post: JsonPlaceholderPost | undefined; rateLimit: JsonPlaceholderRateLimit }> {
    const url = new URL(`/posts/${input.id}`, normalizeBaseUrl(this.options.baseUrl ?? JSON_PLACEHOLDER_DEFAULT_BASE_URL))
    const { parsed, rateLimit, status } = await this.fetchJson(url, { allowNotFound: true })
    if (status === 404) {
      if (isRecord(parsed) && Object.keys(parsed).length === 0) {
        return { post: undefined, rateLimit }
      }
      throw new RuntimeFailure('OPEN_API_FAILED', 'JSONPlaceholder post 404 response had an unexpected schema.')
    }
    return { post: parsePost(parsed), rateLimit }
  }

  private async fetchJson(url: URL, options: { allowNotFound?: boolean } = {}): Promise<{ parsed: unknown; rateLimit: JsonPlaceholderRateLimit; status: number }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `JSONPlaceholder request failed: ${String(error)}`, {
        provider: 'jsonplaceholder',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `JSONPlaceholder returned a non-JSON response: ${String(error)}`, {
        provider: 'jsonplaceholder',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      if (options.allowNotFound === true && response.status === 404) {
        return { parsed, rateLimit: readRateLimit(response.headers), status: response.status }
      }
      throw new RuntimeFailure('OPEN_API_FAILED', `JSONPlaceholder request failed with HTTP ${response.status}.`, {
        provider: 'jsonplaceholder',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers), status: response.status }
  }
}

export function normalizeJsonPlaceholderPostsInput(input: JsonPlaceholderPostsInput = {}): NormalizedJsonPlaceholderPostsInput {
  return {
    limit: normalizeLimit(input.limit),
    ...(input.userId !== undefined ? { userId: normalizePositiveInteger(input.userId, '--user-id') } : {}),
  }
}

export function normalizeJsonPlaceholderPostInput(input: JsonPlaceholderPostInput = {}): NormalizedJsonPlaceholderPostInput {
  return { id: normalizePositiveInteger(input.id ?? JSON_PLACEHOLDER_DEFAULT_POST_ID, '--id') }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? JSON_PLACEHOLDER_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > JSON_PLACEHOLDER_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${JSON_PLACEHOLDER_MAX_LIMIT}.`)
  }
  return limit
}

function normalizePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a positive integer.`)
  }
  return value
}

function parsePost(value: unknown): JsonPlaceholderPost {
  if (!isRecord(value) || typeof value.userId !== 'number' || typeof value.id !== 'number' || typeof value.title !== 'string' || typeof value.body !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'JSONPlaceholder post response had an unexpected schema.')
  }
  return {
    userId: value.userId,
    id: value.id,
    title: value.title,
    body: value.body,
  }
}

function readRateLimit(headers: Headers): JsonPlaceholderRateLimit {
  return {
    ...(headers.get('x-ratelimit-limit') !== null ? { limit: String(headers.get('x-ratelimit-limit')) } : {}),
    ...(headers.get('x-ratelimit-remaining') !== null ? { remaining: String(headers.get('x-ratelimit-remaining')) } : {}),
    ...(headers.get('x-ratelimit-reset') !== null ? { reset: String(headers.get('x-ratelimit-reset')) } : {}),
    ...(headers.get('x-total-count') !== null ? { totalCount: String(headers.get('x-total-count')) } : {}),
  }
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
