import { JikanClient, type JikanAnimeSearchQuery } from '../../infrastructure/openApis/jikanClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const animeTypes = ['tv', 'movie', 'ova', 'special', 'ona', 'music', 'cm', 'pv', 'tv_special'] as const
const animeStatuses = ['airing', 'complete', 'upcoming'] as const
const animeOrderBy = ['mal_id', 'title', 'start_date', 'end_date', 'episodes', 'score', 'scored_by', 'rank', 'popularity', 'members', 'favorites'] as const
const searchSort = ['desc', 'asc'] as const

export type JikanAnimeInput = {
  query?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  sfw?: boolean | undefined
  type?: string | undefined
  status?: string | undefined
  orderBy?: string | undefined
  sort?: string | undefined
}

export type JikanApiMeta = {
  provider: 'jikan'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /anime'
  docsUrl: 'https://docs.api.jikan.moe/'
  openApiUrl: 'https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json'
  usesBrowserClickstream: false
  authentication: 'none'
  rateLimit: '3 requests/second and 60 requests/minute'
  cacheTtl: '24 hours'
}

export type JikanAnimeResult = {
  kind: 'jikan.anime'
  api: JikanApiMeta
  query: {
    limit: number
    page: number
    sfw: boolean
    query?: string | undefined
    type?: string | undefined
    status?: string | undefined
    orderBy?: string | undefined
    sort?: string | undefined
  }
  pagination: {
    currentPage: number
    lastVisiblePage: number
    hasNextPage: boolean
    count: number
    total: number
    perPage: number
  }
  count: number
  anime: Array<{
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
  }>
}

export async function searchJikanAnime(input: JikanAnimeInput = {}): Promise<JikanAnimeResult> {
  const query = normalizeAnimeInput(input)
  const client = new JikanClient()
  const response = await client.searchAnime(toClientQuery(query))
  return {
    kind: 'jikan.anime',
    api: {
      provider: 'jikan',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /anime',
      docsUrl: 'https://docs.api.jikan.moe/',
      openApiUrl: 'https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json',
      usesBrowserClickstream: false,
      authentication: 'none',
      rateLimit: '3 requests/second and 60 requests/minute',
      cacheTtl: '24 hours',
    },
    query,
    pagination: {
      currentPage: response.pagination.currentPage,
      lastVisiblePage: response.pagination.lastVisiblePage,
      hasNextPage: response.pagination.hasNextPage,
      count: response.pagination.items.count,
      total: response.pagination.items.total,
      perPage: response.pagination.items.perPage,
    },
    count: response.data.length,
    anime: response.data,
  }
}

function normalizeAnimeInput(input: JikanAnimeInput): JikanAnimeResult['query'] {
  return {
    limit: normalizeLimit(input.limit),
    page: normalizePage(input.page),
    sfw: input.sfw ?? true,
    ...normalizeQuery(input.query),
    ...normalizeEnum(input.type, animeTypes, 'type'),
    ...normalizeEnum(input.status, animeStatuses, 'status'),
    ...normalizeEnum(input.orderBy, animeOrderBy, 'orderBy'),
    ...normalizeEnum(input.sort, searchSort, 'sort'),
  }
}

function toClientQuery(query: JikanAnimeResult['query']): JikanAnimeSearchQuery {
  return {
    q: query.query,
    limit: query.limit,
    page: query.page,
    sfw: query.sfw,
    type: query.type,
    status: query.status,
    orderBy: query.orderBy,
    sort: query.sort,
  }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 25
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Jikan --limit must be an integer from 1 to 25.', {
      limit: value,
      note: 'The API currently returns 25 rows by default; the OpenAPI schema does not document a higher max.',
    })
  }
  return limit
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Jikan --page must be a positive integer.', { page: value })
  }
  return page
}

function normalizeQuery(value: string | undefined): { query?: string | undefined } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { query: normalized }
}

function normalizeEnum<TName extends 'type' | 'status' | 'orderBy' | 'sort'>(
  value: string | undefined,
  allowed: readonly string[],
  name: TName,
): { [Key in TName]?: string | undefined } {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return {}
  }
  if (!allowed.includes(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Jikan --${toKebabCase(name)} must be one of: ${allowed.join(', ')}.`, {
      [name]: value,
      supported: allowed,
    })
  }
  return { [name]: normalized } as { [Key in TName]?: string | undefined }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, character => `-${character.toLowerCase()}`)
}
