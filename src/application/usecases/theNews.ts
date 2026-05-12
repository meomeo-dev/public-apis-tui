import {
  THENEWS_ENV_API_KEY,
  THENEWS_MAX_LIMIT,
  TheNewsClient,
  normalizeTheNewsAllInput,
  type TheNewsAllInput,
  type TheNewsArticle,
} from '../../infrastructure/openApis/theNewsClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

export type TheNewsAllResult = {
  kind: 'thenews.all'
  api: {
    provider: 'thenews'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'api_token query parameter from THENEWSAPI_API_KEY, local config, or --api-key'
    freePlanNote: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeTheNewsAllInput>
  pagination: {
    found: number
    returned: number
    limit: number
    requestedLimit?: number | undefined
    page: number
    maxResultWindow: number
    cliLimitCap: number
  }
  articles: TheNewsArticle[]
}

export async function searchTheNews(input: TheNewsAllInput = {}): Promise<TheNewsAllResult> {
  const query = normalizeTheNewsAllInput(input)
  const client = new TheNewsClient({ apiKey: await resolveTheNewsApiKey(input.apiKey) })
  const response = await client.all(query)
  return {
    kind: 'thenews.all',
    api: {
      provider: 'thenews',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v1/news/all',
      docsUrl: 'https://www.thenewsapi.com/documentation',
      usesBrowserClickstream: false,
      authentication: 'api_token query parameter from THENEWSAPI_API_KEY, local config, or --api-key',
      freePlanNote: 'TheNewsAPI requires an API token; some endpoints and limits are subscription-plan gated.',
      limitPolicy: `Docs say limit defaults to the maximum for the current plan; CLI only sends --limit when explicitly requested and caps requested values at ${THENEWS_MAX_LIMIT}.`,
    },
    query,
    pagination: {
      found: response.meta.found,
      returned: response.meta.returned,
      limit: response.meta.limit,
      requestedLimit: query.limit,
      page: response.meta.page,
      maxResultWindow: 20000,
      cliLimitCap: THENEWS_MAX_LIMIT,
    },
    articles: response.data,
  }
}

async function resolveTheNewsApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) return explicit
  const envValue = normalizeSecret(process.env[THENEWS_ENV_API_KEY])
  if (envValue !== undefined) return envValue
  const config = await readPublicApiProviderConfig('thenews')
  return normalizeSecret(config.secrets?.[THENEWS_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined
  return value.trim()
}
