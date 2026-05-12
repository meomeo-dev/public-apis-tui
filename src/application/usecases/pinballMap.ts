import {
  PINBALL_MAP_DOCS_URL,
  PINBALL_MAP_MAX_LIMIT,
  PinballMapClient,
  normalizePinballMapLocationsInput,
  normalizePinballMapRegionsInput,
  type PinballMapLocation,
  type PinballMapLocationsInput,
  type PinballMapRegion,
  type PinballMapRegionsInput,
} from '../../infrastructure/openApis/pinballMapClient.js'

type PinballMapApiMeta = {
  providerId: 'pinballmap'
  providerName: 'Pinball Map'
  endpoint: string
  documentation: typeof PINBALL_MAP_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  attribution: 'Pinball Map asks API users to include attribution when using the data.'
  writeBoundary: 'CLI exposes read-only GET endpoints only; suggestion/edit POST/PUT/DELETE endpoints are not exposed.'
}

function api(endpoint: string): PinballMapApiMeta {
  return {
    providerId: 'pinballmap',
    providerName: 'Pinball Map',
    endpoint,
    documentation: PINBALL_MAP_DOCS_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    attribution: 'Pinball Map asks API users to include attribution when using the data.',
    writeBoundary: 'CLI exposes read-only GET endpoints only; suggestion/edit POST/PUT/DELETE endpoints are not exposed.',
  }
}

export type PinballMapRegionsResult = {
  kind: 'pinballmap.regions'
  api: PinballMapApiMeta
  query: ReturnType<typeof normalizePinballMapRegionsInput>
  regions: PinballMapRegion[]
  pagination: { returned: number; limit: number; maxLimit: typeof PINBALL_MAP_MAX_LIMIT }
}

export type PinballMapLocationsResult = {
  kind: 'pinballmap.locations'
  api: PinballMapApiMeta
  query: ReturnType<typeof normalizePinballMapLocationsInput>
  locations: PinballMapLocation[]
  pagination: { returned: number; limit: number; maxLimit: typeof PINBALL_MAP_MAX_LIMIT; noDetails: true }
}

export async function listPinballMapRegions(input: PinballMapRegionsInput = {}): Promise<PinballMapRegionsResult> {
  const query = normalizePinballMapRegionsInput(input)
  const regions = await new PinballMapClient().listRegions(query)
  return {
    kind: 'pinballmap.regions',
    api: api('GET /api/v1/regions.json'),
    query,
    regions,
    pagination: { returned: regions.length, limit: query.limit, maxLimit: PINBALL_MAP_MAX_LIMIT },
  }
}

export async function listPinballMapLocations(input: PinballMapLocationsInput = {}): Promise<PinballMapLocationsResult> {
  const query = normalizePinballMapLocationsInput(input)
  const locations = await new PinballMapClient().listLocations(query)
  return {
    kind: 'pinballmap.locations',
    api: api('GET /api/v1/locations.json'),
    query,
    locations,
    pagination: { returned: locations.length, limit: query.limit, maxLimit: PINBALL_MAP_MAX_LIMIT, noDetails: true },
  }
}

export type { PinballMapLocationsInput, PinballMapRegionsInput }
