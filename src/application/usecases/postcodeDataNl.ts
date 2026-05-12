import {
  POSTCODE_DATA_NL_DOCS_URL,
  PostcodeDataNlClient,
  normalizePostcodeDataNlLookupInput,
  type PostcodeDataNlAddress,
  type PostcodeDataNlLookupInput,
} from '../../infrastructure/openApis/postcodeDataNlClient.js'

export type PostcodeDataNlLookupResult = {
  kind: 'postcodedata-nl.lookup'
  api: {
    providerId: 'postcodedata-nl'
    providerName: 'PostcodeData.nl'
    endpoint: 'GET /v1/postcode/'
    documentation: typeof POSTCODE_DATA_NL_DOCS_URL
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTP JSON REST'
    httpOnly: true
    privacy: 'Dutch address lookup sends postcode and house number over HTTP cleartext; use only with non-sensitive sample/manual lookups.'
    reliability: 'Legacy reference API; not an official delivery-grade postal authority workflow.'
  }
  query: ReturnType<typeof normalizePostcodeDataNlLookupInput>
  addresses: PostcodeDataNlAddress[]
  count: { returned: number }
}

export async function lookupPostcodeDataNl(input: PostcodeDataNlLookupInput = {}): Promise<PostcodeDataNlLookupResult> {
  const query = normalizePostcodeDataNlLookupInput(input)
  const addresses = await new PostcodeDataNlClient().lookup(query)
  return {
    kind: 'postcodedata-nl.lookup',
    api: {
      providerId: 'postcodedata-nl',
      providerName: 'PostcodeData.nl',
      endpoint: 'GET /v1/postcode/',
      documentation: POSTCODE_DATA_NL_DOCS_URL,
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'HTTP JSON REST',
      httpOnly: true,
      privacy: 'Dutch address lookup sends postcode and house number over HTTP cleartext; use only with non-sensitive sample/manual lookups.',
      reliability: 'Legacy reference API; not an official delivery-grade postal authority workflow.',
    },
    query,
    addresses,
    count: { returned: addresses.length },
  }
}

export type { PostcodeDataNlLookupInput }
