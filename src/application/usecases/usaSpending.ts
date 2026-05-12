import {
  normalizeUsaSpendingAgenciesInput,
  normalizeUsaSpendingAwardsInput,
  normalizeUsaSpendingOverTimeInput,
  UsaSpendingClient,
  USA_SPENDING_AGENCIES_MAX_LIMIT,
  USA_SPENDING_AWARDS_MAX_LIMIT,
  type UsaSpendingAgency,
  type UsaSpendingAgenciesInput,
  type UsaSpendingAward,
  type UsaSpendingAwardsInput,
  type UsaSpendingOverTimeInput,
  type UsaSpendingTimeResult,
} from '../../infrastructure/openApis/usaSpendingClient.js'

type UsaSpendingApiMeta = {
  provider: 'usaspending'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST API'
  licenseNote: string
  limitPolicy: string
}

export type UsaSpendingAwardsResult = {
  kind: 'usaspending.awards'
  api: UsaSpendingApiMeta
  query: ReturnType<typeof normalizeUsaSpendingAwardsInput>
  count: number
  spendingLevel: string
  page: {
    returned: number
    page: number
    limit: number
    maxLimit: number
    total?: number | undefined
    hasNextPage?: boolean | undefined
    hasPreviousPage?: boolean | undefined
  }
  messages: string[]
  awards: UsaSpendingAward[]
}

export type UsaSpendingOverTimeResult = {
  kind: 'usaspending.overTime'
  api: UsaSpendingApiMeta
  query: ReturnType<typeof normalizeUsaSpendingOverTimeInput>
  count: number
  group: string
  spendingLevel: string
  messages: string[]
  totals: {
    aggregatedAmount: number
    totalOutlays: number
  }
  periods: UsaSpendingTimeResult[]
}

export type UsaSpendingAgenciesResult = {
  kind: 'usaspending.agencies'
  api: UsaSpendingApiMeta
  query: ReturnType<typeof normalizeUsaSpendingAgenciesInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  agencies: UsaSpendingAgency[]
}

export async function searchUsaSpendingAwards(input: UsaSpendingAwardsInput = {}): Promise<UsaSpendingAwardsResult> {
  const query = normalizeUsaSpendingAwardsInput(input)
  const client = new UsaSpendingClient()
  const response = await client.searchAwards(query)
  return {
    kind: 'usaspending.awards',
    api: createApiMeta('POST /api/v2/search/spending_by_award/', 'spending_by_award documents default 10 and live API caps limit at 100; CLI defaults/caps at 100.'),
    query,
    count: response.results.length,
    spendingLevel: response.spendingLevel,
    page: {
      returned: response.results.length,
      page: response.pageMetadata.page ?? query.page,
      limit: response.pageMetadata.limit ?? query.limit,
      maxLimit: USA_SPENDING_AWARDS_MAX_LIMIT,
      total: response.pageMetadata.total,
      hasNextPage: response.pageMetadata.hasNextPage,
      hasPreviousPage: response.pageMetadata.hasPreviousPage,
    },
    messages: response.messages,
    awards: response.results,
  }
}

export async function readUsaSpendingOverTime(input: UsaSpendingOverTimeInput = {}): Promise<UsaSpendingOverTimeResult> {
  const query = normalizeUsaSpendingOverTimeInput(input)
  const client = new UsaSpendingClient()
  const response = await client.readSpendingOverTime(query)
  return {
    kind: 'usaspending.overTime',
    api: createApiMeta('POST /api/v2/search/spending_over_time/', 'spending_over_time returns one aggregate series for the requested group without page-size controls.'),
    query,
    count: response.results.length,
    group: response.group,
    spendingLevel: response.spendingLevel,
    messages: response.messages,
    totals: {
      aggregatedAmount: response.results.reduce((total, entry) => total + (entry.aggregatedAmount ?? 0), 0),
      totalOutlays: response.results.reduce((total, entry) => total + (entry.totalOutlays ?? 0), 0),
    },
    periods: response.results,
  }
}

export async function listUsaSpendingAgencies(input: UsaSpendingAgenciesInput = {}): Promise<UsaSpendingAgenciesResult> {
  const query = normalizeUsaSpendingAgenciesInput(input)
  const client = new UsaSpendingClient()
  const agencies = await client.listToptierAgencies(query)
  return {
    kind: 'usaspending.agencies',
    api: createApiMeta('GET /api/v2/references/toptier_agencies/', 'toptier_agencies returns one public list; CLI defaults to 100 and caps local display/cache payloads at 200.'),
    query,
    count: agencies.length,
    pagination: {
      returned: agencies.length,
      limit: query.limit,
      maxLimit: USA_SPENDING_AGENCIES_MAX_LIMIT,
    },
    agencies,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): UsaSpendingApiMeta {
  return {
    provider: 'usaspending',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://api.usaspending.gov/docs/endpoints',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST API',
    licenseNote: 'USAspending.gov publishes federal spending data for public analysis.',
    limitPolicy,
  }
}
