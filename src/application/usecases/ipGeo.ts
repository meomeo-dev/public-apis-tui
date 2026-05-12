import { IpGeoClient, IPGEO_DEFAULT_QUERY, normalizeIpGeoLookupInput, type IpGeoLookup, type IpGeoLookupInput } from '../../infrastructure/openApis/ipGeoClient.js'

type IpGeoApiMeta = {
  providerId: 'ipgeo'
  providerName: 'IPGEO'
  endpoint: 'GET /ipgeo/{query}'
  documentation: 'https://api.techniknews.net/ipgeo/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  privacy: 'IP/domain geolocation can reveal approximate location and network identity; lookup requires an explicit query and never defaults to current-client IP.'
  freePlanNotes: 'Endpoint returns JSON for explicit IP/domain path lookups without API keys, OAuth, cookies, browser sessions, or account setup; omitted-query current-IP redirect is intentionally out of scope.'
}

const api = {
  providerId: 'ipgeo',
  providerName: 'IPGEO',
  endpoint: 'GET /ipgeo/{query}',
  documentation: 'https://api.techniknews.net/ipgeo/',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  privacy: 'IP/domain geolocation can reveal approximate location and network identity; lookup requires an explicit query and never defaults to current-client IP.',
  freePlanNotes: 'Endpoint returns JSON for explicit IP/domain path lookups without API keys, OAuth, cookies, browser sessions, or account setup; omitted-query current-IP redirect is intentionally out of scope.',
} satisfies IpGeoApiMeta

export type IpGeoLookupResult = {
  kind: 'ipgeo.lookup'
  api: IpGeoApiMeta
  query: ReturnType<typeof normalizeIpGeoLookupInput>
  lookup: IpGeoLookup
  transport: {
    url: string
    contentType?: string | undefined
  }
}

export async function lookupIpGeo(input: IpGeoLookupInput = {}): Promise<IpGeoLookupResult> {
  const query = normalizeIpGeoLookupInput(input)
  const response = await new IpGeoClient().lookup(query)
  return {
    kind: 'ipgeo.lookup',
    api,
    query,
    lookup: response.lookup,
    transport: {
      url: response.endpoint,
      ...(response.contentType !== undefined ? { contentType: response.contentType } : {}),
    },
  }
}

export { IPGEO_DEFAULT_QUERY }
export type { IpGeoLookupInput }
