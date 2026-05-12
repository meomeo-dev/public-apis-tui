import {
  WebsiteCarbonClient,
  normalizeWebsiteCarbonDataInput,
  type WebsiteCarbonDataInput,
} from '../../infrastructure/openApis/websiteCarbonClient.js'

export type WebsiteCarbonDataUsecaseResult = {
  kind: 'websitecarbon.data'
  api: {
    provider: 'websitecarbon'
    endpoint: 'GET /data'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    publicEndpointNote: string
  }
  query: {
    bytes: number
    green: boolean
    legacy?: 2 | 3 | undefined
  }
  result: {
    bytes: number
    green: boolean
    gco2e: number
    rating: string
    cleanerThan?: number | undefined
  }
  statistics?: Record<string, unknown> | undefined
  pagination: {
    returned: number
  }
}

export async function calculateWebsiteCarbonData(input: WebsiteCarbonDataInput = {}): Promise<WebsiteCarbonDataUsecaseResult> {
  const query = normalizeWebsiteCarbonDataInput(input)
  const client = new WebsiteCarbonClient()
  const data = await client.calculateData(query)
  return {
    kind: 'websitecarbon.data',
    api: {
      provider: 'websitecarbon',
      endpoint: 'GET /data',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl: 'https://api.websitecarbon.com/',
      publicEndpointNote: 'Official docs state /data is the only endpoint offered for public access; /site public access ended on 2025-07-14.',
    },
    query,
    result: {
      bytes: data.bytes,
      green: data.green,
      gco2e: data.gco2e,
      rating: data.rating,
      cleanerThan: data.cleanerThan,
    },
    ...(data.statistics !== undefined ? { statistics: data.statistics } : {}),
    pagination: { returned: 1 },
  }
}
