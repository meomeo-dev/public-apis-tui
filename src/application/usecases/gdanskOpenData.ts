import {
  GdanskOpenDataClient,
  GDANSK_OPEN_DATA_SEARCH_MAX_LIMIT,
  normalizeGdanskOpenDataPackageInput,
  normalizeGdanskOpenDataSearchInput,
  type GdanskOpenDataDataset,
  type GdanskOpenDataPackageInput,
  type GdanskOpenDataSearchInput,
} from '../../infrastructure/openApis/gdanskOpenDataClient.js'

type GdanskOpenDataApiMeta = {
  provider: 'gdanskopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type GdanskOpenDataSearchResult = {
  kind: 'gdanskopendata.search'
  api: GdanskOpenDataApiMeta
  query: ReturnType<typeof normalizeGdanskOpenDataSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: GdanskOpenDataDataset[]
}

export type GdanskOpenDataDatasetResult = {
  kind: 'gdanskopendata.dataset'
  api: GdanskOpenDataApiMeta
  query: ReturnType<typeof normalizeGdanskOpenDataPackageInput>
  dataset: GdanskOpenDataDataset
  count: number
}

export async function searchGdanskOpenDataDatasets(input: GdanskOpenDataSearchInput = {}): Promise<GdanskOpenDataSearchResult> {
  const query = normalizeGdanskOpenDataSearchInput(input)
  const client = new GdanskOpenDataClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'gdanskopendata.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows defaults to 100 and is capped at 1000 for bounded CLI output.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: GDANSK_OPEN_DATA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showGdanskOpenDataDataset(input: GdanskOpenDataPackageInput = {}): Promise<GdanskOpenDataDatasetResult> {
  const query = normalizeGdanskOpenDataPackageInput(input)
  const client = new GdanskOpenDataClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'gdanskopendata.dataset',
    api: createApiMeta('GET /api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): GdanskOpenDataApiMeta {
  return {
    provider: 'gdanskopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://ckan.multimediagdansk.pl/en',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each Gdańsk Open Data license title and source-specific resource URL.',
    limitPolicy,
  }
}
