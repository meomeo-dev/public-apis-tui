import {
  HttpbinClient,
  normalizeHttpbinGetQuery,
  type HttpbinGetResponse,
} from '../../infrastructure/openApis/httpbinClient.js'

export type HttpbinGetInput = {
  query?: string | undefined
}

export type HttpbinGetResult = {
  kind: 'httpbin.get'
  api: HttpbinApiMetadata & {
    endpoint: 'GET /get'
    queryPairCap: 10
  }
  query: {
    query?: string | undefined
  }
  request: HttpbinGetResponse
  count: number
}

export type HttpbinUuidResult = {
  kind: 'httpbin.uuid'
  api: HttpbinApiMetadata & {
    endpoint: 'GET /uuid'
  }
  query: Record<string, never>
  uuid: string
}

type HttpbinApiMetadata = {
  provider: 'httpbin'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://httpbin.org/'
  transport: 'HTTPS JSON'
  rateLimit: 'not documented'
}

export async function getHttpbin(input: HttpbinGetInput = {}): Promise<HttpbinGetResult> {
  const query = normalizeHttpbinGetQuery(input)
  const client = new HttpbinClient()
  const request = await client.get(query)
  return {
    kind: 'httpbin.get',
    api: {
      ...createMetadata(),
      endpoint: 'GET /get',
      queryPairCap: 10,
    },
    query,
    request,
    count: Object.keys(request.args).length,
  }
}

export async function getHttpbinUuid(): Promise<HttpbinUuidResult> {
  const client = new HttpbinClient()
  const { uuid } = await client.uuid()
  return {
    kind: 'httpbin.uuid',
    api: {
      ...createMetadata(),
      endpoint: 'GET /uuid',
    },
    query: {},
    uuid,
  }
}

function createMetadata(): HttpbinApiMetadata {
  return {
    provider: 'httpbin',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://httpbin.org/',
    transport: 'HTTPS JSON',
    rateLimit: 'not documented',
  }
}
