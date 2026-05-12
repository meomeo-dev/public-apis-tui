import {
  MinneapolisOpenDataClient,
  MINNEAPOLIS_OPEN_DATA_MAX_LIMIT,
  normalizeMinneapolisOpenDataDatasetsInput,
  type MinneapolisOpenDataDataset,
  type MinneapolisOpenDataDatasetsInput,
  type MinneapolisOpenDataRateLimit,
} from '../../infrastructure/openApis/minneapolisOpenDataClient.js'

type MinneapolisOpenDataApiMeta = {
  provider: 'minneapolisopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS GeoJSON ArcGIS Hub Search API'
  platform: 'ArcGIS Hub'
  limitPolicy: string
}

export type MinneapolisOpenDataDatasetsResult = {
  kind: 'minneapolisopendata.datasets'
  api: MinneapolisOpenDataApiMeta
  query: ReturnType<typeof normalizeMinneapolisOpenDataDatasetsInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    maxLimit: number
  }
  rateLimit: MinneapolisOpenDataRateLimit
  datasets: MinneapolisOpenDataDataset[]
}

export async function listMinneapolisOpenDataDatasets(input: MinneapolisOpenDataDatasetsInput = {}): Promise<MinneapolisOpenDataDatasetsResult> {
  const query = normalizeMinneapolisOpenDataDatasetsInput(input)
  const client = new MinneapolisOpenDataClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'minneapolisopendata.datasets',
    api: {
      provider: 'minneapolisopendata',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /api/search/v1/collections/dataset/items',
      docsUrl: 'https://opendata.minneapolismn.gov/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS GeoJSON ArcGIS Hub Search API',
      platform: 'ArcGIS Hub',
      limitPolicy: 'ArcGIS Hub search is rate-limited; CLI caps dataset search at 100 rows for bounded terminal and offline cache output.',
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      totalMatched: response.total,
      limit: query.limit,
      maxLimit: MINNEAPOLIS_OPEN_DATA_MAX_LIMIT,
    },
    rateLimit: response.rateLimit,
    datasets: response.datasets,
  }
}
