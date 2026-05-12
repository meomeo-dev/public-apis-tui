import {
  HONG_KONG_GEODATA_DEFAULT_LIMIT,
  HONG_KONG_GEODATA_DEFAULT_QUERY,
  HONG_KONG_GEODATA_MAX_LIMIT,
  HongKongGeoDataClient,
  normalizeHongKongGeoDataSearchInput,
  type HongKongGeoDataLocation,
  type HongKongGeoDataSearchInput,
} from '../../infrastructure/openApis/hongKongGeoDataClient.js'

type HongKongGeoDataApiMeta = {
  providerId: 'hongkonggeodata'
  providerName: 'Hong Kong GeoData Store'
  endpoint: 'GET /gs/api/v1.0.0/locationSearch?q={query}'
  documentation: 'https://portal.csdi.gov.hk/csdi-webpage/apidoc/LocationSearchAPI'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  rateLimitPolicy: 'Official docs ask applications not to invoke large amounts of requests within a short period.'
  migrationNotice: 'Docs state geodata.gov.hk hostname stopped serving Location Search API after 2026-05-04; use www.map.gov.hk.'
  cliLimitCap: typeof HONG_KONG_GEODATA_MAX_LIMIT
}

const api = {
  providerId: 'hongkonggeodata',
  providerName: 'Hong Kong GeoData Store',
  endpoint: 'GET /gs/api/v1.0.0/locationSearch?q={query}',
  documentation: 'https://portal.csdi.gov.hk/csdi-webpage/apidoc/LocationSearchAPI',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  rateLimitPolicy: 'Official docs ask applications not to invoke large amounts of requests within a short period.',
  migrationNotice: 'Docs state geodata.gov.hk hostname stopped serving Location Search API after 2026-05-04; use www.map.gov.hk.',
  cliLimitCap: HONG_KONG_GEODATA_MAX_LIMIT,
} satisfies HongKongGeoDataApiMeta

export type HongKongGeoDataSearchResult = {
  kind: 'hongkonggeodata.locationSearch'
  api: HongKongGeoDataApiMeta
  query: ReturnType<typeof normalizeHongKongGeoDataSearchInput>
  count: number
  totalReturned: number
  locations: HongKongGeoDataLocation[]
}

export async function searchHongKongGeoDataLocations(input: HongKongGeoDataSearchInput = {}): Promise<HongKongGeoDataSearchResult> {
  const query = normalizeHongKongGeoDataSearchInput(input)
  const { locations, totalReturned } = await new HongKongGeoDataClient().searchLocations(query)
  return {
    kind: 'hongkonggeodata.locationSearch',
    api,
    query,
    count: locations.length,
    totalReturned,
    locations,
  }
}

export { HONG_KONG_GEODATA_DEFAULT_LIMIT, HONG_KONG_GEODATA_DEFAULT_QUERY, HONG_KONG_GEODATA_MAX_LIMIT }
export type { HongKongGeoDataSearchInput }
