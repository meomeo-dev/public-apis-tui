import {
  CURRENTS_ENV_API_KEY,
  CURRENTS_MAX_PAGE_SIZE,
  CurrentsClient,
  normalizeCurrentsNewsInput,
  type CurrentsArticle,
  type CurrentsNewsInput,
  type CurrentsRateLimit,
} from '../../infrastructure/openApis/currentsClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

export type CurrentsNewsResult = {
  kind: 'currents.news'
  api: {
    provider: 'currents'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'apiKey query parameter from CURRENTS_API_KEY, local config, or --api-key'
    freePlanNote: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeCurrentsNewsInput>
  pagination: {
    page: number
    pageSize: number
    returned: number
    maxPageSize: number
  }
  rateLimit: CurrentsRateLimit
  articles: CurrentsArticle[]
}

export async function listCurrentsNews(input: CurrentsNewsInput = {}): Promise<CurrentsNewsResult> {
  const query = normalizeCurrentsNewsInput(input)
  const client = new CurrentsClient({ apiKey: await resolveCurrentsApiKey(input.apiKey) })
  const response = await client.latestNews(query)
  return {
    kind: 'currents.news',
    api: {
      provider: 'currents',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v1/latest-news',
      docsUrl: 'https://currentsapi.services/en/docs/',
      usesBrowserClickstream: false,
      authentication: 'apiKey query parameter from CURRENTS_API_KEY, local config, or --api-key',
      freePlanNote: 'Live response exposes x-ratelimit headers; local config secrets are preferred over CLI --api-key.',
      limitPolicy: `Docs list page_size with maximum ${CURRENTS_MAX_PAGE_SIZE}; default uses the maximum to conserve requests.`,
    },
    query,
    pagination: {
      page: response.page,
      pageSize: query.pageSize,
      returned: response.articles.length,
      maxPageSize: CURRENTS_MAX_PAGE_SIZE,
    },
    rateLimit: response.rateLimit,
    articles: response.articles,
  }
}

async function resolveCurrentsApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) {
    return explicit
  }
  const envValue = normalizeSecret(process.env[CURRENTS_ENV_API_KEY])
  if (envValue !== undefined) {
    return envValue
  }
  const config = await readPublicApiProviderConfig('currents')
  return normalizeSecret(config.secrets?.[CURRENTS_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  return value.trim()
}
