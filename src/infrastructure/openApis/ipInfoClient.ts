import { isIP } from 'node:net'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const IPINFO_BASE_URL = 'https://ipinfo.io'
export const IPINFO_DEFAULT_IP = '8.8.8.8'

export type IpInfoLookupInput = {
  ip?: string | undefined
}

export type NormalizedIpInfoLookupInput = {
  ip: string
}

export type IpInfoLookup = {
  ip: string
  hostname?: string | undefined
  city?: string | undefined
  region?: string | undefined
  country?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  organization?: string | undefined
  postal?: string | undefined
  timezone?: string | undefined
  anycast?: boolean | undefined
  missingAuthReadme?: string | undefined
}

export class IpInfoClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async lookup(input: NormalizedIpInfoLookupInput): Promise<IpInfoLookup> {
    const url = new URL(`/${encodeURIComponent(input.ip)}/json`, this.options.baseUrl ?? IPINFO_BASE_URL)
    const parsed = await this.fetchJson(url)
    return parseLookup(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPinfo request failed: ${String(error)}`, {
        provider: 'ipinfo',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPinfo response body could not be read: ${String(error)}`, {
        provider: 'ipinfo',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'IPinfo is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'ipinfo',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPinfo returned a non-JSON response: ${String(error)}`, {
        provider: 'ipinfo',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPinfo request failed with HTTP ${response.status}.`, {
        provider: 'ipinfo',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeIpInfoLookupInput(input: IpInfoLookupInput = {}): NormalizedIpInfoLookupInput {
  const ip = (input.ip ?? IPINFO_DEFAULT_IP).trim()
  if (isIP(ip) === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ip must be an IPv4 or IPv6 address such as 8.8.8.8 or 2001:4860:4860::8888.')
  }
  return { ip }
}

function parseLookup(value: unknown): IpInfoLookup {
  if (!isRecord(value) || typeof value.ip !== 'string' || isIP(value.ip.trim()) === 0) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'IPinfo lookup response had an unexpected schema.', { response: value })
  }
  const coordinates = parseCoordinates(value.loc)
  return {
    ip: value.ip.trim(),
    hostname: optionalString(value.hostname),
    city: optionalString(value.city),
    region: optionalString(value.region),
    country: optionalString(value.country),
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    organization: optionalString(value.org),
    postal: optionalString(value.postal),
    timezone: optionalString(value.timezone),
    anycast: typeof value.anycast === 'boolean' ? value.anycast : undefined,
    missingAuthReadme: optionalString(value.readme),
  }
}

function parseCoordinates(value: unknown): { latitude: number; longitude: number } | undefined {
  if (typeof value !== 'string') return undefined
  const [latitudeRaw, longitudeRaw] = value.split(',')
  const latitude = Number(latitudeRaw)
  const longitude = Number(longitudeRaw)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
