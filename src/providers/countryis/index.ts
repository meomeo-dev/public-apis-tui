import { z } from 'zod'
import { getCountryIsInfo, lookupCountryIs, type CountryIsLookupInput } from '../../application/usecases/countryIs.js'
import { COUNTRY_IS_DEFAULT_IP, normalizeCountryIsLookupInput } from '../../infrastructure/openApis/countryIsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  ip: z.string().optional(),
  includeDetails: z.coerce.boolean().optional(),
}) satisfies z.ZodType<CountryIsLookupInput>

const infoParamsSchema = z.object({}) satisfies z.ZodType<Record<string, never>>

const lookupOperation: PublicApiOperationDefinition<CountryIsLookupInput> = {
  id: 'countryis.lookup',
  providerId: 'countryis',
  name: 'Lookup IP country',
  commandPath: ['countryis', 'lookup'],
  rpcMethod: 'countryis.lookup',
  description: 'Look up an IPv4/IPv6 address country with Country.is.',
  category: 'geocoding',
  options: [
    {
      name: 'ip',
      flag: '--ip <address>',
      description: `IPv4 or IPv6 address, default ${COUNTRY_IS_DEFAULT_IP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Using an explicit IP avoids silently geolocating the current CLI network by default.',
      defaultValue: COUNTRY_IS_DEFAULT_IP,
    },
    {
      name: 'includeDetails',
      flag: '--include-details <true|false>',
      description: 'Include optional city/continent/location/ASN fields, default false',
      exposure: 'advanced',
      group: 'content',
      reason: 'Detailed geolocation fields are more privacy-sensitive, so the default exposes only country-level data.',
      valueType: 'boolean',
      defaultValue: 'false',
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupCountryIs(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCountryIsLookupInput(params.ip === undefined && params.includeDetails === undefined ? { ip: COUNTRY_IS_DEFAULT_IP } : params),
  resultKind: 'countryis.lookup',
  defaultFormat: 'text',
}

const infoOperation: PublicApiOperationDefinition<Record<string, never>> = {
  id: 'countryis.info',
  providerId: 'countryis',
  name: 'Service info',
  commandPath: ['countryis', 'info'],
  rpcMethod: 'countryis.info',
  description: 'Read Country.is service version, data sources, and update timestamp.',
  category: 'geocoding',
  options: [],
  paramsSchema: infoParamsSchema,
  execute: () => getCountryIsInfo(),
  normalizeParams: () => ({}),
  createCacheKeyParams: () => ({}),
  resultKind: 'countryis.info',
  defaultFormat: 'text',
}

export const countryIsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'countryis',
    name: 'Country',
    description: 'No-auth IP-to-country geolocation API with optional city/location/ASN fields.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://country.is/',
    docsUrl: 'https://country.is/',
    auth: {
      mode: 'none',
      notes: ['The implemented endpoints return JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'ip-geolocation', 'country', 'ipv4', 'ipv6', 'json', 'no-auth'],
    freePlanNotes: [
      'Homepage links OpenAPI service description at https://api.country.is/openapi.json.',
      'Specific IP lookup responses are cacheable upstream for about one hour; current-client lookup is intentionally not the CLI default.',
      'Detailed city/location/ASN fields are opt-in via --include-details because IP geolocation is privacy-sensitive.',
    ],
  },
  operations: [lookupOperation, infoOperation],
  endpoints: [
    {
      id: 'countryis-lookup',
      method: 'GET',
      urlPattern: 'https://api.country.is/{ip?}',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Country.is IP geolocation lookup endpoint returning country and optional details.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://country.is/', 'https://api.country.is/77.1.2.3', 'https://api.country.is/8.8.8.8?fields=city,continent,subdivision,postal,location,asn'],
      consumedBy: ['public-apis apis run countryis.lookup'],
      notes: ['No authentication required.', 'Returns application/json and supports IPv4/IPv6 path lookups.', 'Detailed fields are requested only when the CLI includeDetails option is true.'],
    },
    {
      id: 'countryis-info',
      method: 'GET',
      urlPattern: 'https://api.country.is/info',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Country.is service metadata endpoint with version, data sources, and update timestamp.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://api.country.is/info'],
      consumedBy: ['public-apis apis run countryis.info'],
      notes: ['No authentication required.', 'Returns application/json and is useful for source freshness checks.'],
    },
  ],
}

export type { CountryIsLookupInput } from '../../application/usecases/countryIs.js'
