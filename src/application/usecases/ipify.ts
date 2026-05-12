import { IpifyClient, normalizeIpifyProtocol, type IpifyProtocol } from '../../infrastructure/openApis/ipifyClient.js'

export type IpifyIpInput = {
  protocol?: IpifyProtocol | undefined
}

export type IpifyIpResult = {
  kind: 'ipify.ip'
  api: {
    provider: 'ipify'
    endpoint: 'GET /?format=json'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://www.ipify.org/'
    homepage: 'https://www.ipify.org/'
    transport: 'HTTPS JSON'
    rateLimit: 'official homepage says no limit'
    excludedFormats: 'plain text and JSONP are documented but intentionally not exposed; CLI consumes structured JSON'
  }
  query: {
    protocol: IpifyProtocol
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

export async function getIpify(input: IpifyIpInput = {}): Promise<IpifyIpResult> {
  const protocol = normalizeIpifyProtocol(input.protocol)
  const client = new IpifyClient()
  const response = await client.getIp(protocol)
  return {
    kind: 'ipify.ip',
    api: {
      provider: 'ipify',
      endpoint: 'GET /?format=json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://www.ipify.org/',
      homepage: 'https://www.ipify.org/',
      transport: 'HTTPS JSON',
      rateLimit: 'official homepage says no limit',
      excludedFormats: 'plain text and JSONP are documented but intentionally not exposed; CLI consumes structured JSON',
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
