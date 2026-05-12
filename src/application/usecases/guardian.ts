import {
  GUARDIAN_ENV_API_KEY,
  GUARDIAN_MAX_PAGE_SIZE,
  GuardianClient,
  normalizeGuardianSearchInput,
  type GuardianArticle,
  type GuardianSearchInput,
} from '../../infrastructure/openApis/guardianClient.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

export type GuardianSearchResult = {
  kind: 'guardian.search'
  api: {
    provider: 'guardian'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'api-key query parameter from GUARDIAN_API_KEY, local config, or --api-key'
    freePlanNote: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeGuardianSearchInput>
  pagination: {
    returned: number
    total: number
    pageSize: number
    currentPage: number
    pages: number
    startIndex?: number | undefined
    maxPageSize: number
  }
  userTier?: string | undefined
  orderBy?: string | undefined
  articles: GuardianArticle[]
}

export async function searchGuardianContent(input: GuardianSearchInput = {}): Promise<GuardianSearchResult> {
  const query = normalizeGuardianSearchInput(input)
  const client = new GuardianClient({ apiKey: await resolveGuardianApiKey(input.apiKey) })
  const response = await client.search(query)
  return {
    kind: 'guardian.search',
    api: {
      provider: 'guardian',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /search',
      docsUrl: 'https://open-platform.theguardian.com/documentation/search',
      usesBrowserClickstream: false,
      authentication: 'api-key query parameter from GUARDIAN_API_KEY, local config, or --api-key',
      freePlanNote: 'Guardian Open Platform requires an API key; local provider config secrets are preferred over CLI --api-key.',
      limitPolicy: `Docs list page-size 1-${GUARDIAN_MAX_PAGE_SIZE}; CLI defaults to the maximum to conserve requests.`,
    },
    query,
    pagination: {
      returned: response.results.length,
      total: response.total,
      pageSize: response.pageSize,
      currentPage: response.currentPage,
      pages: response.pages,
      startIndex: response.startIndex,
      maxPageSize: GUARDIAN_MAX_PAGE_SIZE,
    },
    userTier: response.userTier,
    orderBy: response.orderBy,
    articles: response.results,
  }
}

async function resolveGuardianApiKey(apiKey: string | undefined): Promise<string | undefined> {
  const explicit = normalizeSecret(apiKey)
  if (explicit !== undefined) return explicit
  const envValue = normalizeSecret(process.env[GUARDIAN_ENV_API_KEY])
  if (envValue !== undefined) return envValue
  const config = await readPublicApiProviderConfig('guardian')
  return normalizeSecret(config.secrets?.[GUARDIAN_ENV_API_KEY])
}

function normalizeSecret(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined
  return value.trim()
}
