import {
  GdyniaOpenDataClient,
  GDYNIA_OPEN_DATA_SEARCH_MAX_LIMIT,
  normalizeGdyniaOpenDataPackageInput,
  normalizeGdyniaOpenDataSearchInput,
  type GdyniaOpenDataDataset,
  type GdyniaOpenDataPackageInput,
  type GdyniaOpenDataSearchInput,
} from '../../infrastructure/openApis/gdyniaOpenDataClient.js'

type GdyniaOpenDataApiMeta = {
  provider: 'gdyniaopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type GdyniaOpenDataSearchResult = {
  kind: 'gdyniaopendata.search'
  api: GdyniaOpenDataApiMeta
  query: ReturnType<typeof normalizeGdyniaOpenDataSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: GdyniaOpenDataDataset[]
}

export type GdyniaOpenDataDatasetResult = {
  kind: 'gdyniaopendata.dataset'
  api: GdyniaOpenDataApiMeta
  query: ReturnType<typeof normalizeGdyniaOpenDataPackageInput>
  dataset: GdyniaOpenDataDataset
  count: number
}

export async function searchGdyniaOpenDataDatasets(input: GdyniaOpenDataSearchInput = {}): Promise<GdyniaOpenDataSearchResult> {
  const query = normalizeGdyniaOpenDataSearchInput(input)
  const client = new GdyniaOpenDataClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'gdyniaopendata.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows defaults to 100 and is capped at 1000 for bounded CLI output.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: GDYNIA_OPEN_DATA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showGdyniaOpenDataDataset(input: GdyniaOpenDataPackageInput = {}): Promise<GdyniaOpenDataDatasetResult> {
  const query = normalizeGdyniaOpenDataPackageInput(input)
  const client = new GdyniaOpenDataClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'gdyniaopendata.dataset',
    api: createApiMeta('GET /api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): GdyniaOpenDataApiMeta {
  return {
    provider: 'gdyniaopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://otwartedane.gdynia.pl/en/api_doc.html',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each Gdynia Open Data license title and source-specific resource URL.',
    limitPolicy,
  }
}
