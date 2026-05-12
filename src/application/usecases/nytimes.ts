import {
  NYTIMES_ARTICLE_SEARCH_PAGE_SIZE,
  NYTIMES_ENV_API_KEY,
  NYTIMES_MAX_TOP_LIMIT,
  NyTimesClient,
  normalizeNyTimesSearchInput,
  normalizeNyTimesTopStoriesInput,
  type NyTimesArticle,
  type NyTimesSearchInput,
  type NyTimesTopStoriesInput,
} from '../../infrastructure/openApis/nytimesClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

type NyTimesApiMeta = {
  provider: 'nytimes'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'api-key query parameter from NYTIMES_API_KEY, local config, or --api-key'
  freePlanNote: string
  limitPolicy: string
}

export type NyTimesSearchResult = {
  kind: 'nytimes.search'
  api: NyTimesApiMeta
  query: ReturnType<typeof normalizeNyTimesSearchInput>
  pagination: {
    returned: number
    hits: number
    offset: number
    page: number
    pageSize: number
  }
  articles: NyTimesArticle[]
}

export type NyTimesTopStoriesResult = {
  kind: 'nytimes.topStories'
  api: NyTimesApiMeta
  query: ReturnType<typeof normalizeNyTimesTopStoriesInput>
  pagination: {
    returned: number
    total: number
    limit: number
    maxLimit: number
  }
  articles: NyTimesArticle[]
}

export async function searchNyTimes(input: NyTimesSearchInput = {}): Promise<NyTimesSearchResult> {
  const query = normalizeNyTimesSearchInput(input)
  const client = new NyTimesClient({ apiKey: await resolveNyTimesApiKey(input.apiKey) })
  const response = await client.search(query)
  return {
    kind: 'nytimes.search',
    api: createApiMeta('GET /svc/search/v2/articlesearch.json'),
    query,
    pagination: {
      returned: response.articles.length,
      hits: response.hits,
      offset: response.offset,
      page: query.page,
      pageSize: NYTIMES_ARTICLE_SEARCH_PAGE_SIZE,
    },
    articles: response.articles,
  }
}

export async function listNyTimesTopStories(input: NyTimesTopStoriesInput = {}): Promise<NyTimesTopStoriesResult> {
  const query = normalizeNyTimesTopStoriesInput(input)
  const client = new NyTimesClient({ apiKey: await resolveNyTimesApiKey(input.apiKey) })
  const response = await client.topStories(query)
  return {
    kind: 'nytimes.topStories',
    api: createApiMeta('GET /svc/topstories/v2/{section}.json'),
    query,
    pagination: {
      returned: response.articles.length,
      total: response.numResults,
      limit: query.limit,
      maxLimit: NYTIMES_MAX_TOP_LIMIT,
    },
    articles: response.articles,
  }
}

function createApiMeta(endpoint: string): NyTimesApiMeta {
  return {
    provider: 'nytimes',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://developer.nytimes.com/docs',
    usesBrowserClickstream: false,
    authentication: 'api-key query parameter from NYTIMES_API_KEY, local config, or --api-key',
    freePlanNote: 'NYTimes Developer APIs require an API key; store secrets in environment or local provider config.',
    limitPolicy: 'Article Search returns 10 documents/page; Top Stories limit is a local projection capped at 100.',
  }
}

async function resolveNyTimesApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) {
    return explicit
  }
  const envValue = normalizeSecret(process.env[NYTIMES_ENV_API_KEY])
  if (envValue !== undefined) {
    return envValue
  }
  const config = await readPublicApiProviderConfig('nytimes')
  return normalizeSecret(config.secrets?.[NYTIMES_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  return value.trim()
}
