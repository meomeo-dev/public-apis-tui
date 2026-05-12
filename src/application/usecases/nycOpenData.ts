import {
  NYC_OPEN_DATA_MAX_311_LIMIT,
  NYC_OPEN_DATA_MAX_DATASET_LIMIT,
  NycOpenDataClient,
  normalizeNycOpenData311RequestsInput,
  normalizeNycOpenDataDatasetsInput,
  type NycOpenData311Request,
  type NycOpenData311RequestsInput,
  type NycOpenDataDataset,
  type NycOpenDataDatasetsInput,
} from '../../infrastructure/openApis/nycOpenDataClient.js'

type NycOpenDataApiMeta = {
  provider: 'nycopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  socrata: true
  limitPolicy: string
}

export type NycOpenDataDatasetsResult = {
  kind: 'nycopendata.datasets'
  api: NycOpenDataApiMeta
  query: ReturnType<typeof normalizeNycOpenDataDatasetsInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    maxLimit: number
  }
  datasets: NycOpenDataDataset[]
}

export type NycOpenData311RequestsResult = {
  kind: 'nycopendata.311Requests'
  api: NycOpenDataApiMeta
  query: ReturnType<typeof normalizeNycOpenData311RequestsInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  requests: NycOpenData311Request[]
}

const commonApiMeta = {
  provider: 'nycopendata',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://opendata.cityofnewyork.us/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  socrata: true,
  limitPolicy: 'Unauthenticated Socrata reads are supported; CLI caps 311 rows at 1000 to match the common documented per-request page limit without an app token.',
} satisfies Omit<NycOpenDataApiMeta, 'endpoint'>

export async function listNycOpenDataDatasets(input: NycOpenDataDatasetsInput = {}): Promise<NycOpenDataDatasetsResult> {
  const query = normalizeNycOpenDataDatasetsInput(input)
  const client = new NycOpenDataClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'nycopendata.datasets',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/catalog/v1',
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      totalMatched: response.total,
      limit: query.limit,
      maxLimit: NYC_OPEN_DATA_MAX_DATASET_LIMIT,
    },
    datasets: response.datasets,
  }
}

export async function listNycOpenData311Requests(input: NycOpenData311RequestsInput = {}): Promise<NycOpenData311RequestsResult> {
  const query = normalizeNycOpenData311RequestsInput(input)
  const client = new NycOpenDataClient()
  const requests = await client.list311Requests(query)
  return {
    kind: 'nycopendata.311Requests',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /resource/erm2-nwe9.json',
    },
    query,
    count: requests.length,
    pagination: {
      returned: requests.length,
      limit: query.limit,
      maxLimit: NYC_OPEN_DATA_MAX_311_LIMIT,
    },
    requests,
  }
}
