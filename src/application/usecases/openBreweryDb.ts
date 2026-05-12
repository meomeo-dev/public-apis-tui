import {
  OpenBreweryDbClient,
  OPEN_BREWERY_DB_MAX_PER_PAGE,
  normalizeOpenBreweryDbListInput,
  normalizeOpenBreweryDbMetaInput,
  normalizeOpenBreweryDbSearchInput,
  type OpenBreweryDbBrewery,
  type OpenBreweryDbListInput,
  type OpenBreweryDbMeta,
  type OpenBreweryDbMetaInput,
  type OpenBreweryDbRateLimit,
  type OpenBreweryDbSearchInput,
} from '../../infrastructure/openApis/openBreweryDbClient.js'

export type OpenBreweryDbBreweriesResult = {
  kind: 'openbrewerydb.breweries'
  api: OpenBreweryDbMetaInfo
  query: ReturnType<typeof normalizeOpenBreweryDbListInput>
  pagination: {
    returned: number
    perPage: number
    page: number
    maxPerPage: number
  }
  rateLimit: OpenBreweryDbRateLimit
  breweries: OpenBreweryDbBrewery[]
}

export type OpenBreweryDbSearchResult = {
  kind: 'openbrewerydb.search'
  api: OpenBreweryDbMetaInfo
  query: ReturnType<typeof normalizeOpenBreweryDbSearchInput>
  pagination: {
    returned: number
    perPage: number
    page: number
    maxPerPage: number
  }
  rateLimit: OpenBreweryDbRateLimit
  breweries: OpenBreweryDbBrewery[]
}

export type OpenBreweryDbMetaResult = {
  kind: 'openbrewerydb.meta'
  api: OpenBreweryDbMetaInfo
  query: ReturnType<typeof normalizeOpenBreweryDbMetaInput>
  rateLimit: OpenBreweryDbRateLimit
  meta: OpenBreweryDbMeta
}

type OpenBreweryDbMetaInfo = {
  provider: 'openbrewerydb'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
}

const commonApiMeta = {
  provider: 'openbrewerydb',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://www.openbrewerydb.org/documentation',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
} satisfies Omit<OpenBreweryDbMetaInfo, 'endpoint'>

export async function listOpenBreweryDbBreweries(input: OpenBreweryDbListInput = {}): Promise<OpenBreweryDbBreweriesResult> {
  const query = normalizeOpenBreweryDbListInput(input)
  const client = new OpenBreweryDbClient()
  const response = await client.listBreweries(query)
  return {
    kind: 'openbrewerydb.breweries',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /v1/breweries',
    },
    query,
    pagination: {
      returned: response.breweries.length,
      perPage: query.perPage,
      page: query.page,
      maxPerPage: OPEN_BREWERY_DB_MAX_PER_PAGE,
    },
    rateLimit: response.rateLimit,
    breweries: response.breweries,
  }
}

export async function searchOpenBreweryDbBreweries(input: OpenBreweryDbSearchInput = {}): Promise<OpenBreweryDbSearchResult> {
  const query = normalizeOpenBreweryDbSearchInput(input)
  const client = new OpenBreweryDbClient()
  const response = await client.searchBreweries(query)
  return {
    kind: 'openbrewerydb.search',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /v1/breweries/search',
    },
    query,
    pagination: {
      returned: response.breweries.length,
      perPage: query.perPage,
      page: query.page,
      maxPerPage: OPEN_BREWERY_DB_MAX_PER_PAGE,
    },
    rateLimit: response.rateLimit,
    breweries: response.breweries,
  }
}

export async function getOpenBreweryDbMeta(input: OpenBreweryDbMetaInput = {}): Promise<OpenBreweryDbMetaResult> {
  const query = normalizeOpenBreweryDbMetaInput(input)
  const client = new OpenBreweryDbClient()
  const response = await client.getMeta(query)
  return {
    kind: 'openbrewerydb.meta',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /v1/breweries/meta',
    },
    query,
    rateLimit: response.rateLimit,
    meta: response.meta,
  }
}
