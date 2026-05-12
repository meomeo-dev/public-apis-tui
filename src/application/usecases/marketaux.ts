import {
  MARKETAUX_ENV_API_KEY,
  MARKETAUX_MAX_LIMIT,
  MARKETAUX_MAX_RESULT_WINDOW,
  MarketAuxClient,
  normalizeMarketAuxNewsInput,
  type MarketAuxArticle,
  type MarketAuxNewsInput,
} from '../../infrastructure/openApis/marketauxClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

export type MarketAuxNewsResult = {
  kind: 'marketaux.news'
  api: {
    provider: 'marketaux'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'api_token query parameter from MARKETAUX_API_KEY, local config, or --api-key'
    freePlanNote: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeMarketAuxNewsInput>
  pagination: {
    found: number
    returned: number
    limit: number
    requestedLimit: number
    page: number
    maxLimit: number
    maxResultWindow: number
  }
  articles: MarketAuxArticle[]
}

export async function listMarketAuxNews(input: MarketAuxNewsInput = {}): Promise<MarketAuxNewsResult> {
  const query = normalizeMarketAuxNewsInput(input)
  const client = new MarketAuxClient({ apiKey: await resolveMarketAuxApiKey(input.apiKey) })
  const response = await client.listNews(query)
  return {
    kind: 'marketaux.news',
    api: {
      provider: 'marketaux',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v1/news/all',
      docsUrl: 'https://www.marketaux.com/documentation',
      usesBrowserClickstream: false,
      authentication: 'api_token query parameter from MARKETAUX_API_KEY, local config, or --api-key',
      freePlanNote: 'MarketAux requires API token signup; free-plan live responses may lower meta.limit below requested --limit.',
      limitPolicy: `Docs state limit defaults to the plan maximum and result windows cannot exceed ${MARKETAUX_MAX_RESULT_WINDOW}; CLI caps requested limit at ${MARKETAUX_MAX_LIMIT}.`,
    },
    query,
    pagination: {
      found: response.meta.found,
      returned: response.meta.returned,
      limit: response.meta.limit,
      requestedLimit: query.limit,
      page: response.meta.page,
      maxLimit: MARKETAUX_MAX_LIMIT,
      maxResultWindow: MARKETAUX_MAX_RESULT_WINDOW,
    },
    articles: response.articles,
  }
}

async function resolveMarketAuxApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) {
    return explicit
  }
  const envValue = normalizeSecret(process.env[MARKETAUX_ENV_API_KEY])
  if (envValue !== undefined) {
    return envValue
  }
  const config = await readPublicApiProviderConfig('marketaux')
  return normalizeSecret(config.secrets?.[MARKETAUX_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  return value.trim()
}
