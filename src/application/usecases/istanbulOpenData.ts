import {
  IstanbulOpenDataClient,
  ISTANBUL_OPEN_DATA_RECORDS_MAX_LIMIT,
  ISTANBUL_OPEN_DATA_SEARCH_MAX_LIMIT,
  normalizeIstanbulOpenDataRecordsInput,
  normalizeIstanbulOpenDataSearchInput,
  type IstanbulOpenDataDataset,
  type IstanbulOpenDataRecordsInput,
  type IstanbulOpenDataSearchInput,
} from '../../infrastructure/openApis/istanbulOpenDataClient.js'

type IstanbulOpenDataApiMeta = {
  provider: 'istanbulopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type IstanbulOpenDataSearchResult = {
  kind: 'istanbulopendata.search'
  api: IstanbulOpenDataApiMeta
  query: ReturnType<typeof normalizeIstanbulOpenDataSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: IstanbulOpenDataDataset[]
}

export type IstanbulOpenDataRecordsResult = {
  kind: 'istanbulopendata.records'
  api: IstanbulOpenDataApiMeta
  query: ReturnType<typeof normalizeIstanbulOpenDataRecordsInput>
  resourceId: string
  total?: number | undefined
  fields: string[]
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  records: Array<Record<string, unknown>>
}

export async function searchIstanbulOpenDataDatasets(input: IstanbulOpenDataSearchInput = {}): Promise<IstanbulOpenDataSearchResult> {
  const query = normalizeIstanbulOpenDataSearchInput(input)
  const client = new IstanbulOpenDataClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'istanbulopendata.search',
    api: createApiMeta('GET /api/3/action/package_search', 'package_search rows defaults/caps at 1000; live metro query currently returns all 64 matches below the cap.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: ISTANBUL_OPEN_DATA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function readIstanbulOpenDataRecords(input: IstanbulOpenDataRecordsInput = {}): Promise<IstanbulOpenDataRecordsResult> {
  const query = normalizeIstanbulOpenDataRecordsInput(input)
  const client = new IstanbulOpenDataClient()
  const response = await client.readRecords(query)
  return {
    kind: 'istanbulopendata.records',
    api: createApiMeta('GET /api/3/action/datastore_search', 'datastore_search accepts large no-auth limits; CLI defaults/caps at 5000 to maximize one bounded request.'),
    query,
    resourceId: response.resourceId,
    total: response.total,
    fields: response.fields,
    count: response.records.length,
    pagination: {
      returned: response.records.length,
      limit: query.limit,
      maxLimit: ISTANBUL_OPEN_DATA_RECORDS_MAX_LIMIT,
    },
    records: response.records,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): IstanbulOpenDataApiMeta {
  return {
    provider: 'istanbulopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://data.ibb.gov.tr/api/3/action/help_show?name=package_search',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Istanbul Metropolitan Municipality Open Data License is surfaced by dataset metadata.',
    limitPolicy,
  }
}
