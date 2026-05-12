import {
  OpenGovernmentAustraliaClient,
  OPEN_GOVERNMENT_AUSTRALIA_RECORDS_MAX_LIMIT,
  OPEN_GOVERNMENT_AUSTRALIA_SEARCH_MAX_LIMIT,
  normalizeOpenGovernmentAustraliaRecordsInput,
  normalizeOpenGovernmentAustraliaSearchInput,
  type OpenGovernmentAustraliaDataset,
  type OpenGovernmentAustraliaRecordsInput,
  type OpenGovernmentAustraliaSearchInput,
} from '../../infrastructure/openApis/openGovernmentAustraliaClient.js'

type OpenGovernmentAustraliaApiMeta = {
  provider: 'opengovernmentau'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON CKAN Action API'
  licenseNote: string
  limitPolicy: string
}

export type OpenGovernmentAustraliaSearchResult = {
  kind: 'opengovernmentau.search'
  api: OpenGovernmentAustraliaApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentAustraliaSearchInput>
  count: number
  total?: number | undefined
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: OpenGovernmentAustraliaDataset[]
}

export type OpenGovernmentAustraliaRecordsResult = {
  kind: 'opengovernmentau.records'
  api: OpenGovernmentAustraliaApiMeta
  query: ReturnType<typeof normalizeOpenGovernmentAustraliaRecordsInput>
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

export async function searchOpenGovernmentAustraliaDatasets(input: OpenGovernmentAustraliaSearchInput = {}): Promise<OpenGovernmentAustraliaSearchResult> {
  const query = normalizeOpenGovernmentAustraliaSearchInput(input)
  const client = new OpenGovernmentAustraliaClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'opengovernmentau.search',
    api: createApiMeta('GET /data/api/3/action/package_search', 'package_search rows defaults/caps at 1000 to maximize one bounded no-auth request.'),
    query,
    count: response.results.length,
    total: response.count,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_AUSTRALIA_SEARCH_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function readOpenGovernmentAustraliaRecords(input: OpenGovernmentAustraliaRecordsInput = {}): Promise<OpenGovernmentAustraliaRecordsResult> {
  const query = normalizeOpenGovernmentAustraliaRecordsInput(input)
  const client = new OpenGovernmentAustraliaClient()
  const response = await client.readRecords(query)
  return {
    kind: 'opengovernmentau.records',
    api: createApiMeta('GET /data/api/3/action/datastore_search', 'datastore_search accepted 5000 rows for the default ASIC Business Names resource; CLI defaults/caps at 5000.'),
    query,
    resourceId: response.resourceId,
    total: response.total,
    fields: response.fields,
    count: response.records.length,
    pagination: {
      returned: response.records.length,
      limit: query.limit,
      maxLimit: OPEN_GOVERNMENT_AUSTRALIA_RECORDS_MAX_LIMIT,
    },
    records: response.records,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): OpenGovernmentAustraliaApiMeta {
  return {
    provider: 'opengovernmentau',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://data.gov.au/data/api/3/action/help_show?name=package_search',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON CKAN Action API',
    licenseNote: 'Dataset metadata surfaces each Australian Government open-data license.',
    limitPolicy,
  }
}
