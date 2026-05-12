import {
  OPEN_TOPO_DATA_DOCS_URL,
  OPEN_TOPO_DATA_MAX_LOCATIONS,
  OpenTopoDataClient,
  normalizeOpenTopoDataLookupInput,
  type OpenTopoDataElevation,
  type OpenTopoDataLookupInput,
} from '../../infrastructure/openApis/openTopoDataClient.js'

export type OpenTopoDataLookupResult = {
  kind: 'opentopodata.lookup'
  api: {
    providerId: 'opentopodata'
    providerName: 'Open Topo Data'
    endpoint: 'GET /v1/{dataset}'
    documentation: typeof OPEN_TOPO_DATA_DOCS_URL
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    rateLimit: 'Public demo server; docs ask users to host their own instance for high-volume use.'
    attribution: 'Elevation datasets retain their source licences; see Open Topo Data dataset documentation.'
  }
  query: ReturnType<typeof normalizeOpenTopoDataLookupInput>
  elevations: OpenTopoDataElevation[]
  pagination: {
    requested: number
    returned: number
    maxLocations: typeof OPEN_TOPO_DATA_MAX_LOCATIONS
  }
}

export async function lookupOpenTopoData(input: OpenTopoDataLookupInput = {}): Promise<OpenTopoDataLookupResult> {
  const query = normalizeOpenTopoDataLookupInput(input)
  const elevations = await new OpenTopoDataClient().lookup(query)
  return {
    kind: 'opentopodata.lookup',
    api: {
      providerId: 'opentopodata',
      providerName: 'Open Topo Data',
      endpoint: 'GET /v1/{dataset}',
      documentation: OPEN_TOPO_DATA_DOCS_URL,
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'HTTPS JSON REST',
      rateLimit: 'Public demo server; docs ask users to host their own instance for high-volume use.',
      attribution: 'Elevation datasets retain their source licences; see Open Topo Data dataset documentation.',
    },
    query,
    elevations,
    pagination: {
      requested: query.points.length,
      returned: elevations.length,
      maxLocations: OPEN_TOPO_DATA_MAX_LOCATIONS,
    },
  }
}

export type { OpenTopoDataLookupInput }
