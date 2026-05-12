import { z } from 'zod'
import { IPINFO_DEFAULT_IP, lookupIpInfo, type IpInfoLookupInput } from '../../application/usecases/ipInfo.js'
import { normalizeIpInfoLookupInput } from '../../infrastructure/openApis/ipInfoClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  ip: z.string().optional(),
}) satisfies z.ZodType<IpInfoLookupInput>

const lookupOperation: PublicApiOperationDefinition<IpInfoLookupInput> = {
  id: 'ipinfo.lookup',
  providerId: 'ipinfo',
  name: 'IP geolocation lookup',
  commandPath: ['ipinfo', 'lookup'],
  rpcMethod: 'ipinfo.lookup',
  description: 'Look up IPinfo geolocation details for an explicit IPv4/IPv6 address.',
  category: 'geocoding',
  options: [
    {
      name: 'ip',
      flag: '--ip <address>',
      description: `IPv4 or IPv6 address, default ${IPINFO_DEFAULT_IP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Using an explicit sample IP avoids silently geolocating the current CLI network by default.',
      defaultValue: IPINFO_DEFAULT_IP,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupIpInfo(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIpInfoLookupInput(params),
  resultKind: 'ipinfo.lookup',
  defaultFormat: 'text',
}

export const ipInfoProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ipinfo',
    name: 'IPinfo',
    description: 'No-token HTTPS JSON IP geolocation lookup for explicit IP addresses.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://ipinfo.io/',
    docsUrl: 'https://ipinfo.io/developers',
    auth: {
      mode: 'none',
      notes: ['Implemented explicit-IP JSON lookups return a limited public response without committed API keys, OAuth, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'ip-geolocation', 'geoip', 'ipv4', 'ipv6', 'json', 'no-auth'],
    freePlanNotes: [
      'Unauthenticated responses include readme https://ipinfo.io/missingauth and a limited response shape.',
      'Default lookup uses explicit sample IP 8.8.8.8; current-client IP lookup and token workflows are intentionally not exposed.',
      'Invalid IPs return JSON 404 and are rejected locally before calling the provider.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'ipinfo-lookup',
      method: 'GET',
      urlPattern: 'https://ipinfo.io/{ip}/json',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'IPinfo explicit IP geolocation endpoint returning JSON without a token for limited public data.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://ipinfo.io/developers', 'https://ipinfo.io/8.8.8.8/json', 'https://ipinfo.io/1.1.1.1/json'],
      consumedBy: ['public-apis apis run ipinfo.lookup'],
      notes: ['No token required for implemented explicit-IP samples.', 'Unauthenticated responses include a missingauth readme URL.', 'CLI default avoids current-client IP geolocation.'],
    },
  ],
}

export type { IpInfoLookupInput } from '../../application/usecases/ipInfo.js'
