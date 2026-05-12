import { GeoJsClient, GEOJS_DEFAULT_IP, normalizeGeoJsLookupInput, type GeoJsLookup, type GeoJsLookupInput } from '../../infrastructure/openApis/geoJsClient.js'

type GeoJsApiMeta = {
  providerId: 'geojs'
  providerName: 'GeoJS'
  endpoint: 'GET /v1/ip/geo/{ip}.json' | 'GET /v1/ip.json'
  documentation: 'https://www.geojs.io/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  privacy: 'IP geolocation can reveal approximate location and network identity; current-client IP lookup is explicit only.'
  rateLimitPolicy: 'Official homepage states no rate limits yet; use persistence for repeated lookups.'
}

const baseApi = {
  providerId: 'geojs',
  providerName: 'GeoJS',
  documentation: 'https://www.geojs.io/',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  privacy: 'IP geolocation can reveal approximate location and network identity; current-client IP lookup is explicit only.',
  rateLimitPolicy: 'Official homepage states no rate limits yet; use persistence for repeated lookups.',
} satisfies Omit<GeoJsApiMeta, 'endpoint'>

export type GeoJsLookupResult = {
  kind: 'geojs.lookup'
  api: GeoJsApiMeta
  query: ReturnType<typeof normalizeGeoJsLookupInput>
  lookup: GeoJsLookup
}

export type GeoJsCurrentIpResult = {
  kind: 'geojs.currentIp'
  api: GeoJsApiMeta
  privacy: {
    classification: 'current-client-ip'
    note: 'This operation intentionally asks GeoJS for the current network IP; it is not used as the default geolocation lookup.'
  }
  currentIp: { ip: string }
}

export async function lookupGeoJs(input: GeoJsLookupInput = {}): Promise<GeoJsLookupResult> {
  const query = normalizeGeoJsLookupInput(input)
  const lookup = await new GeoJsClient().lookup(query)
  return {
    kind: 'geojs.lookup',
    api: { ...baseApi, endpoint: 'GET /v1/ip/geo/{ip}.json' },
    query,
    lookup,
  }
}

export async function getGeoJsCurrentIp(): Promise<GeoJsCurrentIpResult> {
  const currentIp = await new GeoJsClient().currentIp()
  return {
    kind: 'geojs.currentIp',
    api: { ...baseApi, endpoint: 'GET /v1/ip.json' },
    privacy: {
      classification: 'current-client-ip',
      note: 'This operation intentionally asks GeoJS for the current network IP; it is not used as the default geolocation lookup.',
    },
    currentIp,
  }
}

export { GEOJS_DEFAULT_IP }
export type { GeoJsLookupInput }
