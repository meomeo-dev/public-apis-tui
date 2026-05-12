import {
  NATIONAL_GRID_ESO_RECORDS_MAX_LIMIT,
  NATIONAL_GRID_ESO_SEARCH_MAX_LIMIT,
  NationalGridEsoClient,
  normalizeNationalGridEsoRecordsInput,
  normalizeNationalGridEsoSearchInput,
  type NationalGridEsoDataset,
  type NationalGridEsoRecordsInput,
  type NationalGridEsoSearchInput,
} from '../../infrastructure/openApis/nationalGridEsoClient.js'

type NationalGridEsoApiMeta = {
  provider: 'nationalgrideso'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  migrationNote: string
}

export type NationalGridEsoSearchResult = {
  kind: 'nationalgrideso.search'
  api: NationalGridEsoApiMeta
  query: ReturnType<typeof normalizeNationalGridEsoSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: NationalGridEsoDataset[]
}

export type NationalGridEsoRecordsResult = {
  kind: 'nationalgrideso.records'
  api: NationalGridEsoApiMeta
  query: ReturnType<typeof normalizeNationalGridEsoRecordsInput>
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

export async function searchNationalGridEsoDatasets(input: NationalGridEsoSearchInput = {}): Promise<NationalGridEsoSearchResult> {
  const query = normalizeNationalGridEsoSearchInput(input)
  const client = new NationalGridEsoClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'nationalgrideso.search',
    api: createApiMeta('GET /api/3/action/package_search'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: NATIONAL_GRID_ESO_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function readNationalGridEsoRecords(input: NationalGridEsoRecordsInput = {}): Promise<NationalGridEsoRecordsResult> {
  const query = normalizeNationalGridEsoRecordsInput(input)
  const client = new NationalGridEsoClient()
  const response = await client.readRecords(query)
  return {
    kind: 'nationalgrideso.records',
    api: createApiMeta('GET /api/3/action/datastore_search'),
    query,
    resourceId: response.resourceId,
    total: response.total,
    fields: response.fields,
    count: response.records.length,
    pagination: {
      returned: response.records.length,
      limit: query.limit,
      maxLimit: NATIONAL_GRID_ESO_RECORDS_MAX_LIMIT,
    },
    records: response.records,
  }
}

function createApiMeta(endpoint: string): NationalGridEsoApiMeta {
  return {
    provider: 'nationalgrideso',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://api.neso.energy/api/3/action/package_search?q=demand&rows=3',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    migrationNote: 'public-apis entry data.nationalgrideso.com has migrated to the NESO Data Portal at api.neso.energy.',
  }
}
