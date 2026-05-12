import {
  POSTCODES_IO_DOCS_URL,
  POSTCODES_IO_MAX_LIMIT,
  PostcodesIoClient,
  normalizePostcodesIoLookupInput,
  normalizePostcodesIoNearestInput,
  normalizePostcodesIoSearchInput,
  type PostcodesIoLookupInput,
  type PostcodesIoNearestInput,
  type PostcodesIoPostcode,
  type PostcodesIoSearchInput,
} from '../../infrastructure/openApis/postcodesIoClient.js'

type PostcodesIoApiMeta = {
  providerId: 'postcodes-io'
  providerName: 'Postcodes.io'
  endpoint: string
  documentation: typeof POSTCODES_IO_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  reliability: 'Reference/geocoding data for UK postcodes; validate delivery-critical decisions against official postal or address sources.'
}

const apiBase = {
  providerId: 'postcodes-io',
  providerName: 'Postcodes.io',
  documentation: POSTCODES_IO_DOCS_URL,
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  reliability: 'Reference/geocoding data for UK postcodes; validate delivery-critical decisions against official postal or address sources.',
} satisfies Omit<PostcodesIoApiMeta, 'endpoint'>

export type PostcodesIoLookupResult = {
  kind: 'postcodes-io.lookup'
  api: PostcodesIoApiMeta & { endpoint: 'GET /postcodes/{postcode}' }
  query: ReturnType<typeof normalizePostcodesIoLookupInput>
  postcode?: PostcodesIoPostcode | undefined
  count: { returned: 0 | 1 }
}

export type PostcodesIoSearchResult = {
  kind: 'postcodes-io.search'
  api: PostcodesIoApiMeta & { endpoint: 'GET /postcodes?q={query}' }
  query: ReturnType<typeof normalizePostcodesIoSearchInput>
  postcodes: PostcodesIoPostcode[]
  pagination: { returned: number; limit: number; maxLimit: typeof POSTCODES_IO_MAX_LIMIT }
}

export type PostcodesIoNearestResult = {
  kind: 'postcodes-io.nearest'
  api: PostcodesIoApiMeta & { endpoint: 'GET /postcodes?lat={latitude}&lon={longitude}' }
  query: ReturnType<typeof normalizePostcodesIoNearestInput>
  postcodes: PostcodesIoPostcode[]
  pagination: { returned: number; limit: number; maxLimit: typeof POSTCODES_IO_MAX_LIMIT }
}

export async function lookupPostcodesIo(input: PostcodesIoLookupInput = {}): Promise<PostcodesIoLookupResult> {
  const query = normalizePostcodesIoLookupInput(input)
  const postcode = await new PostcodesIoClient().lookup(query)
  return {
    kind: 'postcodes-io.lookup',
    api: { ...apiBase, endpoint: 'GET /postcodes/{postcode}' },
    query,
    ...(postcode !== undefined ? { postcode } : {}),
    count: { returned: postcode === undefined ? 0 : 1 },
  }
}

export async function searchPostcodesIo(input: PostcodesIoSearchInput = {}): Promise<PostcodesIoSearchResult> {
  const query = normalizePostcodesIoSearchInput(input)
  const postcodes = await new PostcodesIoClient().search(query)
  return {
    kind: 'postcodes-io.search',
    api: { ...apiBase, endpoint: 'GET /postcodes?q={query}' },
    query,
    postcodes,
    pagination: { returned: postcodes.length, limit: query.limit, maxLimit: POSTCODES_IO_MAX_LIMIT },
  }
}

export async function nearestPostcodesIo(input: PostcodesIoNearestInput = {}): Promise<PostcodesIoNearestResult> {
  const query = normalizePostcodesIoNearestInput(input)
  const postcodes = await new PostcodesIoClient().nearest(query)
  return {
    kind: 'postcodes-io.nearest',
    api: { ...apiBase, endpoint: 'GET /postcodes?lat={latitude}&lon={longitude}' },
    query,
    postcodes,
    pagination: { returned: postcodes.length, limit: query.limit, maxLimit: POSTCODES_IO_MAX_LIMIT },
  }
}

export type { PostcodesIoLookupInput, PostcodesIoNearestInput, PostcodesIoSearchInput }
