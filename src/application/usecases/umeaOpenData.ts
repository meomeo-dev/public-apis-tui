import {
  UmeaOpenDataClient,
  UMEA_OPEN_DATA_MAX_LIMIT,
  UMEA_OPEN_DATA_MAX_OFFSET,
  normalizeUmeaOpenDataDatasetsInput,
  type UmeaOpenDataDataset,
  type UmeaOpenDataDatasetsInput,
  type UmeaOpenDataRateLimit,
} from '../../infrastructure/openApis/umeaOpenDataClient.js'

type UmeaOpenDataApiMeta = {
  provider: 'umeaopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON Opendatasoft Explore API'
  platform: 'Opendatasoft Explore v2.1'
  limitPolicy: string
}

export type UmeaOpenDataDatasetsResult = {
  kind: 'umeaopendata.datasets'
  api: UmeaOpenDataApiMeta
  query: ReturnType<typeof normalizeUmeaOpenDataDatasetsInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    offset: number
    maxLimit: number
    maxOffset: number
  }
  rateLimit: UmeaOpenDataRateLimit
  datasets: UmeaOpenDataDataset[]
}

export async function listUmeaOpenDataDatasets(input: UmeaOpenDataDatasetsInput = {}): Promise<UmeaOpenDataDatasetsResult> {
  const query = normalizeUmeaOpenDataDatasetsInput(input)
  const client = new UmeaOpenDataClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'umeaopendata.datasets',
    api: {
      provider: 'umeaopendata',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /api/explore/v2.1/catalog/datasets',
      docsUrl: 'https://opendata.umea.se/api-console/explore/v2.1/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON Opendatasoft Explore API',
      platform: 'Opendatasoft Explore v2.1',
      limitPolicy: 'Opendatasoft catalog search caps non-grouped API pages at 100 rows; CLI caps limit at 100 and offset at 9900.',
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      totalMatched: response.total,
      limit: query.limit,
      offset: query.offset,
      maxLimit: UMEA_OPEN_DATA_MAX_LIMIT,
      maxOffset: UMEA_OPEN_DATA_MAX_OFFSET,
    },
    rateLimit: response.rateLimit,
    datasets: response.datasets,
  }
}
