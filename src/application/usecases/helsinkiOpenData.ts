import {
  HelsinkiOpenDataClient,
  HELSINKI_OPEN_DATA_SEARCH_MAX_LIMIT,
  normalizeHelsinkiOpenDataPackageInput,
  normalizeHelsinkiOpenDataSearchInput,
  type HelsinkiOpenDataDataset,
  type HelsinkiOpenDataPackageInput,
  type HelsinkiOpenDataSearchInput,
} from '../../infrastructure/openApis/helsinkiOpenDataClient.js'

type HelsinkiOpenDataApiMeta = {
  provider: 'helsinkiopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type HelsinkiOpenDataSearchResult = {
  kind: 'helsinkiopendata.search'
  api: HelsinkiOpenDataApiMeta
  query: ReturnType<typeof normalizeHelsinkiOpenDataSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: HelsinkiOpenDataDataset[]
}

export type HelsinkiOpenDataDatasetResult = {
  kind: 'helsinkiopendata.dataset'
  api: HelsinkiOpenDataApiMeta
  query: ReturnType<typeof normalizeHelsinkiOpenDataPackageInput>
  dataset: HelsinkiOpenDataDataset
  count: number
}

export async function searchHelsinkiOpenDataDatasets(input: HelsinkiOpenDataSearchInput = {}): Promise<HelsinkiOpenDataSearchResult> {
  const query = normalizeHelsinkiOpenDataSearchInput(input)
  const client = new HelsinkiOpenDataClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'helsinkiopendata.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows defaults to 100 and is capped at 1000 for bounded CLI output.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: HELSINKI_OPEN_DATA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showHelsinkiOpenDataDataset(input: HelsinkiOpenDataPackageInput = {}): Promise<HelsinkiOpenDataDatasetResult> {
  const query = normalizeHelsinkiOpenDataPackageInput(input)
  const client = new HelsinkiOpenDataClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'helsinkiopendata.dataset',
    api: createApiMeta('GET /api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): HelsinkiOpenDataApiMeta {
  return {
    provider: 'helsinkiopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://hri.fi/en_gb/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each Helsinki Region Infoshare license title and source-specific resource URL.',
    limitPolicy,
  }
}
