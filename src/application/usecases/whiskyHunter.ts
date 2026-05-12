import {
  filterWhiskyHunterDistilleries,
  normalizeWhiskyHunterDistilleriesInput,
  WhiskyHunterClient,
  WHISKY_HUNTER_MAX_LIMIT,
  type WhiskyHunterDistilleriesInput,
  type WhiskyHunterDistillery,
} from '../../infrastructure/openApis/whiskyHunterClient.js'

export type WhiskyHunterDistilleriesResult = {
  kind: 'whiskyhunter.distilleries'
  api: {
    provider: 'whiskyhunter'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    notes: string[]
  }
  query: ReturnType<typeof normalizeWhiskyHunterDistilleriesInput>
  pagination: {
    returned: number
    upstreamTotal: number
    limit: number
    maxLimit: number
  }
  distilleries: WhiskyHunterDistillery[]
}

export async function listWhiskyHunterDistilleries(input: WhiskyHunterDistilleriesInput = {}): Promise<WhiskyHunterDistilleriesResult> {
  const query = normalizeWhiskyHunterDistilleriesInput(input)
  const client = new WhiskyHunterClient()
  const upstream = await client.listDistilleries()
  const distilleries = filterWhiskyHunterDistilleries(upstream, query)
  return {
    kind: 'whiskyhunter.distilleries',
    api: {
      provider: 'whiskyhunter',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /api/distilleries_info/',
      docsUrl: 'https://whiskyhunter.net/api/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      notes: ['Auction/item routes were not implemented because live no-auth probes returned HTML 404 rather than repeatable JSON.'],
    },
    query,
    pagination: {
      returned: distilleries.length,
      upstreamTotal: upstream.length,
      limit: query.limit,
      maxLimit: WHISKY_HUNTER_MAX_LIMIT,
    },
    distilleries,
  }
}
