import { z } from 'zod'
import {
  getBdApisDistrict,
  listBdApisDistricts,
  listBdApisDivisionDistricts,
  listBdApisDivisions,
  type BdApisDistrictInput,
  type BdApisDivisionInput,
  type BdApisListInput,
} from '../../application/usecases/bdApis.js'
import {
  BD_APIS_DEFAULT_DISTRICT,
  BD_APIS_DEFAULT_DIVISION,
  BD_APIS_DEFAULT_LIMIT,
  BD_APIS_MAX_LIMIT,
  normalizeBdApisDistrictInput,
  normalizeBdApisDivisionInput,
  normalizeBdApisListInput,
} from '../../infrastructure/openApis/bdApisClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const listParamsSchema = z.object({
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<BdApisListInput>

const divisionParamsSchema = z.object({
  division: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<BdApisDivisionInput>

const districtParamsSchema = z.object({
  district: z.string().optional(),
}) satisfies z.ZodType<BdApisDistrictInput>

const divisionsOperation: PublicApiOperationDefinition<BdApisListInput> = {
  id: 'bdapis.divisions',
  providerId: 'bdapis',
  name: 'Divisions',
  commandPath: ['bdapis', 'divisions'],
  rpcMethod: 'bdapis.divisions',
  description: 'List Bangladesh divisions from BdAPIs v1.2.',
  category: 'geocoding',
  options: [limitOption('divisions')],
  paramsSchema: listParamsSchema,
  execute: params => listBdApisDivisions(params),
  normalizeParams: params => listParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBdApisListInput(params),
  resultKind: 'bdapis.divisions',
  defaultFormat: 'text',
}

const districtsOperation: PublicApiOperationDefinition<BdApisListInput> = {
  id: 'bdapis.districts',
  providerId: 'bdapis',
  name: 'Districts',
  commandPath: ['bdapis', 'districts'],
  rpcMethod: 'bdapis.districts',
  description: 'List Bangladesh districts from BdAPIs v1.2.',
  category: 'geocoding',
  options: [limitOption('districts')],
  paramsSchema: listParamsSchema,
  execute: params => listBdApisDistricts(params),
  normalizeParams: params => listParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBdApisListInput(params),
  resultKind: 'bdapis.districts',
  defaultFormat: 'text',
}

const divisionOperation: PublicApiOperationDefinition<BdApisDivisionInput> = {
  id: 'bdapis.division',
  providerId: 'bdapis',
  name: 'Division districts',
  commandPath: ['bdapis', 'division'],
  rpcMethod: 'bdapis.division',
  description: 'List districts and upazillas for one Bangladesh division.',
  category: 'geocoding',
  options: [
    {
      name: 'division',
      flag: '--division <slug>',
      description: `Division slug, default ${BD_APIS_DEFAULT_DIVISION}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented /division/{division} endpoint selects one Bangladesh division by slug.',
      defaultValue: BD_APIS_DEFAULT_DIVISION,
    },
    limitOption('division districts'),
  ],
  paramsSchema: divisionParamsSchema,
  execute: params => listBdApisDivisionDistricts(params),
  normalizeParams: params => divisionParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBdApisDivisionInput(params),
  resultKind: 'bdapis.division',
  defaultFormat: 'text',
}

const districtOperation: PublicApiOperationDefinition<BdApisDistrictInput> = {
  id: 'bdapis.district',
  providerId: 'bdapis',
  name: 'District detail',
  commandPath: ['bdapis', 'district'],
  rpcMethod: 'bdapis.district',
  description: 'Read one Bangladesh district with upazillas from BdAPIs v1.2.',
  category: 'geocoding',
  options: [
    {
      name: 'district',
      flag: '--district <slug>',
      description: `District slug, default ${BD_APIS_DEFAULT_DISTRICT}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented /district/{district} endpoint selects one Bangladesh district by slug.',
      defaultValue: BD_APIS_DEFAULT_DISTRICT,
    },
  ],
  paramsSchema: districtParamsSchema,
  execute: params => getBdApisDistrict(params),
  normalizeParams: params => districtParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBdApisDistrictInput(params),
  resultKind: 'bdapis.district',
  defaultFormat: 'text',
}

export const bdApisProvider: PublicApiProviderModule = {
  manifest: {
    id: 'bdapis',
    name: 'BdAPIs',
    description: 'No-auth HTTPS JSON API for Bangladesh divisions, districts, and upazillas.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://bdapis.com/',
    docsUrl: 'https://bdapis.com/',
    auth: {
      mode: 'none',
      notes: ['The implemented v1.2 endpoints return JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'bangladesh', 'administrative-divisions', 'districts', 'upazillas', 'json', 'no-auth'],
    freePlanNotes: [
      'Homepage notes v1.2 is the current version and v1.0/v1.1 are deprecated.',
      'Live probes observed RateLimit-Policy: 100;w=900 and Access-Control-Allow-Origin: *.',
      'CLI exposes curated read-only administrative geography endpoints and bounds list output to 64 rows.',
    ],
  },
  operations: [divisionsOperation, districtsOperation, divisionOperation, districtOperation],
  endpoints: [
    endpoint('bdapis-divisions', 'https://bdapis.com/api/v1.2/divisions', 'BdAPIs v1.2 divisions JSON endpoint.', ['public-apis apis run bdapis.divisions']),
    endpoint('bdapis-districts', 'https://bdapis.com/api/v1.2/districts', 'BdAPIs v1.2 districts JSON endpoint.', ['public-apis apis run bdapis.districts']),
    endpoint('bdapis-division', 'https://bdapis.com/api/v1.2/division/{division}', 'BdAPIs v1.2 per-division districts/upazillas JSON endpoint.', ['public-apis apis run bdapis.division']),
    endpoint('bdapis-district', 'https://bdapis.com/api/v1.2/district/{district}', 'BdAPIs v1.2 per-district upazillas JSON endpoint.', ['public-apis apis run bdapis.district']),
  ],
}

function limitOption(label: string) {
  return {
    name: 'limit',
    flag: '--limit <count>',
    description: `Maximum ${label} to return, default ${String(BD_APIS_DEFAULT_LIMIT)}, max ${String(BD_APIS_MAX_LIMIT)}`,
    exposure: 'primary' as const,
    group: 'pagination' as const,
    reason: 'BdAPIs list responses are finite; a CLI limit keeps terminal output bounded while JSON records pagination metadata.',
    valueType: 'integer' as const,
    defaultValue: String(BD_APIS_DEFAULT_LIMIT),
  }
}

function endpoint(id: string, urlPattern: string, description: string, consumedBy: string[]) {
  return {
    id,
    method: 'GET' as const,
    urlPattern,
    category: 'public-apis:geocoding',
    evidenceStatus: 'confirmed' as const,
    description,
    siteIds: ['public-apis-tui'],
    observedOn: '2026-05-08',
    sampleSources: ['https://bdapis.com/', urlPattern.replace('{division}', 'dhaka').replace('{district}', 'dhaka')],
    consumedBy,
    notes: ['No authentication required.', 'Returns application/json with status and data fields.', 'v1.2 is used because the homepage marks v1.1 as deprecated.'],
  }
}

export type { BdApisDistrictInput, BdApisDivisionInput, BdApisListInput } from '../../application/usecases/bdApis.js'
