import {
  NEWSAPI_ENV_API_KEY,
  NEWSAPI_MAX_PAGE_SIZE,
  NewsApiClient,
  normalizeNewsApiEverythingInput,
  normalizeNewsApiHeadlinesInput,
  type NewsApiArticle,
  type NewsApiEverythingInput,
  type NewsApiHeadlinesInput,
} from '../../infrastructure/openApis/newsApiClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

type NewsApiMeta = {
  provider: 'newsapi'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'apiKey query parameter from NEWSAPI_API_KEY, local config, or --api-key'
  freePlanNote: string
  limitPolicy: string
}

type NewsApiPagination = {
  returned: number
  totalResults: number
  pageSize: number
  page: number
  maxPageSize: number
}

export type NewsApiHeadlinesResult = {
  kind: 'newsapi.headlines'
  api: NewsApiMeta
  query: ReturnType<typeof normalizeNewsApiHeadlinesInput>
  pagination: NewsApiPagination
  articles: NewsApiArticle[]
}

export type NewsApiEverythingResult = {
  kind: 'newsapi.everything'
  api: NewsApiMeta
  query: ReturnType<typeof normalizeNewsApiEverythingInput>
  pagination: NewsApiPagination
  articles: NewsApiArticle[]
}

export async function listNewsApiHeadlines(input: NewsApiHeadlinesInput = {}): Promise<NewsApiHeadlinesResult> {
  const query = normalizeNewsApiHeadlinesInput(input)
  const client = new NewsApiClient({ apiKey: await resolveNewsApiKey(input.apiKey) })
  const response = await client.topHeadlines(query)
  return {
    kind: 'newsapi.headlines',
    api: createApiMeta('GET /v2/top-headlines'),
    query,
    pagination: createPagination(response.totalResults, response.articles.length, query.pageSize, query.page),
    articles: response.articles,
  }
}

export async function listNewsApiEverything(input: NewsApiEverythingInput = {}): Promise<NewsApiEverythingResult> {
  const query = normalizeNewsApiEverythingInput(input)
  const client = new NewsApiClient({ apiKey: await resolveNewsApiKey(input.apiKey) })
  const response = await client.everything(query)
  return {
    kind: 'newsapi.everything',
    api: createApiMeta('GET /v2/everything'),
    query,
    pagination: createPagination(response.totalResults, response.articles.length, query.pageSize, query.page),
    articles: response.articles,
  }
}

function createApiMeta(endpoint: string): NewsApiMeta {
  return {
    provider: 'newsapi',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://newsapi.org/docs',
    usesBrowserClickstream: false,
    authentication: 'apiKey query parameter from NEWSAPI_API_KEY, local config, or --api-key',
    freePlanNote: 'NewsAPI requires API key signup; development keys may have plan and origin restrictions.',
    limitPolicy: `NewsAPI documents pageSize max ${NEWSAPI_MAX_PAGE_SIZE}; CLI defaults to that maximum to conserve requests.`,
  }
}

function createPagination(totalResults: number, returned: number, pageSize: number, page: number): NewsApiPagination {
  return {
    returned,
    totalResults,
    pageSize,
    page,
    maxPageSize: NEWSAPI_MAX_PAGE_SIZE,
  }
}

async function resolveNewsApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) return explicit
  const envValue = normalizeSecret(process.env[NEWSAPI_ENV_API_KEY])
  if (envValue !== undefined) return envValue
  const config = await readPublicApiProviderConfig('newsapi')
  return normalizeSecret(config.secrets?.[NEWSAPI_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined
  return value.trim()
}
