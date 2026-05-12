import {
  MsrcClient,
  MSRC_DEFAULT_ORDER,
  MSRC_MAX_LIMIT,
  normalizeMsrcVulnerabilitiesInput,
  type MsrcVulnerabilitiesInput,
  type MsrcVulnerability,
} from '../../infrastructure/openApis/msrcClient.js'

type MsrcApiMeta = {
  provider: 'msrc'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON OData'
  platform: 'Microsoft Security Update Guide API v2.0'
  safety: string
  limitPolicy: string
}

export type MsrcVulnerabilitiesResult = {
  kind: 'msrc.vulnerabilities'
  api: MsrcApiMeta
  query: ReturnType<typeof normalizeMsrcVulnerabilitiesInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    maxLimit: number
    orderBy: string
  }
  vulnerabilities: MsrcVulnerability[]
}

export async function listMsrcVulnerabilities(input: MsrcVulnerabilitiesInput = {}): Promise<MsrcVulnerabilitiesResult> {
  const query = normalizeMsrcVulnerabilitiesInput(input)
  const client = new MsrcClient()
  const response = await client.listVulnerabilities(query)
  return {
    kind: 'msrc.vulnerabilities',
    api: {
      provider: 'msrc',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /sug/v2.0/en-US/vulnerability',
      docsUrl: 'https://msrc.microsoft.com/update-guide',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON OData',
      platform: 'Microsoft Security Update Guide API v2.0',
      safety: 'Read-only public vulnerability/update metadata only; the CLI does not submit reports, authenticate, upload proof-of-concept material, or call private case workflows.',
      limitPolicy: 'MSRC SUG OData supports $top; CLI caps vulnerability metadata output at 50 rows and orders by releaseDate desc.',
    },
    query,
    count: response.vulnerabilities.length,
    pagination: {
      returned: response.meta.returned,
      totalMatched: response.meta.totalMatched,
      limit: query.limit,
      maxLimit: MSRC_MAX_LIMIT,
      orderBy: MSRC_DEFAULT_ORDER,
    },
    vulnerabilities: response.vulnerabilities,
  }
}
