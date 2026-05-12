import {
  ZIPPOPOTAM_US_DOCS_URL,
  ZIPPOPOTAM_US_MAX_LIMIT,
  ZippopotamUsClient,
  normalizeZippopotamUsLookupInput,
  normalizeZippopotamUsSearchInput,
  type ZippopotamUsLookup,
  type ZippopotamUsLookupInput,
  type ZippopotamUsSearch,
  type ZippopotamUsSearchInput,
} from '../../infrastructure/openApis/zippopotamUsClient.js'

type ZippopotamUsApiMeta = {
  providerId: 'zippopotam-us'
  providerName: 'Zippopotam.us'
  endpoint: string
  documentation: typeof ZIPPOPOTAM_US_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  reliability: 'Reference postal/place data adapted from GeoNames; validate delivery-critical or legal decisions against official postal sources.'
}

const apiBase = {
  providerId: 'zippopotam-us',
  providerName: 'Zippopotam.us',
  documentation: ZIPPOPOTAM_US_DOCS_URL,
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  reliability: 'Reference postal/place data adapted from GeoNames; validate delivery-critical or legal decisions against official postal sources.',
} satisfies Omit<ZippopotamUsApiMeta, 'endpoint'>

export type ZippopotamUsLookupResult = {
  kind: 'zippopotam-us.lookup'
  api: ZippopotamUsApiMeta & { endpoint: 'GET /{country}/{postalCode}' }
  query: ReturnType<typeof normalizeZippopotamUsLookupInput>
  result?: ZippopotamUsLookup | undefined
  places: ZippopotamUsLookup['places']
  pagination: { returned: number; limit: number; maxLimit: typeof ZIPPOPOTAM_US_MAX_LIMIT }
}

export type ZippopotamUsSearchResult = {
  kind: 'zippopotam-us.search'
  api: ZippopotamUsApiMeta & { endpoint: 'GET /{country}/{state}/{city}' }
  query: ReturnType<typeof normalizeZippopotamUsSearchInput>
  result?: ZippopotamUsSearch | undefined
  places: ZippopotamUsSearch['places']
  pagination: { returned: number; limit: number; maxLimit: typeof ZIPPOPOTAM_US_MAX_LIMIT }
}

export async function lookupZippopotamUs(input: ZippopotamUsLookupInput = {}): Promise<ZippopotamUsLookupResult> {
  const query = normalizeZippopotamUsLookupInput(input)
  const result = await new ZippopotamUsClient().lookup(query)
  const places = result?.places ?? []
  return {
    kind: 'zippopotam-us.lookup',
    api: { ...apiBase, endpoint: 'GET /{country}/{postalCode}' },
    query,
    ...(result !== undefined ? { result } : {}),
    places,
    pagination: { returned: places.length, limit: query.limit, maxLimit: ZIPPOPOTAM_US_MAX_LIMIT },
  }
}

export async function searchZippopotamUs(input: ZippopotamUsSearchInput = {}): Promise<ZippopotamUsSearchResult> {
  const query = normalizeZippopotamUsSearchInput(input)
  const result = await new ZippopotamUsClient().search(query)
  const places = result?.places ?? []
  return {
    kind: 'zippopotam-us.search',
    api: { ...apiBase, endpoint: 'GET /{country}/{state}/{city}' },
    query,
    ...(result !== undefined ? { result } : {}),
    places,
    pagination: { returned: places.length, limit: query.limit, maxLimit: ZIPPOPOTAM_US_MAX_LIMIT },
  }
}

export type { ZippopotamUsLookupInput, ZippopotamUsSearchInput }
