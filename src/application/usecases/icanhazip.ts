import {
  IcanhazipClient,
  normalizeIcanhazipProtocol,
  type IcanhazipProtocol,
} from '../../infrastructure/openApis/icanhazipClient.js'

export type IcanhazipIpInput = {
  protocol?: IcanhazipProtocol | undefined
}

export type IcanhazipIpResult = {
  kind: 'icanhazip.ip'
  api: {
    provider: 'icanhazip'
    endpoint: 'GET /'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://major.io/icanhazip-com-faq/'
    homepage: 'https://icanhazip.com'
    transport: 'HTTPS text/plain'
    rateLimit: 'not documented'
    ipv6Endpoint: 'not exposed: ipv6.icanhazip.com did not resolve during 2026-05-03 live probe'
  }
  query: {
    protocol: IcanhazipProtocol
  }
  ip: {
    address: string
    version: 4 | 6
  }
  response: {
    endpoint: string
    contentType?: string | undefined
  }
}

export async function getIcanhazip(input: IcanhazipIpInput = {}): Promise<IcanhazipIpResult> {
  const protocol = normalizeIcanhazipProtocol(input.protocol)
  const client = new IcanhazipClient()
  const response = await client.getIp(protocol)
  return {
    kind: 'icanhazip.ip',
    api: {
      provider: 'icanhazip',
      endpoint: 'GET /',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://major.io/icanhazip-com-faq/',
      homepage: 'https://icanhazip.com',
      transport: 'HTTPS text/plain',
      rateLimit: 'not documented',
      ipv6Endpoint: 'not exposed: ipv6.icanhazip.com did not resolve during 2026-05-03 live probe',
    },
    query: { protocol },
    ip: {
      address: response.ip,
      version: response.ip.includes(':') ? 6 : 4,
    },
    response: {
      endpoint: response.endpoint,
      ...(response.contentType !== undefined ? { contentType: response.contentType } : {}),
    },
  }
}
