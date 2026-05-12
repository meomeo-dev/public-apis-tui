import { isIP } from 'node:net'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GEOJS_BASE_URL = 'https://get.geojs.io'
export const GEOJS_DEFAULT_IP = '8.8.8.8'

export type GeoJsLookupInput = {
  ip?: string | undefined
}

export type NormalizedGeoJsLookupInput = {
  ip: string
}

export type GeoJsCurrentIpResponse = {
  ip: string
}

export type GeoJsGeoResponse = {
  accuracy?: number | undefined
  area_code?: string | undefined
  asn?: number | undefined
  city?: string | undefined
  continent_code?: string | undefined
  country?: string | undefined
  country_code?: string | undefined
  country_code3?: string | undefined
  ip: string
  latitude?: string | undefined
  longitude?: string | undefined
  organization?: string | undefined
  organization_name?: string | undefined
  region?: string | undefined
  timezone?: string | undefined
}

export type GeoJsLookup = {
  ip: string
  country?: string | undefined
  countryCode?: string | undefined
  countryCode3?: string | undefined
  continentCode?: string | undefined
  region?: string | undefined
  city?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  accuracyKm?: number | undefined
  asn?: number | undefined
  organization?: string | undefined
  organizationName?: string | undefined
  timezone?: string | undefined
}

export class GeoJsClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async lookup(input: NormalizedGeoJsLookupInput): Promise<GeoJsLookup> {
    const url = new URL(`/v1/ip/geo/${encodeURIComponent(input.ip)}.json`, this.options.baseUrl ?? GEOJS_BASE_URL)
    const parsed = await this.fetchJson(url)
    return parseGeoResponse(parsed)
  }

  async currentIp(): Promise<GeoJsCurrentIpResponse> {
    const parsed = await this.fetchJson(new URL('/v1/ip.json', this.options.baseUrl ?? GEOJS_BASE_URL))
    if (!isRecord(parsed) || typeof parsed.ip !== 'string' || isIP(parsed.ip.trim()) === 0) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'GeoJS current IP response had an unexpected schema.', { response: parsed })
    }
    return { ip: parsed.ip.trim() }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GeoJS request failed: ${String(error)}`, {
        provider: 'geojs',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GeoJS response body could not be read: ${String(error)}`, {
        provider: 'geojs',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'GeoJS is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'geojs',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GeoJS returned a non-JSON response: ${String(error)}`, {
        provider: 'geojs',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GeoJS request failed with HTTP ${response.status}.`, {
        provider: 'geojs',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeGeoJsLookupInput(input: GeoJsLookupInput = {}): NormalizedGeoJsLookupInput {
  return { ip: normalizeIp(input.ip ?? GEOJS_DEFAULT_IP) }
}

function parseGeoResponse(value: unknown): GeoJsLookup {
  if (!isRecord(value) || typeof value.ip !== 'string' || isIP(value.ip.trim()) === 0) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'GeoJS geolocation response had an unexpected schema.', { response: value })
  }
  return {
    ip: value.ip.trim(),
    country: optionalString(value.country),
    countryCode: optionalString(value.country_code),
    countryCode3: optionalString(value.country_code3),
    continentCode: optionalString(value.continent_code),
    region: optionalString(value.region),
    city: optionalString(value.city),
    latitude: parseNumber(value.latitude),
    longitude: parseNumber(value.longitude),
    accuracyKm: optionalNumber(value.accuracy),
    asn: optionalNumber(value.asn),
    organization: optionalString(value.organization),
    organizationName: optionalString(value.organization_name),
    timezone: optionalString(value.timezone),
  }
}

function normalizeIp(value: string): string {
  const ip = value.trim()
  if (isIP(ip) === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ip must be an IPv4 or IPv6 address such as 8.8.8.8 or 2001:4860:4860::8888.')
  }
  return ip
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
