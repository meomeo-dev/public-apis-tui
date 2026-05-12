import {
  MF_API_DEFAULT_LIMIT,
  MF_API_MAX_LIMIT,
  MfApiClient,
  normalizeMfApiLatestInput,
  normalizeMfApiSearchInput,
  type MfApiLatestInput,
  type MfApiNavPoint,
  type MfApiSchemeSummary,
  type MfApiSearchInput,
} from '../../infrastructure/openApis/mfApiClient.js'

export type MfApiSearchResult = {
  kind: 'mfapi.search'
  api: MfApiApiMeta
  query: ReturnType<typeof normalizeMfApiSearchInput>
  count: number
  schemes: MfApiSchemeSummary[]
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

export type MfApiLatestResult = {
  kind: 'mfapi.latest'
  api: MfApiApiMeta
  query: ReturnType<typeof normalizeMfApiLatestInput>
  fund: {
    fundHouse?: string | undefined
    schemeType?: string | undefined
    schemeCategory?: string | undefined
    schemeCode?: number | undefined
    schemeName?: string | undefined
    isinGrowth?: string | undefined
    isinDivReinvestment?: string | undefined
  }
  nav: MfApiNavPoint | undefined
  status?: string | undefined
  count: number
}

type MfApiApiMeta = {
  provider: 'mfapi'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  documentedMaximumResult: string
}

const commonApiMeta = {
  provider: 'mfapi',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://www.mfapi.in/docs/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  documentedMaximumResult: `MFapi search has no documented result cap; CLI defaults/caps display and cache keys at ${MF_API_DEFAULT_LIMIT}.`,
} satisfies Omit<MfApiApiMeta, 'endpoint'>

export async function searchMfApiSchemes(input: MfApiSearchInput = {}): Promise<MfApiSearchResult> {
  const query = normalizeMfApiSearchInput(input)
  const client = new MfApiClient()
  const schemes = await client.searchSchemes(query)
  return {
    kind: 'mfapi.search',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /mf/search',
    },
    query,
    count: schemes.length,
    schemes,
    pagination: {
      returned: schemes.length,
      limit: query.limit,
      maxLimit: MF_API_MAX_LIMIT,
    },
  }
}

export async function getMfApiLatest(input: MfApiLatestInput = {}): Promise<MfApiLatestResult> {
  const query = normalizeMfApiLatestInput(input)
  const client = new MfApiClient()
  const latest = await client.getLatest(query)
  return {
    kind: 'mfapi.latest',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /mf/{schemeCode}/latest',
    },
    query,
    fund: latest.meta,
    nav: latest.data[0],
    status: latest.status,
    count: latest.data.length,
  }
}
