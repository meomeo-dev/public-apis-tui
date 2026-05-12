import {
  ZIPTASTIC_DOCS_URL,
  ZiptasticClient,
  normalizeZiptasticLookupInput,
  type ZiptasticAddress,
  type ZiptasticLookupInput,
} from '../../infrastructure/openApis/ziptasticClient.js'

type ZiptasticApiMeta = {
  providerId: 'ziptastic'
  providerName: 'Ziptastic'
  endpoint: 'GET /{zip}'
  documentation: typeof ZIPTASTIC_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON body over text/html content-type'
  reliability: 'Reference ZIP/postal lookup data; validate delivery-critical or legal decisions against official postal sources.'
  contentTypeCaveat: 'The live endpoint returns JSON text while advertising text/html; the client parses only JSON bodies and never treats HTML as data.'
}

const apiBase = {
  providerId: 'ziptastic',
  providerName: 'Ziptastic',
  endpoint: 'GET /{zip}',
  documentation: ZIPTASTIC_DOCS_URL,
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON body over text/html content-type',
  reliability: 'Reference ZIP/postal lookup data; validate delivery-critical or legal decisions against official postal sources.',
  contentTypeCaveat: 'The live endpoint returns JSON text while advertising text/html; the client parses only JSON bodies and never treats HTML as data.',
} satisfies ZiptasticApiMeta

export type ZiptasticLookupResult = {
  kind: 'ziptastic.lookup'
  api: ZiptasticApiMeta
  query: ReturnType<typeof normalizeZiptasticLookupInput>
  address?: ZiptasticAddress | undefined
  count: { returned: 0 | 1 }
}

export async function lookupZiptastic(input: ZiptasticLookupInput = {}): Promise<ZiptasticLookupResult> {
  const query = normalizeZiptasticLookupInput(input)
  const address = await new ZiptasticClient().lookup(query)
  return {
    kind: 'ziptastic.lookup',
    api: apiBase,
    query,
    ...(address !== undefined ? { address } : {}),
    count: { returned: address === undefined ? 0 : 1 },
  }
}

export type { ZiptasticLookupInput }
