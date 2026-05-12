import {
  OpenGovernmentUsClient,
  OPEN_GOVERNMENT_US_KEYWORDS_MAX_LIMIT,
  OPEN_GOVERNMENT_US_ORGANIZATIONS_MAX_LIMIT,
  OPEN_GOVERNMENT_US_SEARCH_MAX_LIMIT,
  normalizeOpenGovernmentUsKeywordsInput,
  normalizeOpenGovernmentUsOrganizationsInput,
  normalizeOpenGovernmentUsSearchInput,
  type OpenGovernmentUsDataset,
  type OpenGovernmentUsKeywordsInput,
  type OpenGovernmentUsOrganizationsInput,
  type OpenGovernmentUsSearchInput,
} from '../../infrastructure/openApis/openGovernmentUsClient.js'

type OpenGovernmentUsApiMeta = {
  provider: 'opengovernmentusa'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON catalog API'
  licenseNote: string
  limitPolicy: string
}

export type OpenGovernmentUsSearchResult = {
  kind: 'opengovernmentusa.search'
  api: OpenGovernmentUsApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentUsSearchInput>
  count: number
  total?: number | undefined
  after?: string | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: OpenGovernmentUsDataset[]
}

export type OpenGovernmentUsOrganizationsResult = {
  kind: 'opengovernmentusa.organizations'
  api: OpenGovernmentUsApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentUsOrganizationsInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  organizations: Array<{ id: string; name?: string | undefined; slug?: string | undefined; organizationType?: string | undefined; datasetCount?: number | undefined; sourceCount?: number | undefined }>
}

export type OpenGovernmentUsKeywordsResult = {
  kind: 'opengovernmentusa.keywords'
  api: OpenGovernmentUsApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentUsKeywordsInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  keywords: Array<{ keyword: string; count: number }>
}

export async function searchOpenGovernmentUsDatasets(input: OpenGovernmentUsSearchInput = {}): Promise<OpenGovernmentUsSearchResult> {
  const query = normalizeOpenGovernmentUsSearchInput(input)
  const client = new OpenGovernmentUsClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'opengovernmentusa.search',
    api: createApiMeta('GET /search', 'search per_page defaults/caps at 1000; cursor pagination uses after for stable pages.'),
    query,
    count: response.results.length,
    total: response.count,
    after: response.after,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_US_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function listOpenGovernmentUsOrganizations(input: OpenGovernmentUsOrganizationsInput = {}): Promise<OpenGovernmentUsOrganizationsResult> {
  const query = normalizeOpenGovernmentUsOrganizationsInput(input)
  const client = new OpenGovernmentUsClient()
  const organizations = await client.listOrganizations(query)
  return {
    kind: 'opengovernmentusa.organizations',
    api: createApiMeta('GET /api/organizations', 'organizations returns all organizations in one no-auth response; CLI caps at 120.'),
    query,
    count: organizations.length,
    pagination: {
      returned: organizations.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_US_ORGANIZATIONS_MAX_LIMIT,
    },
    organizations,
  }
}

export async function listOpenGovernmentUsKeywords(input: OpenGovernmentUsKeywordsInput = {}): Promise<OpenGovernmentUsKeywordsResult> {
  const query = normalizeOpenGovernmentUsKeywordsInput(input)
  const client = new OpenGovernmentUsClient()
  const response = await client.listKeywords(query)
  return {
    kind: 'opengovernmentusa.keywords',
    api: createApiMeta('GET /api/keywords', 'keywords size defaults/caps at 1000; min_count defaults to 1.'),
    query,
    count: response.keywords.length,
    total: response.total,
    pagination: {
      returned: response.keywords.length,
      limit: query.size,
      maxLimit: OPEN_GOVERNMENT_US_KEYWORDS_MAX_LIMIT,
    },
    keywords: response.keywords,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): OpenGovernmentUsApiMeta {
  return {
    provider: 'opengovernmentusa',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://resources.data.gov/catalog-api/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON catalog API',
    licenseNote: 'Catalog metadata surfaces dataset and organization titles from data.gov.',
    limitPolicy,
  }
}
