import {
  GeoApiClient,
  GEO_API_MAX_LIMIT,
  normalizeGeoApiCommunesInput,
  normalizeGeoApiDepartmentsInput,
  normalizeGeoApiRegionsInput,
  type GeoApiCommune,
  type GeoApiCommunesInput,
  type GeoApiDepartment,
  type GeoApiDepartmentsInput,
  type GeoApiRegion,
  type GeoApiRegionsInput,
} from '../../infrastructure/openApis/geoApiClient.js'

type GeoApiMeta = {
  providerId: 'geoapi'
  providerName: 'GeoApi'
  endpoint: 'GET /communes' | 'GET /departements' | 'GET /regions'
  documentation: 'https://geo.api.gouv.fr/'
  legacyCatalogUrl: 'https://api.gouv.fr/api/geoapi.html'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  owner: 'French government / geo.api.gouv.fr'
  limitPolicy: 'CLI caps list output at 50 rows for terminal readability and offline cache size.'
}

const baseMeta = {
  providerId: 'geoapi',
  providerName: 'GeoApi',
  documentation: 'https://geo.api.gouv.fr/',
  legacyCatalogUrl: 'https://api.gouv.fr/api/geoapi.html',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  owner: 'French government / geo.api.gouv.fr',
  limitPolicy: 'CLI caps list output at 50 rows for terminal readability and offline cache size.',
} satisfies Omit<GeoApiMeta, 'endpoint'>

export type GeoApiCommunesResult = {
  kind: 'geoapi.communes'
  api: GeoApiMeta
  query: ReturnType<typeof normalizeGeoApiCommunesInput>
  pagination: { returned: number; limit: number; maxLimit: typeof GEO_API_MAX_LIMIT }
  communes: GeoApiCommune[]
}

export type GeoApiDepartmentsResult = {
  kind: 'geoapi.departments'
  api: GeoApiMeta
  query: ReturnType<typeof normalizeGeoApiDepartmentsInput>
  pagination: { returned: number; limit: number; maxLimit: typeof GEO_API_MAX_LIMIT }
  departments: GeoApiDepartment[]
}

export type GeoApiRegionsResult = {
  kind: 'geoapi.regions'
  api: GeoApiMeta
  query: ReturnType<typeof normalizeGeoApiRegionsInput>
  pagination: { returned: number; limit: number; maxLimit: typeof GEO_API_MAX_LIMIT }
  regions: GeoApiRegion[]
}

export async function listGeoApiCommunes(input: GeoApiCommunesInput = {}): Promise<GeoApiCommunesResult> {
  const query = normalizeGeoApiCommunesInput(input)
  const communes = await new GeoApiClient().listCommunes(query)
  return {
    kind: 'geoapi.communes',
    api: { ...baseMeta, endpoint: 'GET /communes' },
    query,
    pagination: { returned: communes.length, limit: query.limit, maxLimit: GEO_API_MAX_LIMIT },
    communes,
  }
}

export async function listGeoApiDepartments(input: GeoApiDepartmentsInput = {}): Promise<GeoApiDepartmentsResult> {
  const query = normalizeGeoApiDepartmentsInput(input)
  const departments = await new GeoApiClient().listDepartments(query)
  return {
    kind: 'geoapi.departments',
    api: { ...baseMeta, endpoint: 'GET /departements' },
    query,
    pagination: { returned: departments.length, limit: query.limit, maxLimit: GEO_API_MAX_LIMIT },
    departments,
  }
}

export async function listGeoApiRegions(input: GeoApiRegionsInput = {}): Promise<GeoApiRegionsResult> {
  const query = normalizeGeoApiRegionsInput(input)
  const regions = await new GeoApiClient().listRegions(query)
  return {
    kind: 'geoapi.regions',
    api: { ...baseMeta, endpoint: 'GET /regions' },
    query,
    pagination: { returned: regions.length, limit: query.limit, maxLimit: GEO_API_MAX_LIMIT },
    regions,
  }
}

export type { GeoApiCommunesInput, GeoApiDepartmentsInput, GeoApiRegionsInput }
