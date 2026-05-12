import {
  ECONDB_MAX_LIMIT,
  EcondbClient,
  normalizeEcondbCatalogInput,
  type EcondbCatalogInput,
  type EcondbDataset,
  type EcondbSource,
} from '../../infrastructure/openApis/econdbClient.js'

type EcondbApiMeta = {
  provider: 'econdb'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  authBoundary: string
}

type EcondbPagination = {
  returned: number
  page: number
  limit: number
  maxLimit: number
  total?: number | undefined
  pages?: number | undefined
  hasNext: boolean
}

export type EcondbSourcesResult = {
  kind: 'econdb.sources'
  api: EcondbApiMeta
  query: ReturnType<typeof normalizeEcondbCatalogInput>
  count: number
  pagination: EcondbPagination
  sources: EcondbSource[]
}

export type EcondbDatasetsResult = {
  kind: 'econdb.datasets'
  api: EcondbApiMeta
  query: ReturnType<typeof normalizeEcondbCatalogInput>
  count: number
  pagination: EcondbPagination
  datasets: EcondbDataset[]
}

export async function listEcondbSources(input: EcondbCatalogInput = {}): Promise<EcondbSourcesResult> {
  const query = normalizeEcondbCatalogInput(input)
  const client = new EcondbClient()
  const response = await client.listSources(query)
  return {
    kind: 'econdb.sources',
    api: createApiMeta('GET /api/sources/?format=json'),
    query,
    count: response.results.length,
    pagination: createPagination(response.results.length, query, response.count, response.pages, response.next !== undefined),
    sources: response.results,
  }
}

export async function listEcondbDatasets(input: EcondbCatalogInput = {}): Promise<EcondbDatasetsResult> {
  const query = normalizeEcondbCatalogInput(input)
  const client = new EcondbClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'econdb.datasets',
    api: createApiMeta('GET /api/datasets/?format=json'),
    query,
    count: response.results.length,
    pagination: createPagination(response.results.length, query, response.count, response.pages, response.next !== undefined),
    datasets: response.results,
  }
}

function createApiMeta(endpoint: string): EcondbApiMeta {
  return {
    provider: 'econdb',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://developers.econdb.com/docs/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    authBoundary: 'No-auth implementation is limited to sources and datasets catalogs; series data endpoints returned HTTP 401 Token required on 2026-05-04.',
  }
}

function createPagination(
  returned: number,
  query: ReturnType<typeof normalizeEcondbCatalogInput>,
  total: number | undefined,
  pages: number | undefined,
  hasNext: boolean,
): EcondbPagination {
  return {
    returned,
    page: query.page,
    limit: query.limit,
    maxLimit: ECONDB_MAX_LIMIT,
    ...(total !== undefined ? { total } : {}),
    ...(pages !== undefined ? { pages } : {}),
    hasNext,
  }
}
