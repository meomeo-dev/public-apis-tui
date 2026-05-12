import {
  ChroniclingAmericaClient,
  CHRONICLING_AMERICA_MAX_COUNT,
  CHRONICLING_AMERICA_MAX_PAGE,
  normalizeChroniclingAmericaSearchInput,
  type ChroniclingAmericaItem,
  type ChroniclingAmericaPagination,
  type ChroniclingAmericaSearchInput,
} from '../../infrastructure/openApis/chroniclingAmericaClient.js'

export type ChroniclingAmericaSearchResult = {
  kind: 'chroniclingamerica.search'
  api: {
    provider: 'chroniclingamerica'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    legacyDocsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    migrationNote: string
    limitPolicy: string
    rateLimitPolicy: string
  }
  query: ReturnType<typeof normalizeChroniclingAmericaSearchInput>
  pagination: ChroniclingAmericaPagination & {
    returned: number
    maxCount: number
    maxPage: number
  }
  items: ChroniclingAmericaItem[]
}

export async function searchChroniclingAmerica(input: ChroniclingAmericaSearchInput = {}): Promise<ChroniclingAmericaSearchResult> {
  const query = normalizeChroniclingAmericaSearchInput(input)
  const client = new ChroniclingAmericaClient()
  const response = await client.search(query)
  return {
    kind: 'chroniclingamerica.search',
    api: {
      provider: 'chroniclingamerica',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /collections/chronicling-america/',
      docsUrl: 'https://www.loc.gov/apis/json-and-yaml/',
      legacyDocsUrl: 'https://chroniclingamerica.loc.gov/about/api/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      migrationNote: 'Legacy chroniclingamerica.loc.gov API paths returned 404 in live probes; loc.gov JSON API is the current repeatable API surface.',
      limitPolicy: `Default/count cap ${CHRONICLING_AMERICA_MAX_COUNT}; LOC API docs support up to 1,000 returned results and deep paging up to 100,000 results.`,
      rateLimitPolicy: 'LOC asks API clients to avoid exceeding 20 requests/minute and 2,000 requests/hour.',
    },
    query,
    pagination: {
      ...response.pagination,
      returned: response.items.length,
      maxCount: CHRONICLING_AMERICA_MAX_COUNT,
      maxPage: CHRONICLING_AMERICA_MAX_PAGE,
    },
    items: response.items,
  }
}
