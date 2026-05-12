import {
  OpenGovernmentUkClient,
  OPEN_GOVERNMENT_UK_SEARCH_MAX_LIMIT,
  normalizeOpenGovernmentUkPackageInput,
  normalizeOpenGovernmentUkSearchInput,
  type OpenGovernmentUkDataset,
  type OpenGovernmentUkPackageInput,
  type OpenGovernmentUkSearchInput,
} from '../../infrastructure/openApis/openGovernmentUkClient.js'

type OpenGovernmentUkApiMeta = {
  provider: 'opengovernmentuk'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type OpenGovernmentUkSearchResult = {
  kind: 'opengovernmentuk.search'
  api: OpenGovernmentUkApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentUkSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: OpenGovernmentUkDataset[]
}

export type OpenGovernmentUkDatasetResult = {
  kind: 'opengovernmentuk.dataset'
  api: OpenGovernmentUkApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentUkPackageInput>
  dataset: OpenGovernmentUkDataset
  count: number
}

export async function searchOpenGovernmentUkDatasets(input: OpenGovernmentUkSearchInput = {}): Promise<OpenGovernmentUkSearchResult> {
  const query = normalizeOpenGovernmentUkSearchInput(input)
  const client = new OpenGovernmentUkClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'opengovernmentuk.search',
    api: createApiMeta('GET /api/action/package_search', 'package_search rows is effectively capped at 1000 by the data.gov.uk CKAN API; CLI defaults/caps at 1000.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_UK_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showOpenGovernmentUkDataset(input: OpenGovernmentUkPackageInput = {}): Promise<OpenGovernmentUkDatasetResult> {
  const query = normalizeOpenGovernmentUkPackageInput(input)
  const client = new OpenGovernmentUkClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'opengovernmentuk.dataset',
    api: createApiMeta('GET /api/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): OpenGovernmentUkApiMeta {
  return {
    provider: 'opengovernmentuk',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://guidance.data.gov.uk/publish_and_manage_data/harvest_or_add_data/using_the_api/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces UK data.gov.uk licence titles and source-specific resource URLs.',
    limitPolicy,
  }
}
