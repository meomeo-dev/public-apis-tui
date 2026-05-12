import { z } from 'zod'
import {
  lookupPostcodesIo,
  nearestPostcodesIo,
  searchPostcodesIo,
  type PostcodesIoLookupInput,
  type PostcodesIoNearestInput,
  type PostcodesIoSearchInput,
} from '../../application/usecases/postcodesIo.js'
import {
  POSTCODES_IO_DEFAULT_LATITUDE,
  POSTCODES_IO_DEFAULT_LIMIT,
  POSTCODES_IO_DEFAULT_LONGITUDE,
  POSTCODES_IO_DEFAULT_POSTCODE,
  POSTCODES_IO_DEFAULT_QUERY,
  POSTCODES_IO_DOCS_URL,
  POSTCODES_IO_MAX_LIMIT,
  normalizePostcodesIoLookupInput,
  normalizePostcodesIoNearestInput,
  normalizePostcodesIoSearchInput,
} from '../../infrastructure/openApis/postcodesIoClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  postcode: z.string().optional(),
}) satisfies z.ZodType<PostcodesIoLookupInput>

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<PostcodesIoSearchInput>

const nearestParamsSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  limit: z.coerce.number().int().optional(),
  radius: z.coerce.number().int().optional(),
}) satisfies z.ZodType<PostcodesIoNearestInput>

const lookupOperation: PublicApiOperationDefinition<PostcodesIoLookupInput> = {
  id: 'postcodes-io.lookup',
  providerId: 'postcodes-io',
  name: 'Lookup postcode',
  commandPath: ['postcodes-io', 'lookup'],
  rpcMethod: 'postcodes-io.lookup',
  description: 'Look up a UK postcode via the no-auth HTTPS JSON Postcodes.io endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'postcode',
      flag: '--postcode <code>',
      description: `UK postcode, default ${POSTCODES_IO_DEFAULT_POSTCODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented lookup endpoint requires a postcode path segment.',
      defaultValue: POSTCODES_IO_DEFAULT_POSTCODE,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupPostcodesIo(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePostcodesIoLookupInput(params),
  resultKind: 'postcodes-io.lookup',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<PostcodesIoSearchInput> = {
  id: 'postcodes-io.search',
  providerId: 'postcodes-io',
  name: 'Search postcodes',
  commandPath: ['postcodes-io', 'search'],
  rpcMethod: 'postcodes-io.search',
  description: 'Search UK postcodes by a postcode fragment using the no-auth HTTPS JSON endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <fragment>',
      description: `Postcode fragment, default ${POSTCODES_IO_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented search endpoint requires a q query parameter.',
      defaultValue: POSTCODES_IO_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Postcodes to show, default ${String(POSTCODES_IO_DEFAULT_LIMIT)}, max ${String(POSTCODES_IO_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Search can return many records; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(POSTCODES_IO_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchPostcodesIo(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePostcodesIoSearchInput(params),
  resultKind: 'postcodes-io.search',
  defaultFormat: 'text',
}

const nearestOperation: PublicApiOperationDefinition<PostcodesIoNearestInput> = {
  id: 'postcodes-io.nearest',
  providerId: 'postcodes-io',
  name: 'Nearest postcodes',
  commandPath: ['postcodes-io', 'nearest'],
  rpcMethod: 'postcodes-io.nearest',
  description: 'Find nearest UK postcodes to explicit WGS84 coordinates using the no-auth HTTPS JSON endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'latitude',
      flag: '--latitude <number>',
      description: `WGS84 latitude, default ${String(POSTCODES_IO_DEFAULT_LATITUDE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Nearest-postcode lookup requires explicit latitude.',
      defaultValue: String(POSTCODES_IO_DEFAULT_LATITUDE),
    },
    {
      name: 'longitude',
      flag: '--longitude <number>',
      description: `WGS84 longitude, default ${String(POSTCODES_IO_DEFAULT_LONGITUDE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Nearest-postcode lookup requires explicit longitude.',
      defaultValue: String(POSTCODES_IO_DEFAULT_LONGITUDE),
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Postcodes to show, default ${String(POSTCODES_IO_DEFAULT_LIMIT)}, max ${String(POSTCODES_IO_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The upstream nearest endpoint can return many records; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(POSTCODES_IO_DEFAULT_LIMIT),
    },
    {
      name: 'radius',
      flag: '--radius <meters>',
      description: 'Optional radius in metres, max 2000',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Radius is documented for nearest searches and is bounded locally for predictable public API use.',
      valueType: 'integer',
      defaultValue: '',
    },
  ],
  paramsSchema: nearestParamsSchema,
  execute: params => nearestPostcodesIo(params),
  normalizeParams: params => nearestParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePostcodesIoNearestInput(params),
  resultKind: 'postcodes-io.nearest',
  defaultFormat: 'text',
}

export const postcodesIoProvider: PublicApiProviderModule = {
  manifest: {
    id: 'postcodes-io',
    name: 'Postcodes.io',
    description: 'No-auth HTTPS JSON UK postcode lookup, search, and nearest-postcode geocoding.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://postcodes.io',
    docsUrl: POSTCODES_IO_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented GET endpoints return JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'postal-codes', 'uk', 'addresses', 'search', 'json', 'no-auth'],
    freePlanNotes: [
      'CLI exposes only bounded read-only lookup/search/nearest GET endpoints.',
      'Bulk POST, autocomplete, random postcode, and outcode/terminated postcode surfaces are intentionally out of scope for this pass.',
      'Reference/geocoding data only; validate delivery-critical decisions against official postal or address sources.',
    ],
  },
  operations: [lookupOperation, searchOperation, nearestOperation],
  endpoints: [
    {
      id: 'postcodes-io-postcode-lookup',
      method: 'GET',
      urlPattern: 'https://api.postcodes.io/postcodes/*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Postcodes.io single UK postcode lookup endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [POSTCODES_IO_DOCS_URL, 'https://api.postcodes.io/postcodes/SW1A%202AA'],
      consumedBy: ['public-apis apis run postcodes-io.lookup'],
      notes: ['No authentication required.', 'Returns JSON status/result envelope.', '404 invalid-postcode envelopes are mapped to empty lookup results.'],
    },
    {
      id: 'postcodes-io-postcode-search',
      method: 'GET',
      urlPattern: 'https://api.postcodes.io/postcodes?q=*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Postcodes.io postcode fragment search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [POSTCODES_IO_DOCS_URL, 'https://api.postcodes.io/postcodes?q=SW1A'],
      consumedBy: ['public-apis apis run postcodes-io.search'],
      notes: ['No authentication required.', 'CLI caps returned records to avoid raw large payload dumps.'],
    },
    {
      id: 'postcodes-io-nearest-postcodes',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.postcodes\\.io/postcodes\\?(?:.*&)?lat=[^&]+&lon=[^&]+(?:&.*)?$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Postcodes.io nearest postcodes by WGS84 coordinates endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [POSTCODES_IO_DOCS_URL, 'https://api.postcodes.io/postcodes?lon=-0.1278&lat=51.5074'],
      consumedBy: ['public-apis apis run postcodes-io.nearest'],
      notes: ['No authentication required.', 'Requires explicit coordinates; no current-client geolocation is used.'],
    },
  ],
}

export type { PostcodesIoLookupInput, PostcodesIoNearestInput, PostcodesIoSearchInput } from '../../application/usecases/postcodesIo.js'
