import { IpApiClient, IPAPI_DEFAULT_QUERY, normalizeIpApiLookupInput, type IpApiLookup, type IpApiLookupInput, type IpApiRateLimit } from '../../infrastructure/openApis/ipApiClient.js'

type IpApiApiMeta = {
  providerId: 'ip-api'
  providerName: 'ip-api.com'
  endpoint: 'GET /json/{query}'
  documentation: 'https://ip-api.com/docs'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTP JSON REST'
  privacy: 'IP/domain geolocation can reveal approximate location and network identity; lookup requires an explicit query and never defaults to current-client IP.'
  freePlanNotes: 'Free endpoint is no-key HTTP-only with documented 45 requests/minute rate limit; HTTPS requires a paid key and is intentionally out of scope.'
  rateLimitPolicy: '45 requests/minute; response headers X-Rl and X-Ttl expose remaining quota and reset seconds.'
}

const api = {
  providerId: 'ip-api',
  providerName: 'ip-api.com',
  endpoint: 'GET /json/{query}',
  documentation: 'https://ip-api.com/docs',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTP JSON REST',
  privacy: 'IP/domain geolocation can reveal approximate location and network identity; lookup requires an explicit query and never defaults to current-client IP.',
  freePlanNotes: 'Free endpoint is no-key HTTP-only with documented 45 requests/minute rate limit; HTTPS requires a paid key and is intentionally out of scope.',
  rateLimitPolicy: '45 requests/minute; response headers X-Rl and X-Ttl expose remaining quota and reset seconds.',
} satisfies IpApiApiMeta

export type IpApiLookupResult = {
  kind: 'ipapi.lookup'
  api: IpApiApiMeta
  query: ReturnType<typeof normalizeIpApiLookupInput>
  lookup: IpApiLookup
  rateLimit: IpApiRateLimit
  transport: {
    url: string
    contentType?: string | undefined
    security: 'http-only'
  }
}

export async function lookupIpApi(input: IpApiLookupInput = {}): Promise<IpApiLookupResult> {
  const query = normalizeIpApiLookupInput(input)
  const response = await new IpApiClient().lookup(query)
  return {
    kind: 'ipapi.lookup',
    api,
    query,
    lookup: response.lookup,
    rateLimit: response.rateLimit,
    transport: {
      url: response.endpoint,
      ...(response.contentType !== undefined ? { contentType: response.contentType } : {}),
      security: 'http-only',
    },
  }
}

export { IPAPI_DEFAULT_QUERY }
export type { IpApiLookupInput }
