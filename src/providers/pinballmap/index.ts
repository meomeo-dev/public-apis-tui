import { z } from 'zod'
import { listPinballMapLocations, listPinballMapRegions, type PinballMapLocationsInput, type PinballMapRegionsInput } from '../../application/usecases/pinballMap.js'
import {
  PINBALL_MAP_DEFAULT_LIMIT,
  PINBALL_MAP_DEFAULT_QUERY,
  PINBALL_MAP_DEFAULT_REGION,
  PINBALL_MAP_DOCS_URL,
  PINBALL_MAP_MAX_LIMIT,
  normalizePinballMapLocationsInput,
  normalizePinballMapRegionsInput,
} from '../../infrastructure/openApis/pinballMapClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const regionsParamsSchema = z.object({
  limit: z.number().int().optional(),
  query: z.string().optional(),
}) satisfies z.ZodType<PinballMapRegionsInput>

const locationsParamsSchema = z.object({
  region: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<PinballMapLocationsInput>

const regionsOperation: PublicApiOperationDefinition<PinballMapRegionsInput> = {
  id: 'pinballmap.regions',
  providerId: 'pinballmap',
  name: 'Regions',
  commandPath: ['pinballmap', 'regions'],
  rpcMethod: 'pinballmap.regions',
  description: 'List Pinball Map regions with optional local filtering.',
  category: 'geocoding',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Regions to show, default ${String(PINBALL_MAP_DEFAULT_LIMIT)}, max ${String(PINBALL_MAP_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The regions endpoint returns all regions; CLI caps terminal output and cached payloads.',
      valueType: 'integer',
      defaultValue: String(PINBALL_MAP_DEFAULT_LIMIT),
    },
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Optional local filter by region name, full name, or state',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Filtering locally helps find region slugs without exposing write endpoints.',
    },
  ],
  paramsSchema: regionsParamsSchema,
  execute: params => listPinballMapRegions(params),
  normalizeParams: params => regionsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePinballMapRegionsInput(params),
  resultKind: 'pinballmap.regions',
  defaultFormat: 'text',
}

const locationsOperation: PublicApiOperationDefinition<PinballMapLocationsInput> = {
  id: 'pinballmap.locations',
  providerId: 'pinballmap',
  name: 'Locations',
  commandPath: ['pinballmap', 'locations'],
  rpcMethod: 'pinballmap.locations',
  description: 'List Pinball Map arcade/bar locations in a region using the lightweight no_details response.',
  category: 'geocoding',
  options: [
    {
      name: 'region',
      flag: '--region <slug>',
      description: `Region slug, default ${PINBALL_MAP_DEFAULT_REGION}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented location endpoint requires a Pinball Map region slug for bounded regional searches.',
      defaultValue: PINBALL_MAP_DEFAULT_REGION,
    },
    {
      name: 'query',
      flag: '--query <text>',
      description: `Optional location-name filter, e.g. ${PINBALL_MAP_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Name filtering keeps responses small and useful in terminal output.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Locations to show, default ${String(PINBALL_MAP_DEFAULT_LIMIT)}, max ${String(PINBALL_MAP_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint may return hundreds of locations; the CLI caps output and persistence size.',
      valueType: 'integer',
      defaultValue: String(PINBALL_MAP_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: locationsParamsSchema,
  execute: params => listPinballMapLocations(params),
  normalizeParams: params => locationsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePinballMapLocationsInput(params),
  resultKind: 'pinballmap.locations',
  defaultFormat: 'text',
}

export const pinballMapProvider: PublicApiProviderModule = {
  manifest: {
    id: 'pinballmap',
    name: 'Pinball Map',
    description: 'No-auth HTTPS JSON API for public pinball regions and location listings.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://pinballmap.com/',
    docsUrl: PINBALL_MAP_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented read-only GET endpoints require no API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'pinball', 'locations', 'arcade', 'json', 'no-auth'],
    freePlanNotes: [
      'Docs ask users to include attribution when using Pinball Map data.',
      'CLI exposes read-only GET regions and lightweight no_details locations only.',
      'Suggestion/edit/contact POST/PUT/DELETE endpoints are intentionally not exposed.',
    ],
  },
  operations: [regionsOperation, locationsOperation],
  endpoints: [
    {
      id: 'pinballmap-regions',
      method: 'GET',
      urlPattern: 'https://pinballmap.com/api/v1/regions.json*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Pinball Map regions endpoint returning public region slugs and metadata.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [PINBALL_MAP_DOCS_URL, 'https://pinballmap.com/api/v1/regions.json'],
      consumedBy: ['public-apis apis run pinballmap.regions'],
      notes: ['No authentication required.', 'Docs request attribution when using the data.'],
    },
    {
      id: 'pinballmap-locations',
      method: 'GET',
      urlPattern: 'https://pinballmap.com/api/v1/locations.json*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'Pinball Map region location endpoint using no_details=1 for lightweight location listings.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [PINBALL_MAP_DOCS_URL, 'https://pinballmap.com/api/v1/locations.json?region=portland&by_location_name=ground&no_details=1'],
      consumedBy: ['public-apis apis run pinballmap.locations'],
      notes: ['No authentication required.', 'CLI uses no_details=1 and caps output to avoid large machine-condition payloads.', 'Write/suggest/edit endpoints are intentionally not exposed.'],
    },
  ],
}

export type { PinballMapLocationsInput, PinballMapRegionsInput } from '../../application/usecases/pinballMap.js'
