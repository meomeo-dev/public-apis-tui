import {
  BerlinOpenDataClient,
  BERLIN_OPEN_DATA_SEARCH_MAX_LIMIT,
  normalizeBerlinOpenDataPackageInput,
  normalizeBerlinOpenDataSearchInput,
  type BerlinOpenDataDataset,
  type BerlinOpenDataPackageInput,
  type BerlinOpenDataSearchInput,
} from '../../infrastructure/openApis/berlinOpenDataClient.js'

type BerlinOpenDataApiMeta = {
  provider: 'berlinopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type BerlinOpenDataSearchResult = {
  kind: 'berlinopendata.search'
  api: BerlinOpenDataApiMeta
  query: ReturnType<typeof normalizeBerlinOpenDataSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: BerlinOpenDataDataset[]
}

export type BerlinOpenDataDatasetResult = {
  kind: 'berlinopendata.dataset'
  api: BerlinOpenDataApiMeta
  query: ReturnType<typeof normalizeBerlinOpenDataPackageInput>
  dataset: BerlinOpenDataDataset
  count: number
}

export async function searchBerlinOpenDataDatasets(input: BerlinOpenDataSearchInput = {}): Promise<BerlinOpenDataSearchResult> {
  const query = normalizeBerlinOpenDataSearchInput(input)
  const client = new BerlinOpenDataClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'berlinopendata.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows defaults to 100 and is capped at 1000 for bounded CLI output.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: BERLIN_OPEN_DATA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showBerlinOpenDataDataset(input: BerlinOpenDataPackageInput = {}): Promise<BerlinOpenDataDatasetResult> {
  const query = normalizeBerlinOpenDataPackageInput(input)
  const client = new BerlinOpenDataClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'berlinopendata.dataset',
    api: createApiMeta('GET /api/3/action/package_show', 'package_show returns one complete dataset metadata document per request.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): BerlinOpenDataApiMeta {
  return {
    provider: 'berlinopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://daten.berlin.de/datensaetze/daten-berlin-de-metadaten',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each Berlin Open Data license title and source-specific resource URL.',
    limitPolicy,
  }
}
