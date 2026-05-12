import {
  OpenGovernmentCanadaClient,
  OPEN_GOVERNMENT_CANADA_SEARCH_MAX_LIMIT,
  normalizeOpenGovernmentCanadaPackageInput,
  normalizeOpenGovernmentCanadaSearchInput,
  type OpenGovernmentCanadaDataset,
  type OpenGovernmentCanadaPackageInput,
  type OpenGovernmentCanadaSearchInput,
} from '../../infrastructure/openApis/openGovernmentCanadaClient.js'

type OpenGovernmentCanadaApiMeta = {
  provider: 'opengovernmentcanada'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type OpenGovernmentCanadaSearchResult = {
  kind: 'opengovernmentcanada.search'
  api: OpenGovernmentCanadaApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentCanadaSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: OpenGovernmentCanadaDataset[]
}

export type OpenGovernmentCanadaDatasetResult = {
  kind: 'opengovernmentcanada.dataset'
  api: OpenGovernmentCanadaApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentCanadaPackageInput>
  dataset: OpenGovernmentCanadaDataset
  count: number
}

export async function searchOpenGovernmentCanadaDatasets(input: OpenGovernmentCanadaSearchInput = {}): Promise<OpenGovernmentCanadaSearchResult> {
  const query = normalizeOpenGovernmentCanadaSearchInput(input)
  const client = new OpenGovernmentCanadaClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'opengovernmentcanada.search',
    api: createApiMeta('GET /data/en/api/3/action/package_search', 'package_search rows is effectively capped at 1000 by the portal; CLI defaults/caps at 1000.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_CANADA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showOpenGovernmentCanadaDataset(input: OpenGovernmentCanadaPackageInput = {}): Promise<OpenGovernmentCanadaDatasetResult> {
  const query = normalizeOpenGovernmentCanadaPackageInput(input)
  const client = new OpenGovernmentCanadaClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'opengovernmentcanada.dataset',
    api: createApiMeta('GET /data/en/api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): OpenGovernmentCanadaApiMeta {
  return {
    provider: 'opengovernmentcanada',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://open.canada.ca/data/dataset/2d90548d-50ef-4802-91f8-c59c5cf68251/resource/36830ed0-cd83-4fea-b2ae-15890116c68e/download/openapi-en.json',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each Open Government Licence or source-specific license URL.',
    limitPolicy,
  }
}
