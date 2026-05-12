import {
  TorontoOpenDataClient,
  TORONTO_OPEN_DATA_SEARCH_MAX_LIMIT,
  normalizeTorontoOpenDataPackageInput,
  normalizeTorontoOpenDataSearchInput,
  type TorontoOpenDataDataset,
  type TorontoOpenDataPackageInput,
  type TorontoOpenDataSearchInput,
} from '../../infrastructure/openApis/torontoOpenDataClient.js'

type TorontoOpenDataApiMeta = {
  provider: 'torontoopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type TorontoOpenDataSearchResult = {
  kind: 'torontoopendata.search'
  api: TorontoOpenDataApiMeta
  query: ReturnType<typeof normalizeTorontoOpenDataSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: TorontoOpenDataDataset[]
}

export type TorontoOpenDataDatasetResult = {
  kind: 'torontoopendata.dataset'
  api: TorontoOpenDataApiMeta
  query: ReturnType<typeof normalizeTorontoOpenDataPackageInput>
  dataset: TorontoOpenDataDataset
  count: number
}

export async function searchTorontoOpenDataDatasets(input: TorontoOpenDataSearchInput = {}): Promise<TorontoOpenDataSearchResult> {
  const query = normalizeTorontoOpenDataSearchInput(input)
  const client = new TorontoOpenDataClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'torontoopendata.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows defaults to 100 and is capped at 1000 for bounded CLI output.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: TORONTO_OPEN_DATA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showTorontoOpenDataDataset(input: TorontoOpenDataPackageInput = {}): Promise<TorontoOpenDataDatasetResult> {
  const query = normalizeTorontoOpenDataPackageInput(input)
  const client = new TorontoOpenDataClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'torontoopendata.dataset',
    api: createApiMeta('GET /api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): TorontoOpenDataApiMeta {
  return {
    provider: 'torontoopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://open.toronto.ca/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces Toronto Open Data license title, civic issues, topics, and source-specific resource URLs.',
    limitPolicy,
  }
}
