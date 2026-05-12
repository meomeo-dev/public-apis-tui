import {
  NvdClient,
  NVD_DEFAULT_SEARCH,
  NVD_MAX_LIMIT,
  normalizeNvdCvesInput,
  type NvdCve,
  type NvdCvesInput,
} from '../../infrastructure/openApis/nvdClient.js'

type NvdApiMeta = {
  provider: 'nvd'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  platform: 'NVD 2.0 CVE API'
  safety: string
  limitPolicy: string
  defaultSearch: string
}

export type NvdCvesResult = {
  kind: 'nvd.cves'
  api: NvdApiMeta
  query: ReturnType<typeof normalizeNvdCvesInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    resultsPerPage: number
    startIndex: number
    limit: number
    maxLimit: number
  }
  cves: NvdCve[]
}

export async function listNvdCves(input: NvdCvesInput = {}): Promise<NvdCvesResult> {
  const query = normalizeNvdCvesInput(input)
  const client = new NvdClient()
  const response = await client.listCves(query)
  return {
    kind: 'nvd.cves',
    api: {
      provider: 'nvd',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /rest/json/cves/2.0',
      docsUrl: 'https://nvd.nist.gov/developers/vulnerabilities',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      platform: 'NVD 2.0 CVE API',
      safety: 'Read-only public CVE metadata only; raw exploit databases, arbitrary references, CPE expansion, and API-key workflows are not exposed.',
      limitPolicy: 'NVD no-key CVE queries are rate-limited; CLI caps CVE metadata output at 50 rows and defaults to a bounded keyword search.',
      defaultSearch: NVD_DEFAULT_SEARCH,
    },
    query,
    count: response.cves.length,
    pagination: {
      returned: response.meta.returned,
      totalMatched: response.meta.totalResults,
      resultsPerPage: response.meta.resultsPerPage,
      startIndex: response.meta.startIndex,
      limit: query.limit,
      maxLimit: NVD_MAX_LIMIT,
    },
    cves: response.cves,
  }
}
