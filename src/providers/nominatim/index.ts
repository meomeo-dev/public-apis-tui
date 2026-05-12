import { z } from 'zod'
import { reverseNominatim, searchNominatim, type NominatimReverseInput, type NominatimSearchInput } from '../../application/usecases/nominatim.js'
import {
  NOMINATIM_DEFAULT_LANGUAGE,
  NOMINATIM_DEFAULT_LATITUDE,
  NOMINATIM_DEFAULT_LIMIT,
  NOMINATIM_DEFAULT_LONGITUDE,
  NOMINATIM_DEFAULT_QUERY,
  NOMINATIM_DOCS_URL,
  NOMINATIM_MAX_LIMIT,
  NOMINATIM_POLICY_URL,
  normalizeNominatimReverseInput,
  normalizeNominatimSearchInput,
} from '../../infrastructure/openApis/nominatimClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().optional(),
  language: z.string().optional(),
}) satisfies z.ZodType<NominatimSearchInput>

const reverseParamsSchema = z.object({
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  language: z.string().optional(),
}) satisfies z.ZodType<NominatimReverseInput>

const searchOperation: PublicApiOperationDefinition<NominatimSearchInput> = {
  id: 'nominatim.search',
  providerId: 'nominatim',
  name: 'Search',
  commandPath: ['nominatim', 'search'],
  rpcMethod: 'nominatim.search',
  description: 'Search for places with the OSMF Nominatim public geocoder using bounded manual queries.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Place/address text, default ${NOMINATIM_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The search endpoint requires an end-user supplied place/address query; autocomplete and bulk workflows are not exposed.',
      defaultValue: NOMINATIM_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Results to return, default ${String(NOMINATIM_DEFAULT_LIMIT)}, max ${String(NOMINATIM_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The public service policy requires light use, so the CLI uses a small bounded cap.',
      valueType: 'integer',
      defaultValue: String(NOMINATIM_DEFAULT_LIMIT),
    },
    {
      name: 'language',
      flag: '--language <code>',
      description: `Accept-Language code, default ${NOMINATIM_DEFAULT_LANGUAGE}`,
      exposure: 'advanced',
      group: 'filters',
      reason: 'Nominatim supports Accept-Language; exposing a short code is useful but secondary to the place query.',
      defaultValue: NOMINATIM_DEFAULT_LANGUAGE,
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchNominatim(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNominatimSearchInput(params),
  resultKind: 'nominatim.search',
  defaultFormat: 'text',
}

const reverseOperation: PublicApiOperationDefinition<NominatimReverseInput> = {
  id: 'nominatim.reverse',
  providerId: 'nominatim',
  name: 'Reverse geocode',
  commandPath: ['nominatim', 'reverse'],
  rpcMethod: 'nominatim.reverse',
  description: 'Reverse geocode one WGS84 coordinate with the OSMF Nominatim public service.',
  category: 'geocoding',
  options: [
    {
      name: 'latitude',
      flag: '--latitude <number>',
      description: `WGS84 latitude, default ${String(NOMINATIM_DEFAULT_LATITUDE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The reverse endpoint requires a latitude coordinate.',
      valueType: 'string',
      defaultValue: String(NOMINATIM_DEFAULT_LATITUDE),
    },
    {
      name: 'longitude',
      flag: '--longitude <number>',
      description: `WGS84 longitude, default ${String(NOMINATIM_DEFAULT_LONGITUDE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The reverse endpoint requires a longitude coordinate.',
      valueType: 'string',
      defaultValue: String(NOMINATIM_DEFAULT_LONGITUDE),
    },
    {
      name: 'language',
      flag: '--language <code>',
      description: `Accept-Language code, default ${NOMINATIM_DEFAULT_LANGUAGE}`,
      exposure: 'advanced',
      group: 'filters',
      reason: 'Nominatim supports Accept-Language; exposing a short code is useful but secondary to the coordinate query.',
      defaultValue: NOMINATIM_DEFAULT_LANGUAGE,
    },
  ],
  paramsSchema: reverseParamsSchema,
  execute: params => reverseNominatim(params),
  normalizeParams: params => reverseParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNominatimReverseInput(params),
  resultKind: 'nominatim.reverse',
  defaultFormat: 'text',
}

export const nominatimProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nominatim',
    name: 'Nominatim',
    description: 'No-auth OpenStreetMap Nominatim search and reverse geocoding with strict public-service policy guardrails.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://nominatim.org/',
    docsUrl: NOMINATIM_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented public endpoints require no API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'openstreetmap', 'nominatim', 'search', 'reverse-geocoding', 'json', 'no-auth'],
    freePlanNotes: [
      `Usage policy: ${NOMINATIM_POLICY_URL}`,
      'Public service requires a valid User-Agent or Referer, attribution, caching where possible, no autocomplete, and no heavy/bulk use.',
      `CLI limits search results to ${String(NOMINATIM_MAX_LIMIT)}, provides a custom User-Agent, and encourages --persist/--offline replay.`,
    ],
  },
  operations: [searchOperation, reverseOperation],
  endpoints: [
    {
      id: 'nominatim-search',
      method: 'GET',
      urlPattern: 'https://nominatim.openstreetmap.org/search*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'OSMF Nominatim search endpoint returning JSONv2 place candidates.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [NOMINATIM_DOCS_URL, 'https://nominatim.org/release-docs/latest/api/Search/', NOMINATIM_POLICY_URL, 'https://nominatim.openstreetmap.org/search?q=Berlin&format=jsonv2&limit=3'],
      consumedBy: ['public-apis apis run nominatim.search'],
      notes: ['No authentication required.', 'Requires valid User-Agent/Referer and light use under OSMF usage policy.', 'Autocomplete and bulk geocoding are intentionally not exposed.'],
    },
    {
      id: 'nominatim-reverse',
      method: 'GET',
      urlPattern: 'https://nominatim.openstreetmap.org/reverse*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'OSMF Nominatim reverse endpoint returning JSONv2 place details for one coordinate.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [NOMINATIM_DOCS_URL, 'https://nominatim.org/release-docs/latest/api/Reverse/', NOMINATIM_POLICY_URL, 'https://nominatim.openstreetmap.org/reverse?lat=52.5170365&lon=13.3888599&format=jsonv2'],
      consumedBy: ['public-apis apis run nominatim.reverse'],
      notes: ['No authentication required.', 'Requires valid User-Agent/Referer and light use under OSMF usage policy.', 'CLI reverse operation handles one coordinate per request.'],
    },
  ],
}

export type { NominatimReverseInput, NominatimSearchInput } from '../../application/usecases/nominatim.js'
