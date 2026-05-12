import {
  MEDIASTACK_ENV_API_KEY,
  MediastackClient,
  type MediastackArticle,
  type MediastackNewsQuery,
  type MediastackPagination,
  type MediastackSort,
} from '../../infrastructure/openApis/mediastackClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type MediastackNewsInput = {
  apiKey?: string | undefined
  keywords?: string | undefined
  sources?: string | undefined
  categories?: string | undefined
  countries?: string | undefined
  languages?: string | undefined
  date?: string | undefined
  sort?: MediastackSort | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type MediastackNewsArticle = {
  title: string
  source: string
  category: string
  country: string
  language: string
  publishedAt: string
  url: string
  author?: string | undefined
  description?: string | undefined
  image?: string | undefined
}

export type MediastackNewsResult = {
  kind: 'mediastack.news'
  api: {
    provider: 'mediastack'
    publicApisProject: 'https://github.com/public-apis/public-apis'
    endpoint: 'GET /v1/news'
    usesBrowserClickstream: false
    authentication: 'access_key query parameter from MEDIASTACK_API_KEY or --api-key'
    freePlanNote: 'Live news is delayed on the free plan.'
  }
  query: MediastackNewsQuery
  pagination: MediastackPagination
  articles: MediastackNewsArticle[]
}

export async function listMediastackNews(input: MediastackNewsInput = {}): Promise<MediastackNewsResult> {
  const query = normalizeQuery(input)
  const client = new MediastackClient({ apiKey: await resolveMediastackApiKey(input.apiKey) })
  const response = await client.listNews(query)
  return {
    kind: 'mediastack.news',
    api: {
      provider: 'mediastack',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v1/news',
      usesBrowserClickstream: false,
      authentication: 'access_key query parameter from MEDIASTACK_API_KEY or --api-key',
      freePlanNote: 'Live news is delayed on the free plan.',
    },
    query,
    pagination: response.pagination,
    articles: response.data.map(toNewsArticle),
  }
}

async function resolveMediastackApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeText(apiKey)
  if (explicit !== undefined) {
    return explicit
  }

  const envValue = normalizeText(process.env[MEDIASTACK_ENV_API_KEY])
  if (envValue !== undefined) {
    return envValue
  }

  const config = await readPublicApiProviderConfig('mediastack')
  return normalizeText(config.secrets?.[MEDIASTACK_ENV_API_KEY])
}

function normalizeQuery(input: MediastackNewsInput): MediastackNewsQuery {
  return {
    keywords: normalizeText(input.keywords),
    sources: normalizeText(input.sources),
    categories: normalizeText(input.categories),
    countries: normalizeText(input.countries),
    languages: normalizeText(input.languages),
    date: normalizeText(input.date),
    sort: input.sort ?? 'published_desc',
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

function normalizeText(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  return value.trim()
}

function normalizeLimit(value: number | undefined): number | undefined {
  if (value === undefined) {
    return 100
  }

  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Mediastack --limit must be an integer from 1 to 100.', {
      limit: value,
    })
  }

  return value
}

function normalizeOffset(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Mediastack --offset must be a non-negative integer.', {
      offset: value,
    })
  }

  return value
}

function toNewsArticle(article: MediastackArticle): MediastackNewsArticle {
  return {
    title: article.title,
    source: article.source,
    category: article.category,
    country: article.country,
    language: article.language,
    publishedAt: article.published_at,
    url: article.url,
    ...(article.author !== null && article.author.trim() !== '' ? { author: article.author } : {}),
    ...(article.description !== null && article.description.trim() !== '' ? { description: article.description } : {}),
    ...(article.image !== null && article.image.trim() !== '' ? { image: article.image } : {}),
  }
}
