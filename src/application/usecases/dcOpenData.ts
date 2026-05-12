import {
  DC_OPEN_DATA_MAX_DATASET_LIMIT,
  DC_OPEN_DATA_MAX_LICENSE_LIMIT,
  DcOpenDataClient,
  normalizeDcOpenDataBusinessLicensesInput,
  normalizeDcOpenDataDatasetsInput,
  type DcOpenDataBusinessLicense,
  type DcOpenDataBusinessLicensesInput,
  type DcOpenDataDataset,
  type DcOpenDataDatasetsInput,
  type DcOpenDataRateLimit,
} from '../../infrastructure/openApis/dcOpenDataClient.js'

type DcOpenDataApiMeta = {
  provider: 'dcopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  platform: 'ArcGIS Hub'
  limitPolicy: string
}

export type DcOpenDataDatasetsResult = {
  kind: 'dcopendata.datasets'
  api: DcOpenDataApiMeta
  query: ReturnType<typeof normalizeDcOpenDataDatasetsInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    maxLimit: number
  }
  rateLimit: DcOpenDataRateLimit
  datasets: DcOpenDataDataset[]
}

export type DcOpenDataBusinessLicensesResult = {
  kind: 'dcopendata.businessLicenses'
  api: DcOpenDataApiMeta
  query: ReturnType<typeof normalizeDcOpenDataBusinessLicensesInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  licenses: DcOpenDataBusinessLicense[]
}

const commonApiMeta = {
  provider: 'dcopendata',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://opendata.dc.gov/pages/using-apis',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  platform: 'ArcGIS Hub',
  limitPolicy: 'Open Data DC Hub search is rate-limited; ArcGIS FeatureServer queries are bounded at 1000 rows per request for terminal and offline cache safety.',
} satisfies Omit<DcOpenDataApiMeta, 'endpoint'>

export async function listDcOpenDataDatasets(input: DcOpenDataDatasetsInput = {}): Promise<DcOpenDataDatasetsResult> {
  const query = normalizeDcOpenDataDatasetsInput(input)
  const client = new DcOpenDataClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'dcopendata.datasets',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/search/v1/collections/dataset/items',
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      totalMatched: response.total,
      limit: query.limit,
      maxLimit: DC_OPEN_DATA_MAX_DATASET_LIMIT,
    },
    rateLimit: response.rateLimit,
    datasets: response.datasets,
  }
}

export async function listDcOpenDataBusinessLicenses(input: DcOpenDataBusinessLicensesInput = {}): Promise<DcOpenDataBusinessLicensesResult> {
  const query = normalizeDcOpenDataBusinessLicensesInput(input)
  const client = new DcOpenDataClient()
  const licenses = await client.listBusinessLicenses(query)
  return {
    kind: 'dcopendata.businessLicenses',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /dcgis/rest/services/FEEDS/DCRA/FeatureServer/0/query',
    },
    query,
    count: licenses.length,
    pagination: {
      returned: licenses.length,
      limit: query.limit,
      maxLimit: DC_OPEN_DATA_MAX_LICENSE_LIMIT,
    },
    licenses,
  }
}
