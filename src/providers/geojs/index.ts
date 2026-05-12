import { z } from 'zod'
import { GEOJS_DEFAULT_IP, getGeoJsCurrentIp, lookupGeoJs, type GeoJsLookupInput } from '../../application/usecases/geoJs.js'
import { normalizeGeoJsLookupInput } from '../../infrastructure/openApis/geoJsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  ip: z.string().optional(),
}) satisfies z.ZodType<GeoJsLookupInput>

const currentIpParamsSchema = z.object({}) satisfies z.ZodType<Record<string, never>>

const lookupOperation: PublicApiOperationDefinition<GeoJsLookupInput> = {
  id: 'geojs.lookup',
  providerId: 'geojs',
  name: 'IP geolocation lookup',
  commandPath: ['geojs', 'lookup'],
  rpcMethod: 'geojs.lookup',
  description: 'Look up approximate GeoJS geolocation details for an explicit IPv4/IPv6 address.',
  category: 'geocoding',
  options: [
    {
      name: 'ip',
      flag: '--ip <address>',
      description: `IPv4 or IPv6 address, default ${GEOJS_DEFAULT_IP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Using an explicit sample IP avoids silently geolocating the current CLI network by default.',
      defaultValue: GEOJS_DEFAULT_IP,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupGeoJs(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGeoJsLookupInput(params),
  resultKind: 'geojs.lookup',
  defaultFormat: 'text',
}

const currentIpOperation: PublicApiOperationDefinition<Record<string, never>> = {
  id: 'geojs.currentIp',
  providerId: 'geojs',
  name: 'Current IP',
  commandPath: ['geojs', 'current-ip'],
  rpcMethod: 'geojs.currentIp',
  description: 'Return the current network IP as seen by GeoJS; explicit operation only.',
  category: 'geocoding',
  options: [],
  paramsSchema: currentIpParamsSchema,
  execute: () => getGeoJsCurrentIp(),
  normalizeParams: () => ({}),
  createCacheKeyParams: () => ({}),
  resultKind: 'geojs.currentIp',
  defaultFormat: 'text',
}

export const geoJsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'geojs',
    name: 'GeoJS',
    description: 'No-auth REST/JSON/JSONP GeoIP API for explicit IP geolocation lookups.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://www.geojs.io/',
    docsUrl: 'https://www.geojs.io/',
    auth: {
      mode: 'none',
      notes: ['Implemented endpoints return JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'ip-geolocation', 'geoip', 'ipv4', 'ipv6', 'json', 'no-auth'],
    freePlanNotes: [
      'Homepage states no rate limits yet, but callers should persist repeated lookups.',
      'Default geolocation lookup uses explicit sample IP 8.8.8.8; current network IP is exposed only as a separate explicit current-ip operation.',
      'Invalid IP path responses can be HTML 404; client rejects non-JSON provider errors instead of treating HTML as data.',
    ],
  },
  operations: [lookupOperation, currentIpOperation],
  endpoints: [
    {
      id: 'geojs-ip-geo',
      method: 'GET',
      urlPattern: 'https://get.geojs.io/v1/ip/geo/{ip}.json',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'GeoJS explicit IP geolocation endpoint returning JSON.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://www.geojs.io/', 'https://get.geojs.io/v1/ip/geo/8.8.8.8.json', 'https://get.geojs.io/v1/ip/geo/77.1.2.3.json'],
      consumedBy: ['public-apis apis run geojs.lookup'],
      notes: ['No authentication required.', 'Supports IPv4 and IPv6 path lookups.', 'CLI default avoids current-client geolocation.'],
    },
    {
      id: 'geojs-current-ip',
      method: 'GET',
      urlPattern: 'https://get.geojs.io/v1/ip.json',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'GeoJS endpoint returning the current client IP observed by the service.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://www.geojs.io/', 'https://get.geojs.io/v1/ip.json'],
      consumedBy: ['public-apis apis run geojs.currentIp'],
      notes: ['No authentication required.', 'Current-client IP lookup is explicit and not used as the default geolocation operation.'],
    },
  ],
}

export type { GeoJsLookupInput } from '../../application/usecases/geoJs.js'
