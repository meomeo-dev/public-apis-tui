import {
  VOIDLY_MAX_LIMIT,
  VOIDLY_MAX_OFFSET,
  VoidlyClient,
  normalizeVoidlyIncidentsInput,
  type VoidlyIncident,
  type VoidlyIncidentsInput,
  type VoidlyRateLimit,
} from '../../infrastructure/openApis/voidlyClient.js'

type VoidlyApiMeta = {
  provider: 'voidly'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  licenseNote: string
  riskBoundary: string
  limitPolicy: string
}

export type VoidlyIncidentsResult = {
  kind: 'voidly.incidents'
  api: VoidlyApiMeta
  query: ReturnType<typeof normalizeVoidlyIncidentsInput>
  count: number
  total?: number | undefined
  datasetVersion?: string | undefined
  generatedAt?: string | undefined
  pagination: {
    returned: number
    limit: number
    offset: number
    maxLimit: number
    maxOffset: number
  }
  rateLimit: VoidlyRateLimit
  incidents: VoidlyIncident[]
}

export async function listVoidlyIncidents(input: VoidlyIncidentsInput = {}): Promise<VoidlyIncidentsResult> {
  const query = normalizeVoidlyIncidentsInput(input)
  const client = new VoidlyClient()
  const response = await client.listIncidents(query)
  return {
    kind: 'voidly.incidents',
    api: {
      provider: 'voidly',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /data/incidents',
      docsUrl: 'https://voidly.ai/api-docs',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      licenseNote: 'Voidly OpenAPI describes free public endpoints under /data/* and /v1/* as CC BY 4.0.',
      riskBoundary: 'Read-only censorship incident metadata only; paid x402, agent messaging, MCP, proxy, and verification/post endpoints are intentionally excluded.',
      limitPolicy: 'CLI caps incidents at 100 rows per request and offset at 1000 for bounded terminal and cache output.',
    },
    query,
    count: response.incidents.length,
    total: response.total,
    datasetVersion: response.datasetVersion,
    generatedAt: response.generatedAt,
    pagination: {
      returned: response.incidents.length,
      limit: query.limit,
      offset: query.offset,
      maxLimit: VOIDLY_MAX_LIMIT,
      maxOffset: VOIDLY_MAX_OFFSET,
    },
    rateLimit: response.rateLimit,
    incidents: response.incidents,
  }
}
