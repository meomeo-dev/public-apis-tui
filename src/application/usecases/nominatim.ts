import {
  NOMINATIM_DOCS_URL,
  NOMINATIM_MAX_LIMIT,
  NOMINATIM_POLICY_URL,
  NominatimClient,
  normalizeNominatimReverseInput,
  normalizeNominatimSearchInput,
  type NominatimPlace,
  type NominatimReverseInput,
  type NominatimSearchInput,
} from '../../infrastructure/openApis/nominatimClient.js'

type NominatimApiMeta = {
  providerId: 'nominatim'
  providerName: 'Nominatim'
  endpoint: string
  documentation: typeof NOMINATIM_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  policy: typeof NOMINATIM_POLICY_URL
  usagePolicy: 'OSMF public service policy requires a valid User-Agent or Referer, visible attribution, caching where possible, no autocomplete, no heavy/bulk use, and an absolute maximum of 1 request per second.'
  attribution: 'Data © OpenStreetMap contributors, ODbL 1.0'
  rateLimit: '≤1 request/second; CLI exposes only bounded manual lookups and encourages --persist/--offline replay.'
}

function api(endpoint: string): NominatimApiMeta {
  return {
    providerId: 'nominatim',
    providerName: 'Nominatim',
    endpoint,
    documentation: NOMINATIM_DOCS_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    policy: NOMINATIM_POLICY_URL,
    usagePolicy: 'OSMF public service policy requires a valid User-Agent or Referer, visible attribution, caching where possible, no autocomplete, no heavy/bulk use, and an absolute maximum of 1 request per second.',
    attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
    rateLimit: '≤1 request/second; CLI exposes only bounded manual lookups and encourages --persist/--offline replay.',
  }
}

export type NominatimSearchResult = {
  kind: 'nominatim.search'
  api: NominatimApiMeta
  query: ReturnType<typeof normalizeNominatimSearchInput>
  places: NominatimPlace[]
  pagination: {
    returned: number
    limit: number
    maxLimit: typeof NOMINATIM_MAX_LIMIT
  }
}

export type NominatimReverseResult = {
  kind: 'nominatim.reverse'
  api: NominatimApiMeta
  query: ReturnType<typeof normalizeNominatimReverseInput>
  place: NominatimPlace
}

export async function searchNominatim(input: NominatimSearchInput = {}): Promise<NominatimSearchResult> {
  const query = normalizeNominatimSearchInput(input)
  const places = await new NominatimClient().search(query)
  return {
    kind: 'nominatim.search',
    api: api('GET /search'),
    query,
    places,
    pagination: {
      returned: places.length,
      limit: query.limit,
      maxLimit: NOMINATIM_MAX_LIMIT,
    },
  }
}

export async function reverseNominatim(input: NominatimReverseInput = {}): Promise<NominatimReverseResult> {
  const query = normalizeNominatimReverseInput(input)
  const place = await new NominatimClient().reverse(query)
  return {
    kind: 'nominatim.reverse',
    api: api('GET /reverse'),
    query,
    place,
  }
}

export type { NominatimReverseInput, NominatimSearchInput }
