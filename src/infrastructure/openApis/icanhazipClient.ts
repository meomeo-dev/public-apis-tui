import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type IcanhazipProtocol = 'auto' | 'ipv4'

export type IcanhazipClientOptions = {
  fetchImpl?: typeof fetch | undefined
}

export type IcanhazipResponse = {
  ip: string
  endpoint: string
  contentType?: string | undefined
}

export class IcanhazipClient {
  constructor(private readonly options: IcanhazipClientOptions = {}) {}

  async getIp(protocol: IcanhazipProtocol): Promise<IcanhazipResponse> {
    const endpoint = resolveEndpoint(protocol)
    const fetchImpl = this.options.fetchImpl ?? fetch
    let response: Response
    try {
      response = await fetchImpl(new URL(endpoint), {
        method: 'GET',
        headers: {
          accept: 'text/plain',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Icanhazip request failed: ${String(error)}`, {
        provider: 'icanhazip',
        endpoint,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Icanhazip request failed with HTTP ${response.status}.`, {
        provider: 'icanhazip',
        status: response.status,
        endpoint,
      })
    }

    const body = (await response.text()).trim()
    if (!isIpAddress(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Icanhazip response was not an IP address.', {
        provider: 'icanhazip',
        endpoint,
        response: body,
      })
    }

    return {
      ip: body,
      endpoint,
      ...(response.headers.get('content-type') !== null ? { contentType: response.headers.get('content-type') ?? undefined } : {}),
    }
  }
}

export function normalizeIcanhazipProtocol(value: unknown): IcanhazipProtocol {
  if (value === undefined || value === null || value === '') {
    return 'auto'
  }
  if (value === 'auto' || value === 'ipv4') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Icanhazip --protocol must be auto or ipv4.', { protocol: value })
}

export function resolveEndpoint(protocol: IcanhazipProtocol): string {
  return protocol === 'ipv4' ? 'https://ipv4.icanhazip.com' : 'https://icanhazip.com'
}

function isIpAddress(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(value)) {
    return value.split('.').every(part => Number(part) >= 0 && Number(part) <= 255)
  }
  return /^[0-9a-f:]+$/iu.test(value) && value.includes(':')
}
