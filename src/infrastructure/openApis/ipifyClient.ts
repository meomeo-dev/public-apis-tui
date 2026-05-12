import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type IpifyProtocol = 'auto' | 'ipv4'

export type IpifyClientResponse = {
  ip: string
  endpoint: string
  contentType?: string | undefined
}

export class IpifyClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async getIp(protocol: IpifyProtocol): Promise<IpifyClientResponse> {
    const endpoints = protocol === 'auto'
      ? [resolveIpifyEndpoint('auto'), resolveIpifyEndpoint('ipv4')]
      : [resolveIpifyEndpoint(protocol)]
    let lastFailure: unknown
    for (const endpoint of endpoints) {
      try {
        const result = await this.getIpFromEndpoint(endpoint)
        return result
      } catch (error) {
        lastFailure = error
      }
    }

    if (lastFailure instanceof RuntimeFailure) {
      throw lastFailure
    }
    throw new RuntimeFailure('OPEN_API_FAILED', `IPify request failed: ${String(lastFailure)}`, {
      provider: 'ipify',
      protocol,
    })
  }

  private async getIpFromEndpoint(endpoint: string): Promise<IpifyClientResponse> {
    const response = await this.fetchEndpoint(endpoint)

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPify request failed with HTTP ${response.status}.`, {
        provider: 'ipify',
        status: response.status,
        endpoint,
      })
    }

    const body = await response.json()
    if (body === null || typeof body !== 'object' || Array.isArray(body) || typeof (body as Record<string, unknown>).ip !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'IPify response did not include an IP address.', {
        provider: 'ipify',
        endpoint,
      })
    }

    const ip = ((body as Record<string, unknown>).ip as string).trim()
    if (ip === '') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'IPify response returned an empty IP address.', {
        provider: 'ipify',
        endpoint,
      })
    }

    return {
      ip,
      endpoint,
      ...(response.headers.get('content-type') !== null ? { contentType: response.headers.get('content-type') ?? undefined } : {}),
    }
  }

  private async fetchEndpoint(endpoint: string): Promise<Response> {
    const attempts = 2
    let lastError: unknown
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.fetchImpl(new URL(endpoint), {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'user-agent': 'public-apis-tui no-auth CLI',
          },
        })
      } catch (error) {
        lastError = error
        if (attempt < attempts) {
          await sleep(150)
        }
      }
    }

    throw new RuntimeFailure('OPEN_API_FAILED', `IPify request failed: ${String(lastError)}`, {
      provider: 'ipify',
      endpoint,
    })
  }
}

export function normalizeIpifyProtocol(value: unknown): IpifyProtocol {
  if (value === undefined || value === null || value === '') {
    return 'auto'
  }
  if (value === 'auto' || value === 'ipv4') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'IPify --protocol must be auto or ipv4.', { protocol: value })
}

export function resolveIpifyEndpoint(protocol: IpifyProtocol): string {
  return protocol === 'ipv4'
    ? 'https://api.ipify.org?format=json'
    : 'https://api64.ipify.org?format=json'
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds))
}
