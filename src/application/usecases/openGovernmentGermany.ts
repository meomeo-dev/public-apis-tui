import {
  OpenGovernmentGermanyClient,
  OPEN_GOVERNMENT_GERMANY_SEARCH_MAX_LIMIT,
  normalizeOpenGovernmentGermanyPackageInput,
  normalizeOpenGovernmentGermanySearchInput,
  type OpenGovernmentGermanyDataset,
  type OpenGovernmentGermanyPackageInput,
  type OpenGovernmentGermanySearchInput,
} from '../../infrastructure/openApis/openGovernmentGermanyClient.js'

type OpenGovernmentGermanyApiMeta = {
  provider: 'opengovernmentde'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type OpenGovernmentGermanySearchResult = {
  kind: 'opengovernmentde.search'
  api: OpenGovernmentGermanyApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentGermanySearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: OpenGovernmentGermanyDataset[]
}

export type OpenGovernmentGermanyDatasetResult = {
  kind: 'opengovernmentde.dataset'
  api: OpenGovernmentGermanyApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentGermanyPackageInput>
  dataset: OpenGovernmentGermanyDataset
  count: number
}

export async function searchOpenGovernmentGermanyDatasets(input: OpenGovernmentGermanySearchInput = {}): Promise<OpenGovernmentGermanySearchResult> {
  const query = normalizeOpenGovernmentGermanySearchInput(input)
  const client = new OpenGovernmentGermanyClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'opengovernmentde.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows is effectively capped at 1000 by GovData CKAN; CLI defaults/caps at 1000.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_GERMANY_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showOpenGovernmentGermanyDataset(input: OpenGovernmentGermanyPackageInput = {}): Promise<OpenGovernmentGermanyDatasetResult> {
  const query = normalizeOpenGovernmentGermanyPackageInput(input)
  const client = new OpenGovernmentGermanyClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'opengovernmentde.dataset',
    api: createApiMeta('GET /api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): OpenGovernmentGermanyApiMeta {
  return {
    provider: 'opengovernmentde',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://www.govdata.de/ckan/api/3/action/help_show?name=package_search',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each GovData license title and source-specific resource URL.',
    limitPolicy,
  }
}
