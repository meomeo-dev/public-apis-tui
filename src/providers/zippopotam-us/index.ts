import { z } from 'zod'
import {
  lookupZippopotamUs,
  searchZippopotamUs,
  type ZippopotamUsLookupInput,
  type ZippopotamUsSearchInput,
} from '../../application/usecases/zippopotamUs.js'
import {
  ZIPPOPOTAM_US_DEFAULT_CITY,
  ZIPPOPOTAM_US_DEFAULT_COUNTRY,
  ZIPPOPOTAM_US_DEFAULT_LIMIT,
  ZIPPOPOTAM_US_DEFAULT_POSTAL_CODE,
  ZIPPOPOTAM_US_DEFAULT_STATE,
  ZIPPOPOTAM_US_DOCS_URL,
  ZIPPOPOTAM_US_MAX_LIMIT,
  normalizeZippopotamUsLookupInput,
  normalizeZippopotamUsSearchInput,
} from '../../infrastructure/openApis/zippopotamUsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  country: z.string().optional(),
  postalCode: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<ZippopotamUsLookupInput>

const searchParamsSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<ZippopotamUsSearchInput>

const lookupOperation: PublicApiOperationDefinition<ZippopotamUsLookupInput> = {
  id: 'zippopotam-us.lookup',
  providerId: 'zippopotam-us',
  name: 'Lookup postal code',
  commandPath: ['zippopotam-us', 'lookup'],
  rpcMethod: 'zippopotam-us.lookup',
  description: 'Look up places for a country/postal-code pair using the no-auth Zippopotam.us HTTPS JSON endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'country',
      flag: '--country <code>',
      description: `ISO alpha-2 country code, default ${ZIPPOPOTAM_US_DEFAULT_COUNTRY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented lookup endpoint requires a country path segment.',
      defaultValue: ZIPPOPOTAM_US_DEFAULT_COUNTRY,
    },
    {
      name: 'postalCode',
      flag: '--postal-code <code>',
      description: `Postal code, default ${ZIPPOPOTAM_US_DEFAULT_POSTAL_CODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented lookup endpoint requires a postal-code path segment.',
      defaultValue: ZIPPOPOTAM_US_DEFAULT_POSTAL_CODE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Places to show, default ${String(ZIPPOPOTAM_US_DEFAULT_LIMIT)}, max ${String(ZIPPOPOTAM_US_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Postal-code lookup can return multiple places; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(ZIPPOPOTAM_US_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupZippopotamUs(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeZippopotamUsLookupInput(params),
  resultKind: 'zippopotam-us.lookup',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<ZippopotamUsSearchInput> = {
  id: 'zippopotam-us.search',
  providerId: 'zippopotam-us',
  name: 'Search city',
  commandPath: ['zippopotam-us', 'search'],
  rpcMethod: 'zippopotam-us.search',
  description: 'Search postal codes by country, state, and city using the no-auth Zippopotam.us HTTPS JSON endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'country',
      flag: '--country <code>',
      description: `ISO alpha-2 country code, default ${ZIPPOPOTAM_US_DEFAULT_COUNTRY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented city-to-zip endpoint requires a country path segment.',
      defaultValue: ZIPPOPOTAM_US_DEFAULT_COUNTRY,
    },
    {
      name: 'state',
      flag: '--state <code>',
      description: `State/region code, default ${ZIPPOPOTAM_US_DEFAULT_STATE}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented city-to-zip endpoint requires a state path segment.',
      defaultValue: ZIPPOPOTAM_US_DEFAULT_STATE,
    },
    {
      name: 'city',
      flag: '--city <name>',
      description: `City/place name, default ${ZIPPOPOTAM_US_DEFAULT_CITY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented city-to-zip endpoint requires a city path segment.',
      defaultValue: ZIPPOPOTAM_US_DEFAULT_CITY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Places to show, default ${String(ZIPPOPOTAM_US_DEFAULT_LIMIT)}, max ${String(ZIPPOPOTAM_US_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'City searches can return many postal codes; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(ZIPPOPOTAM_US_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchZippopotamUs(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeZippopotamUsSearchInput(params),
  resultKind: 'zippopotam-us.search',
  defaultFormat: 'text',
}

export const zippopotamUsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'zippopotam-us',
    name: 'Zippopotam.us',
    description: 'No-auth HTTPS JSON postal-code/place lookup and city-to-postal-code search.',
    publicApisCategory: 'Geocoding',
    homepageUrl: ZIPPOPOTAM_US_DOCS_URL,
    docsUrl: ZIPPOPOTAM_US_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented HTTPS JSON endpoints return data without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'postal-codes', 'places', 'countries', 'json', 'no-auth'],
    freePlanNotes: [
      'CLI exposes only bounded read-only country/postal-code and country/state/city JSON endpoints.',
      'Examples use HTTP, but implementation uses the observed HTTPS API host.',
      'Reference postal/place data only; validate delivery-critical or legal decisions against official postal sources.',
    ],
  },
  operations: [lookupOperation, searchOperation],
  endpoints: [
    {
      id: 'zippopotam-us-postal-code',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.zippopotam\\.us/[A-Za-z]{2}/[^/?#]+$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Zippopotam.us country/postal-code lookup endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [ZIPPOPOTAM_US_DOCS_URL, 'https://api.zippopotam.us/us/90210'],
      consumedBy: ['public-apis apis run zippopotam-us.lookup'],
      notes: ['No authentication required.', '404 responses return empty JSON objects and are mapped to empty place lists.', 'CLI validates path-like inputs before network calls.'],
    },
    {
      id: 'zippopotam-us-city-search',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.zippopotam\\.us/[A-Za-z]{2}/[^/?#]+/[^/?#]+$',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Zippopotam.us country/state/city to postal codes endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [ZIPPOPOTAM_US_DOCS_URL, 'https://api.zippopotam.us/us/ma/belmont'],
      consumedBy: ['public-apis apis run zippopotam-us.search'],
      notes: ['No authentication required.', 'CLI caps returned places and cache payload size.', 'City names with spaces are URL-encoded path segments.'],
    },
  ],
}

export type { ZippopotamUsLookupInput, ZippopotamUsSearchInput } from '../../application/usecases/zippopotamUs.js'
