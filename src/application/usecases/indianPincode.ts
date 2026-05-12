import {
  IndianPincodeClient,
  INDIAN_PINCODE_MAX_LIMIT,
  normalizeIndianPincodeSearchInput,
  type IndianPincodeSearchInput,
  type IndianPincodeSearchResult,
} from '../../infrastructure/openApis/indianPincodeClient.js'

export type IndianPincodeSearchResultPayload = {
  kind: 'indianpincode.search'
  api: {
    provider: 'indianpincode'
    publicApisProject: string
    endpoint: 'GET /api/search?q={query}'
    docsUrl: 'https://indianpincode.com/'
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    limitPolicy: string
    detailPolicy: string
  }
  query: ReturnType<typeof normalizeIndianPincodeSearchInput>
  count: number
  pagination: {
    returned: number
    upstreamCount: number
    limit: number
    maxLimit: number
  }
  results: IndianPincodeSearchResult[]
}

export type { IndianPincodeSearchInput }

export async function searchIndianPincode(input: IndianPincodeSearchInput = {}): Promise<IndianPincodeSearchResultPayload> {
  const query = normalizeIndianPincodeSearchInput(input)
  const client = new IndianPincodeClient()
  const response = await client.search(query)
  return {
    kind: 'indianpincode.search',
    api: {
      provider: 'indianpincode',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /api/search?q={query}',
      docsUrl: 'https://indianpincode.com/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      limitPolicy: 'The public search endpoint currently returns up to 10 mixed results and ignores limit/page query parameters; CLI defaults/caps at 10 and filters locally by result type.',
      detailPolicy: 'Only the repeatable JSON /api/search endpoint is implemented; HTML pincode/state/city pages are intentionally not scraped.',
    },
    query,
    count: response.results.length,
    pagination: {
      returned: response.results.length,
      upstreamCount: response.upstreamCount,
      limit: query.limit,
      maxLimit: INDIAN_PINCODE_MAX_LIMIT,
    },
    results: response.results,
  }
}
