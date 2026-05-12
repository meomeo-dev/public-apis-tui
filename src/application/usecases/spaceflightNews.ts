import {
  SpaceflightNewsClient,
  SPACEFLIGHT_NEWS_MAX_LIMIT,
  normalizeSpaceflightNewsArticlesInput,
  type SpaceflightNewsArticle,
  type SpaceflightNewsArticlesInput,
} from '../../infrastructure/openApis/spaceflightNewsClient.js'

export type SpaceflightNewsArticlesResult = {
  kind: 'spaceflightnews.articles'
  api: {
    provider: 'spaceflightnews'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    schemaUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    limitPolicy: string
    rateLimitPolicy: string
  }
  query: ReturnType<typeof normalizeSpaceflightNewsArticlesInput>
  pagination: {
    returned: number
    total: number
    limit: number
    offset: number
    maxLimit: number
    next?: string | undefined
    previous?: string | undefined
  }
  articles: SpaceflightNewsArticle[]
}

export async function listSpaceflightNewsArticles(input: SpaceflightNewsArticlesInput = {}): Promise<SpaceflightNewsArticlesResult> {
  const query = normalizeSpaceflightNewsArticlesInput(input)
  const client = new SpaceflightNewsClient()
  const response = await client.listArticles(query)
  return {
    kind: 'spaceflightnews.articles',
    api: {
      provider: 'spaceflightnews',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v4/articles/',
      docsUrl: 'https://api.spaceflightnewsapi.net/v4/docs',
      schemaUrl: 'https://api.spaceflightnewsapi.net/v4/schema/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      limitPolicy: `Schema documents limit/offset pagination; live probes show upstream caps limit at ${SPACEFLIGHT_NEWS_MAX_LIMIT}.`,
      rateLimitPolicy: 'Spaceflight News may return HTTP 429 when called too frequently; live e2e uses one online request then offline replay.',
    },
    query,
    pagination: {
      returned: response.articles.length,
      total: response.count,
      limit: query.limit,
      offset: query.offset,
      maxLimit: SPACEFLIGHT_NEWS_MAX_LIMIT,
      next: response.next,
      previous: response.previous,
    },
    articles: response.articles,
  }
}
