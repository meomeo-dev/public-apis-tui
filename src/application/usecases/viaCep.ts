import {
  VIA_CEP_DOCS_URL,
  VIA_CEP_MAX_LIMIT,
  ViaCepClient,
  normalizeViaCepLookupInput,
  normalizeViaCepSearchInput,
  type ViaCepAddress,
  type ViaCepLookupInput,
  type ViaCepSearchInput,
} from '../../infrastructure/openApis/viaCepClient.js'

type ViaCepApiMeta = {
  providerId: 'viacep'
  providerName: 'ViaCep'
  endpoint: string
  documentation: typeof VIA_CEP_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  reliability: 'Reference/geocoding data for Brazilian CEP addresses; validate delivery-critical or legal decisions against Correios or other official sources.'
}

const apiBase = {
  providerId: 'viacep',
  providerName: 'ViaCep',
  documentation: VIA_CEP_DOCS_URL,
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  reliability: 'Reference/geocoding data for Brazilian CEP addresses; validate delivery-critical or legal decisions against Correios or other official sources.',
} satisfies Omit<ViaCepApiMeta, 'endpoint'>

export type ViaCepLookupResult = {
  kind: 'viacep.lookup'
  api: ViaCepApiMeta & { endpoint: 'GET /ws/{cep}/json/' }
  query: ReturnType<typeof normalizeViaCepLookupInput>
  address?: ViaCepAddress | undefined
  count: { returned: 0 | 1 }
}

export type ViaCepSearchResult = {
  kind: 'viacep.search'
  api: ViaCepApiMeta & { endpoint: 'GET /ws/{uf}/{city}/{street}/json/' }
  query: ReturnType<typeof normalizeViaCepSearchInput>
  addresses: ViaCepAddress[]
  pagination: { returned: number; limit: number; maxLimit: typeof VIA_CEP_MAX_LIMIT }
}

export async function lookupViaCep(input: ViaCepLookupInput = {}): Promise<ViaCepLookupResult> {
  const query = normalizeViaCepLookupInput(input)
  const address = await new ViaCepClient().lookup(query)
  return {
    kind: 'viacep.lookup',
    api: { ...apiBase, endpoint: 'GET /ws/{cep}/json/' },
    query,
    ...(address !== undefined ? { address } : {}),
    count: { returned: address === undefined ? 0 : 1 },
  }
}

export async function searchViaCep(input: ViaCepSearchInput = {}): Promise<ViaCepSearchResult> {
  const query = normalizeViaCepSearchInput(input)
  const addresses = await new ViaCepClient().search(query)
  return {
    kind: 'viacep.search',
    api: { ...apiBase, endpoint: 'GET /ws/{uf}/{city}/{street}/json/' },
    query,
    addresses,
    pagination: { returned: addresses.length, limit: query.limit, maxLimit: VIA_CEP_MAX_LIMIT },
  }
}

export type { ViaCepLookupInput, ViaCepSearchInput }
