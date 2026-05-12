import { z } from 'zod'
import { listGeoApiCommunes, listGeoApiDepartments, listGeoApiRegions, type GeoApiCommunesInput, type GeoApiDepartmentsInput, type GeoApiRegionsInput } from '../../application/usecases/geoApi.js'
import { GEO_API_DEFAULT_COMMUNE_QUERY, GEO_API_DEFAULT_LIMIT, GEO_API_MAX_LIMIT, normalizeGeoApiCommunesInput, normalizeGeoApiDepartmentsInput, normalizeGeoApiRegionsInput } from '../../infrastructure/openApis/geoApiClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const communesParamsSchema = z.object({
  query: z.string().optional(),
  postalCode: z.string().optional(),
  departmentCode: z.string().optional(),
  regionCode: z.string().optional(),
  limit: z.coerce.number().int().optional(),
  includeGeometry: z.coerce.boolean().optional(),
}) satisfies z.ZodType<GeoApiCommunesInput>

const departmentsParamsSchema = z.object({
  regionCode: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<GeoApiDepartmentsInput>

const regionsParamsSchema = z.object({
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<GeoApiRegionsInput>

const communesOperation: PublicApiOperationDefinition<GeoApiCommunesInput> = {
  id: 'geoapi.communes',
  providerId: 'geoapi',
  name: 'Communes',
  commandPath: ['geoapi', 'communes'],
  rpcMethod: 'geoapi.communes',
  description: 'Search French communes by name, postal code, department, or region using geo.api.gouv.fr.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <name>',
      description: `Commune name search, default ${GEO_API_DEFAULT_COMMUNE_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Name search is the safest default for terminal users and avoids raw query strings.',
      defaultValue: GEO_API_DEFAULT_COMMUNE_QUERY,
    },
    {
      name: 'postalCode',
      flag: '--postal-code <code>',
      description: 'Optional five-digit postal code filter, for example 75001',
      exposure: 'primary',
      group: 'filters',
      reason: 'Postal code lookup is a documented high-value Geo API filter.',
    },
    {
      name: 'departmentCode',
      flag: '--department-code <code>',
      description: 'Optional department code filter, for example 75 or 2A',
      exposure: 'primary',
      group: 'filters',
      reason: 'Department filtering keeps geographic list queries bounded and useful.',
    },
    {
      name: 'regionCode',
      flag: '--region-code <code>',
      description: 'Optional region code filter, for example 11',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Region filtering can return broad lists, so output remains capped by --limit.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to request, default ${GEO_API_DEFAULT_LIMIT}, cap ${GEO_API_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Geo API can return large lists; 50 rows keeps terminal output and cache size bounded.',
      valueType: 'integer',
      defaultValue: String(GEO_API_DEFAULT_LIMIT),
    },
    {
      name: 'includeGeometry',
      flag: '--include-geometry <true|false>',
      description: 'Include commune centre longitude/latitude, default false',
      exposure: 'advanced',
      group: 'content',
      reason: 'Centre coordinates are useful for GIS workflows but omitted by default for concise text output.',
      valueType: 'boolean',
      defaultValue: 'false',
    },
  ],
  paramsSchema: communesParamsSchema,
  execute: params => listGeoApiCommunes(params),
  normalizeParams: params => communesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGeoApiCommunesInput(params),
  resultKind: 'geoapi.communes',
  defaultFormat: 'text',
}

const departmentsOperation: PublicApiOperationDefinition<GeoApiDepartmentsInput> = {
  id: 'geoapi.departments',
  providerId: 'geoapi',
  name: 'Departments',
  commandPath: ['geoapi', 'departments'],
  rpcMethod: 'geoapi.departments',
  description: 'List French departments, optionally filtered by region code.',
  category: 'geocoding',
  options: [
    {
      name: 'regionCode',
      flag: '--region-code <code>',
      description: 'Optional region code filter, for example 11',
      exposure: 'primary',
      group: 'filters',
      reason: 'Region code is the documented safe filter for department lists.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to show, default ${GEO_API_DEFAULT_LIMIT}, cap ${GEO_API_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Department lists are finite but capped for consistent terminal rendering.',
      valueType: 'integer',
      defaultValue: String(GEO_API_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: departmentsParamsSchema,
  execute: params => listGeoApiDepartments(params),
  normalizeParams: params => departmentsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGeoApiDepartmentsInput(params),
  resultKind: 'geoapi.departments',
  defaultFormat: 'text',
}

const regionsOperation: PublicApiOperationDefinition<GeoApiRegionsInput> = {
  id: 'geoapi.regions',
  providerId: 'geoapi',
  name: 'Regions',
  commandPath: ['geoapi', 'regions'],
  rpcMethod: 'geoapi.regions',
  description: 'List French regions using geo.api.gouv.fr.',
  category: 'geocoding',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to show, default ${GEO_API_DEFAULT_LIMIT}, cap ${GEO_API_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Region list is finite but capped for consistent terminal rendering and cache keys.',
      valueType: 'integer',
      defaultValue: String(GEO_API_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: regionsParamsSchema,
  execute: params => listGeoApiRegions(params),
  normalizeParams: params => regionsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGeoApiRegionsInput(params),
  resultKind: 'geoapi.regions',
  defaultFormat: 'text',
}

export const geoApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'geoapi',
    name: 'GeoApi',
    description: 'No-auth French government geographic reference API for communes, departments, and regions.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://geo.api.gouv.fr/',
    docsUrl: 'https://geo.api.gouv.fr/',
    auth: {
      mode: 'none',
      notes: ['Implemented geo.api.gouv.fr endpoints return JSON without API keys, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['geocoding', 'france', 'government', 'communes', 'departments', 'regions', 'json', 'no-auth'],
    freePlanNotes: [
      'The public-apis catalog URL at api.gouv.fr currently has TLS hostname mismatch from this runner; the active official service is https://geo.api.gouv.fr/.',
      'CLI exposes documented filters only and does not expose arbitrary raw fields, geometry, or upstream query strings.',
      'List output is capped at 50 rows for terminal readability and offline persistence.',
    ],
  },
  operations: [communesOperation, departmentsOperation, regionsOperation],
  endpoints: [
    {
      id: 'geoapi-communes',
      method: 'GET',
      urlPattern: 'https://geo.api.gouv.fr/communes',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'French communes search/list endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://geo.api.gouv.fr/', 'https://geo.api.gouv.fr/communes?nom=paris&fields=nom,code,codesPostaux,centre,departement,region,population&format=json&geometry=centre&limit=5'],
      consumedBy: ['public-apis apis run geoapi.communes'],
      notes: ['No authentication required.', 'CLI exposes curated name/postal/department/region filters only.'],
    },
    {
      id: 'geoapi-departments',
      method: 'GET',
      urlPattern: 'https://geo.api.gouv.fr/departements',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'French departments list endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://geo.api.gouv.fr/departements?fields=nom,code,region&format=json'],
      consumedBy: ['public-apis apis run geoapi.departments'],
      notes: ['No authentication required.', 'Region-specific endpoint /regions/{code}/departements is used when --region-code is provided.'],
    },
    {
      id: 'geoapi-regions',
      method: 'GET',
      urlPattern: 'https://geo.api.gouv.fr/regions',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'French regions list endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://geo.api.gouv.fr/regions?fields=nom,code&format=json'],
      consumedBy: ['public-apis apis run geoapi.regions'],
      notes: ['No authentication required.'],
    },
  ],
}

export type { GeoApiCommunesInput, GeoApiDepartmentsInput, GeoApiRegionsInput } from '../../application/usecases/geoApi.js'
