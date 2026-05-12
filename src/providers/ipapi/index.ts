import { z } from 'zod'
import { IPAPI_DEFAULT_QUERY, lookupIpApi, type IpApiLookupInput } from '../../application/usecases/ipApi.js'
import { normalizeIpApiLookupInput } from '../../infrastructure/openApis/ipApiClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  query: z.string().optional(),
}) satisfies z.ZodType<IpApiLookupInput>

const lookupOperation: PublicApiOperationDefinition<IpApiLookupInput> = {
  id: 'ipapi.lookup',
  providerId: 'ip-api',
  name: 'IP/domain geolocation lookup',
  commandPath: ['ipapi', 'lookup'],
  rpcMethod: 'ipapi.lookup',
  description: 'Look up ip-api.com geolocation details for an explicit IP address or domain.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <ip-or-domain>',
      description: `IPv4/IPv6 address or domain, default ${IPAPI_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Using an explicit sample query avoids silently geolocating the current CLI network by default.',
      defaultValue: IPAPI_DEFAULT_QUERY,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupIpApi(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIpApiLookupInput(params),
  resultKind: 'ipapi.lookup',
  defaultFormat: 'text',
}

export const ipApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ip-api',
    name: 'ip-api.com',
    description: 'No-key HTTP JSON IP/domain geolocation lookup for explicit queries.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://ip-api.com/',
    docsUrl: 'https://ip-api.com/docs',
    auth: {
      mode: 'none',
      notes: ['Implemented free endpoint returns JSON over HTTP without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'ip-geolocation', 'geoip', 'domain', 'json', 'http-only', 'no-auth'],
    freePlanNotes: [
      'Free endpoint is HTTP-only; HTTPS returns a JSON failure asking for a paid key.',
      'Documentation and live headers show a 45 requests/minute free rate limit with X-Rl and X-Ttl quota headers.',
      'Default lookup uses explicit sample query 8.8.8.8; current-client IP lookup and batch/keyed workflows are intentionally not exposed.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'ipapi-json-lookup',
      method: 'GET',
      urlPattern: 'regex:^http://ip-api\\.com/json/[^/?]+(?:\\?.*)?$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'ip-api.com free explicit IP/domain geolocation endpoint returning JSON over HTTP.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://ip-api.com/docs', 'http://ip-api.com/json/8.8.8.8', 'http://ip-api.com/json/example.com'],
      consumedBy: ['public-apis apis run ipapi.lookup'],
      notes: ['No authentication required on HTTP free endpoint.', 'HTTPS is intentionally not used because the free endpoint returns SSL unavailable without a paid key.', 'CLI default avoids current-client IP geolocation.'],
    },
  ],
}

export type { IpApiLookupInput } from '../../application/usecases/ipApi.js'
