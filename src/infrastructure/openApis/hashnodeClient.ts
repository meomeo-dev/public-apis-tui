import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HASHNODE_DEFAULT_ENDPOINT = 'https://gql.hashnode.com'
export const HASHNODE_DEFAULT_HOST = 'blog.developerdao.com'
export const HASHNODE_DEFAULT_FIRST = 20
export const HASHNODE_MAX_FIRST = 20

export type HashnodePostsInput = {
  host?: string | undefined
  first?: number | undefined
  after?: string | undefined
}

export type NormalizedHashnodePostsInput = {
  host: string
  first: number
  after?: string | undefined
}

export type HashnodeAuthor = {
  name?: string | undefined
  username?: string | undefined
}

export type HashnodeTag = {
  name: string
  slug?: string | undefined
}

export type HashnodePost = {
  id: string
  title: string
  brief?: string | undefined
  url: string
  slug?: string | undefined
  publishedAt?: string | undefined
  readTimeInMinutes?: number | undefined
  author?: HashnodeAuthor | undefined
  tags: HashnodeTag[]
}

export type HashnodePostsEnvelope = {
  publication: {
    id: string
    title: string
    url?: string | undefined
  }
  pageInfo: {
    hasNextPage: boolean
    endCursor?: string | undefined
  }
  posts: HashnodePost[]
}

const publicationPostsQuery = `
query PublicationPosts($host: String!, $first: Int!, $after: String) {
  publication(host: $host) {
    id
    title
    url
    posts(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          brief
          url
          slug
          publishedAt
          readTimeInMinutes
          author { name username }
          tags { name slug }
        }
      }
    }
  }
}
`

export class HashnodeClient {
  private readonly endpoint: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { endpoint?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.endpoint = options.endpoint ?? HASHNODE_DEFAULT_ENDPOINT
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async posts(input: NormalizedHashnodePostsInput): Promise<HashnodePostsEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ query: publicationPostsQuery, variables: input }),
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hashnode request failed: ${String(error)}`, { provider: 'hashnode', endpoint: this.endpoint })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hashnode returned a non-JSON response: ${String(error)}`, { provider: 'hashnode', endpoint: this.endpoint, status: response.status })
    }

    if (!response.ok || hasGraphqlErrors(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readGraphqlError(parsed) ?? `Hashnode request failed with HTTP ${response.status}.`, {
        provider: 'hashnode',
        endpoint: this.endpoint,
        status: response.status,
      })
    }

    return parseEnvelope(parsed)
  }
}

export function normalizeHashnodePostsInput(input: HashnodePostsInput = {}): NormalizedHashnodePostsInput {
  return {
    host: normalizeHost(input.host ?? HASHNODE_DEFAULT_HOST),
    first: normalizeInteger(input.first ?? HASHNODE_DEFAULT_FIRST, '--first', 1, HASHNODE_MAX_FIRST),
    ...(input.after !== undefined ? { after: normalizeCursor(input.after) } : {}),
  }
}

function parseEnvelope(value: unknown): HashnodePostsEnvelope {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.data.publication)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hashnode response had an unexpected publication schema.')
  }
  const publication = value.data.publication
  if (typeof publication.id !== 'string' || typeof publication.title !== 'string' || !isRecord(publication.posts) || !Array.isArray(publication.posts.edges) || !isRecord(publication.posts.pageInfo)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hashnode response was missing publication posts.')
  }
  const pageInfo = publication.posts.pageInfo
  return {
    publication: { id: publication.id, title: publication.title, url: optionalString(publication.url) },
    pageInfo: {
      hasNextPage: pageInfo.hasNextPage === true,
      endCursor: optionalString(pageInfo.endCursor),
    },
    posts: publication.posts.edges.filter(isRecord).map(edge => isRecord(edge.node) ? parsePost(edge.node) : undefined).filter((post): post is HashnodePost => post !== undefined),
  }
}

function parsePost(value: Record<string, unknown>): HashnodePost {
  const id = optionalString(value.id)
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (id === undefined || title === undefined || url === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hashnode post was missing id, title, or url.')
  }
  const author = isRecord(value.author) ? value.author : undefined
  return {
    id,
    title,
    url,
    brief: optionalString(value.brief),
    slug: optionalString(value.slug),
    publishedAt: optionalString(value.publishedAt),
    readTimeInMinutes: typeof value.readTimeInMinutes === 'number' ? value.readTimeInMinutes : undefined,
    author: author === undefined ? undefined : { name: optionalString(author.name), username: optionalString(author.username) },
    tags: Array.isArray(value.tags) ? value.tags.filter(isRecord).map(parseTag).filter((tag): tag is HashnodeTag => tag !== undefined) : [],
  }
}

function parseTag(value: Record<string, unknown>): HashnodeTag | undefined {
  const name = optionalString(value.name)
  if (name === undefined) return undefined
  return { name, slug: optionalString(value.slug) }
}

function normalizeHost(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--host must be a publication host such as blog.developerdao.com.')
  }
  return normalized
}

function normalizeCursor(value: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new RuntimeFailure('INVALID_ARGUMENT', '--after cannot be empty.')
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  return value
}

function hasGraphqlErrors(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.errors) && value.errors.length > 0
}

function readGraphqlError(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.errors) || !isRecord(value.errors[0])) return undefined
  return optionalString(value.errors[0].message)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
