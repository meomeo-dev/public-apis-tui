import {
  ReceitaWsClient,
  normalizeReceitaWsLookupInput,
  type ReceitaWsCompany,
  type ReceitaWsLookupInput,
} from '../../infrastructure/openApis/receitaWsClient.js'

export type ReceitaWsLookupResult = {
  kind: 'receitaws.lookup'
  api: {
    provider: 'receitaws'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    rateLimit: string
  }
  query: ReturnType<typeof normalizeReceitaWsLookupInput>
  company: ReceitaWsCompany
  count: 1
}

export async function lookupReceitaWs(input: ReceitaWsLookupInput = {}): Promise<ReceitaWsLookupResult> {
  const query = normalizeReceitaWsLookupInput(input)
  const client = new ReceitaWsClient()
  const company = await client.lookup(query)
  return {
    kind: 'receitaws.lookup',
    api: {
      provider: 'receitaws',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v1/cnpj/{cnpj}',
      docsUrl: 'https://www.receitaws.com.br/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      rateLimit: 'Free public endpoint is single-CNPJ lookup; use one persisted request and offline replay for repeated inspection.',
    },
    query,
    company,
    count: 1,
  }
}
