import {
  NEWSDATA_ENV_API_KEY,
  NEWSDATA_FREE_MAX_SIZE,
  NEWSDATA_PAID_MAX_SIZE,
  NewsDataClient,
  normalizeNewsDataLatestInput,
  type NewsDataArticle,
  type NewsDataLatestInput,
} from '../../infrastructure/openApis/newsDataClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

export type NewsDataLatestResult = {
  kind: 'newsdata.latest'
  api: {
    provider: 'newsdata'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'apikey query parameter from NEWSDATAIO_API_KEY, local config, or --api-key'
    freePlanNote: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeNewsDataLatestInput>
  pagination: {
    returned: number
    totalResults: number
    size: number
    maxFreeSize: number
    maxPaidSize: number
    nextPage?: string | undefined
  }
  rateLimit: {
    freeCreditsPer15Minutes: number
    freeCreditsPerDay: number
    paidCreditsPer15Minutes: number
  }
  articles: NewsDataArticle[]
}

export async function listNewsDataLatest(input: NewsDataLatestInput = {}): Promise<NewsDataLatestResult> {
  const query = normalizeNewsDataLatestInput(input)
  const client = new NewsDataClient({ apiKey: await resolveNewsDataApiKey(input.apiKey) })
  const response = await client.latest(query)
  return {
    kind: 'newsdata.latest',
    api: {
      provider: 'newsdata',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /api/1/latest',
      docsUrl: 'https://newsdata.io/documentation#latest-news',
      usesBrowserClickstream: false,
      authentication: 'apikey query parameter from NEWSDATAIO_API_KEY, local config, or --api-key',
      freePlanNote: 'NewsData.io requires an API key; free-plan latest articles may be delayed and rate/credit limited.',
      limitPolicy: `Docs list size 1-${NEWSDATA_PAID_MAX_SIZE}; free users are capped at ${NEWSDATA_FREE_MAX_SIZE}, so CLI defaults to the free maximum.`,
    },
    query,
    pagination: {
      returned: response.results.length,
      totalResults: response.totalResults,
      size: query.size,
      maxFreeSize: NEWSDATA_FREE_MAX_SIZE,
      maxPaidSize: NEWSDATA_PAID_MAX_SIZE,
      ...(response.nextPage !== undefined ? { nextPage: response.nextPage } : {}),
    },
    rateLimit: {
      freeCreditsPer15Minutes: 30,
      freeCreditsPerDay: 200,
      paidCreditsPer15Minutes: 1800,
    },
    articles: response.results,
  }
}

async function resolveNewsDataApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) {
    return explicit
  }
  const envValue = normalizeSecret(process.env[NEWSDATA_ENV_API_KEY])
  if (envValue !== undefined) {
    return envValue
  }
  const config = await readPublicApiProviderConfig('newsdata')
  return normalizeSecret(config.secrets?.[NEWSDATA_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  return value.trim()
}
