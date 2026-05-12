import {
  BinlistClient,
  normalizeBinlistLookupInput,
  type BinlistLookupInput,
} from '../../infrastructure/openApis/binlistClient.js'

export type BinlistLookupUsecaseResult = {
  kind: 'binlist.lookup'
  api: {
    provider: 'binlist'
    endpoint: 'GET /{bin}'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    rateLimit: string
  }
  query: {
    bin: string
  }
  card: {
    scheme?: string | undefined
    type?: string | undefined
    brand?: string | undefined
    prepaid?: boolean | undefined
    number: Record<string, unknown>
  }
  country?: Record<string, unknown> | undefined
  bank?: Record<string, unknown> | undefined
  pagination: {
    returned: number
  }
}

export async function lookupBinlist(input: BinlistLookupInput = {}): Promise<BinlistLookupUsecaseResult> {
  const query = normalizeBinlistLookupInput(input)
  const client = new BinlistClient()
  const result = await client.lookup(query)
  return {
    kind: 'binlist.lookup',
    api: {
      provider: 'binlist',
      endpoint: 'GET /{bin}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl: 'https://binlist.net/',
      rateLimit: 'Free anonymous clients are limited to 5 requests per hour with a burst of 5.',
    },
    query,
    card: {
      scheme: result.scheme,
      type: result.type,
      brand: result.brand,
      prepaid: result.prepaid,
      number: result.number,
    },
    ...(result.country !== undefined ? { country: result.country } : {}),
    ...(result.bank !== undefined ? { bank: result.bank } : {}),
    pagination: { returned: 1 },
  }
}
