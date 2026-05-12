import {
  BdApisClient,
  BD_APIS_MAX_LIMIT,
  BD_APIS_VERSION,
  normalizeBdApisDistrictInput,
  normalizeBdApisDivisionInput,
  normalizeBdApisListInput,
  type BdApisDistrict,
  type BdApisDistrictInput,
  type BdApisDivision,
  type BdApisDivisionInput,
  type BdApisListInput,
} from '../../infrastructure/openApis/bdApisClient.js'

export type BdApisDivisionsResult = {
  kind: 'bdapis.divisions'
  api: BdApisApiMeta
  query: ReturnType<typeof normalizeBdApisListInput>
  pagination: BdApisPagination
  rateLimit: BdApisRateLimit
  divisions: BdApisDivision[]
}

export type BdApisDistrictsResult = {
  kind: 'bdapis.districts'
  api: BdApisApiMeta
  query: ReturnType<typeof normalizeBdApisListInput>
  pagination: BdApisPagination
  rateLimit: BdApisRateLimit
  districts: BdApisDistrict[]
}

export type BdApisDivisionResult = {
  kind: 'bdapis.division'
  api: BdApisApiMeta
  query: ReturnType<typeof normalizeBdApisDivisionInput>
  pagination: BdApisPagination
  rateLimit: BdApisRateLimit
  districts: BdApisDistrict[]
}

export type BdApisDistrictResult = {
  kind: 'bdapis.district'
  api: BdApisApiMeta
  query: ReturnType<typeof normalizeBdApisDistrictInput>
  rateLimit: BdApisRateLimit
  district?: BdApisDistrict | undefined
}

type BdApisApiMeta = {
  providerId: 'bdapis'
  providerName: 'BdAPIs'
  endpoint: 'GET /api/v1.2/divisions' | 'GET /api/v1.2/districts' | 'GET /api/v1.2/division/{division}' | 'GET /api/v1.2/district/{district}'
  documentation: 'https://bdapis.com/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  version: typeof BD_APIS_VERSION
  source: 'BD API public v1.2 endpoints for Bangladesh administrative geography.'
}

type BdApisPagination = {
  returned: number
  limit: number
  maxLimit: number
}

type BdApisRateLimit = {
  observed: 'RateLimit-Policy: 100;w=900 and RateLimit-Limit: 100 observed in live probes.'
}

const commonApiMeta = {
  providerId: 'bdapis',
  providerName: 'BdAPIs',
  documentation: 'https://bdapis.com/',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  version: BD_APIS_VERSION,
  source: 'BD API public v1.2 endpoints for Bangladesh administrative geography.',
} satisfies Omit<BdApisApiMeta, 'endpoint'>

const rateLimit = {
  observed: 'RateLimit-Policy: 100;w=900 and RateLimit-Limit: 100 observed in live probes.',
} satisfies BdApisRateLimit

export async function listBdApisDivisions(input: BdApisListInput = {}): Promise<BdApisDivisionsResult> {
  const query = normalizeBdApisListInput(input)
  const divisions = await new BdApisClient().listDivisions(query)
  return {
    kind: 'bdapis.divisions',
    api: { ...commonApiMeta, endpoint: 'GET /api/v1.2/divisions' },
    query,
    pagination: { returned: divisions.length, limit: query.limit, maxLimit: BD_APIS_MAX_LIMIT },
    rateLimit,
    divisions,
  }
}

export async function listBdApisDistricts(input: BdApisListInput = {}): Promise<BdApisDistrictsResult> {
  const query = normalizeBdApisListInput(input)
  const districts = await new BdApisClient().listDistricts(query)
  return {
    kind: 'bdapis.districts',
    api: { ...commonApiMeta, endpoint: 'GET /api/v1.2/districts' },
    query,
    pagination: { returned: districts.length, limit: query.limit, maxLimit: BD_APIS_MAX_LIMIT },
    rateLimit,
    districts,
  }
}

export async function listBdApisDivisionDistricts(input: BdApisDivisionInput = {}): Promise<BdApisDivisionResult> {
  const query = normalizeBdApisDivisionInput(input)
  const districts = await new BdApisClient().listDivisionDistricts(query)
  return {
    kind: 'bdapis.division',
    api: { ...commonApiMeta, endpoint: 'GET /api/v1.2/division/{division}' },
    query,
    pagination: { returned: districts.length, limit: query.limit, maxLimit: BD_APIS_MAX_LIMIT },
    rateLimit,
    districts,
  }
}

export async function getBdApisDistrict(input: BdApisDistrictInput = {}): Promise<BdApisDistrictResult> {
  const query = normalizeBdApisDistrictInput(input)
  const district = await new BdApisClient().getDistrict(query)
  return {
    kind: 'bdapis.district',
    api: { ...commonApiMeta, endpoint: 'GET /api/v1.2/district/{district}' },
    query,
    rateLimit,
    ...(district !== undefined ? { district } : {}),
  }
}

export type { BdApisDistrictInput, BdApisDivisionInput, BdApisListInput }
