import {
  GNEWS_ENV_API_KEY,
  GNEWS_MAX_ARTICLE_WINDOW,
  GNEWS_MAX_RESULTS,
  GNewsClient,
  normalizeGNewsHeadlinesInput,
  normalizeGNewsSearchInput,
  type GNewsArticle,
  type GNewsHeadlinesInput,
  type GNewsSearchInput,
} from '../../infrastructure/openApis/gnewsClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

type GNewsApiMeta = {
  provider: 'gnews'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'apikey query parameter from GNEWS_API_KEY, local config, or --api-key'
  freePlanNote: string
  limitPolicy: string
}

type GNewsPagination = {
  returned: number
  totalArticles: number
  max: number
  page: number
  maxResults: number
  maxArticleWindow: number
}

export type GNewsSearchResult = {
  kind: 'gnews.search'
  api: GNewsApiMeta
  query: ReturnType<typeof normalizeGNewsSearchInput>
  pagination: GNewsPagination
  information?: string | undefined
  articles: GNewsArticle[]
}

export type GNewsHeadlinesResult = {
  kind: 'gnews.headlines'
  api: GNewsApiMeta
  query: ReturnType<typeof normalizeGNewsHeadlinesInput>
  pagination: GNewsPagination
  information?: string | undefined
  articles: GNewsArticle[]
}

export async function searchGNews(input: GNewsSearchInput = {}): Promise<GNewsSearchResult> {
  const query = normalizeGNewsSearchInput(input)
  const client = new GNewsClient({ apiKey: await resolveGNewsApiKey(input.apiKey) })
  const response = await client.search(query)
  return {
    kind: 'gnews.search',
    api: createApiMeta('GET /api/v4/search'),
    query,
    pagination: createPagination(response.totalArticles, response.articles.length, query.max, query.page),
    information: response.information,
    articles: response.articles,
  }
}

export async function listGNewsHeadlines(input: GNewsHeadlinesInput = {}): Promise<GNewsHeadlinesResult> {
  const query = normalizeGNewsHeadlinesInput(input)
  const client = new GNewsClient({ apiKey: await resolveGNewsApiKey(input.apiKey) })
  const response = await client.topHeadlines(query)
  return {
    kind: 'gnews.headlines',
    api: createApiMeta('GET /api/v4/top-headlines'),
    query,
    pagination: createPagination(response.totalArticles, response.articles.length, query.max, query.page),
    information: response.information,
    articles: response.articles,
  }
}

function createApiMeta(endpoint: string): GNewsApiMeta {
  return {
    provider: 'gnews',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://docs.gnews.io/',
    usesBrowserClickstream: false,
    authentication: 'apikey query parameter from GNEWS_API_KEY, local config, or --api-key',
    freePlanNote: 'GNews requires API key signup; store secrets in environment or local provider config, not in cache keys.',
    limitPolicy: `GNews documents max=100 and a 1000-article window; CLI defaults to max=${GNEWS_MAX_RESULTS} to conserve requests.`,
  }
}

function createPagination(totalArticles: number, returned: number, max: number, page: number): GNewsPagination {
  return {
    returned,
    totalArticles,
    max,
    page,
    maxResults: GNEWS_MAX_RESULTS,
    maxArticleWindow: GNEWS_MAX_ARTICLE_WINDOW,
  }
}

async function resolveGNewsApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) {
    return explicit
  }
  const envValue = normalizeSecret(process.env[GNEWS_ENV_API_KEY])
  if (envValue !== undefined) {
    return envValue
  }
  const config = await readPublicApiProviderConfig('gnews')
  return normalizeSecret(config.secrets?.[GNEWS_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  return value.trim()
}
