import { z } from 'zod'
import { IPGEO_DEFAULT_QUERY, lookupIpGeo, type IpGeoLookupInput } from '../../application/usecases/ipGeo.js'
import { normalizeIpGeoLookupInput } from '../../infrastructure/openApis/ipGeoClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  query: z.string().optional(),
}) satisfies z.ZodType<IpGeoLookupInput>

const lookupOperation: PublicApiOperationDefinition<IpGeoLookupInput> = {
  id: 'ipgeo.lookup',
  providerId: 'ipgeo',
  name: 'IP/domain geolocation lookup',
  commandPath: ['ipgeo', 'lookup'],
  rpcMethod: 'ipgeo.lookup',
  description: 'Look up TechnikNews IPGEO geolocation details for an explicit IP address or domain.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <ip-or-domain>',
      description: `IPv4/IPv6 address or domain, default ${IPGEO_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Using an explicit sample query avoids silently geolocating the current CLI network by default.',
      defaultValue: IPGEO_DEFAULT_QUERY,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupIpGeo(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIpGeoLookupInput(params),
  resultKind: 'ipgeo.lookup',
  defaultFormat: 'text',
}

export const ipGeoProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ipgeo',
    name: 'IPGEO',
    description: 'No-auth HTTPS JSON IP/domain geolocation lookup for explicit queries.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://api.techniknews.net/ipgeo/',
    docsUrl: 'https://api.techniknews.net/ipgeo/',
    auth: {
      mode: 'none',
      notes: ['Implemented explicit IP/domain endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'ip-geolocation', 'geoip', 'domain', 'json', 'https', 'no-auth'],
    freePlanNotes: [
      'Public-apis description lists unlimited free IP address API; no public rate limit header was observed.',
      'Default lookup uses explicit sample query 8.8.8.8; current-client IP redirect from /ipgeo/ is intentionally not exposed.',
      'Provider errors such as invalid IP and private/reserved fail statuses are rejected instead of rendered as data.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'ipgeo-lookup',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.techniknews\\.net/ipgeo/[^/?]+/?$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'TechnikNews IPGEO explicit IP/domain geolocation endpoint returning JSON.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://api.techniknews.net/ipgeo/', 'https://api.techniknews.net/ipgeo/8.8.8.8', 'https://api.techniknews.net/ipgeo/example.com'],
      consumedBy: ['public-apis apis run ipgeo.lookup'],
      notes: ['No authentication required for explicit path lookups.', 'Supports IPv4, IPv6, and domain names.', 'CLI default avoids current-client IP geolocation.'],
    },
  ],
}

export type { IpGeoLookupInput } from '../../application/usecases/ipGeo.js'
