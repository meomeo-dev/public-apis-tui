import { isIP } from 'node:net'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const COUNTRY_IS_BASE_URL = 'https://api.country.is'
export const COUNTRY_IS_DEFAULT_IP = '8.8.8.8'

export type CountryIsLookupInput = {
  ip?: string | undefined
  includeDetails?: boolean | undefined
}

export type NormalizedCountryIsLookupInput = {
  ip?: string | undefined
  includeDetails: boolean
}

export type CountryIsLookupResponse = {
  ip: string
  country: string
  city?: string | null | undefined
  continent?: string | null | undefined
  subdivision?: string | null | undefined
  postal?: string | null | undefined
  location?: {
    latitude?: number | undefined
    longitude?: number | undefined
    accuracyRadius?: number | undefined
    timeZone?: string | undefined
  } | undefined
  asn?: {
    number?: number | undefined
    organization?: string | undefined
  } | undefined
}

export type CountryIsInfoResponse = {
  version: string
  dataSources: string[]
  lastUpdated: string
}

export class CountryIsClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async lookup(input: NormalizedCountryIsLookupInput): Promise<CountryIsLookupResponse> {
    const path = input.ip === undefined ? '/' : `/${encodeURIComponent(input.ip)}`
    const url = new URL(path, this.options.baseUrl ?? COUNTRY_IS_BASE_URL)
    if (input.includeDetails) {
      url.searchParams.set('fields', 'city,continent,subdivision,postal,location,asn')
    }
    const parsed = await this.fetchJson(url)
    return parseLookup(parsed)
  }

  async info(): Promise<CountryIsInfoResponse> {
    const parsed = await this.fetchJson(new URL('/info', this.options.baseUrl ?? COUNTRY_IS_BASE_URL))
    return parseInfo(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Country.is request failed: ${String(error)}`, {
        provider: 'countryis',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Country.is response body could not be read: ${String(error)}`, {
        provider: 'countryis',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Country.is is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'countryis',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Country.is returned a non-JSON response: ${String(error)}`, {
        provider: 'countryis',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isErrorResponse(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Country.is request failed with HTTP ${response.status}.`, {
        provider: 'countryis',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeCountryIsLookupInput(input: CountryIsLookupInput = {}): NormalizedCountryIsLookupInput {
  return {
    ...(input.ip !== undefined ? { ip: normalizeIp(input.ip) } : {}),
    includeDetails: input.includeDetails === true,
  }
}

function parseLookup(value: unknown): CountryIsLookupResponse {
  if (!isRecord(value) || typeof value.ip !== 'string' || typeof value.country !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Country.is lookup response had an unexpected schema.', { response: value })
  }
  return {
    ip: value.ip,
    country: value.country,
    city: optionalNullableString(value.city),
    continent: optionalNullableString(value.continent),
    subdivision: optionalNullableString(value.subdivision),
    postal: optionalNullableString(value.postal),
    location: parseLocation(value.location),
    asn: parseAsn(value.asn),
  }
}

function parseInfo(value: unknown): CountryIsInfoResponse {
  if (!isRecord(value) || typeof value.version !== 'string' || !Array.isArray(value.dataSources) || typeof value.lastUpdated !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Country.is info response had an unexpected schema.', { response: value })
  }
  return {
    version: value.version,
    dataSources: value.dataSources.filter((entry): entry is string => typeof entry === 'string'),
    lastUpdated: value.lastUpdated,
  }
}

function parseLocation(value: unknown): CountryIsLookupResponse['location'] {
  if (!isRecord(value)) return undefined
  return {
    latitude: optionalNumber(value.latitude),
    longitude: optionalNumber(value.longitude),
    accuracyRadius: optionalNumber(value.accuracy_radius),
    timeZone: optionalString(value.time_zone),
  }
}

function parseAsn(value: unknown): CountryIsLookupResponse['asn'] {
  if (!isRecord(value)) return undefined
  return {
    number: optionalNumber(value.number),
    organization: optionalString(value.organization),
  }
}

function normalizeIp(value: string): string {
  const ip = value.trim()
  if (isIP(ip) === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ip must be an IPv4 or IPv6 address such as 8.8.8.8 or 2001:4860:4860::8888.')
  }
  return ip
}

function isErrorResponse(value: unknown): boolean {
  return isRecord(value) && isRecord(value.error)
}

function readErrorMessage(value: unknown): string | undefined {
  return isRecord(value) && isRecord(value.error) && typeof value.error.message === 'string' ? value.error.message : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNullableString(value: unknown): string | null | undefined {
  return typeof value === 'string' || value === null ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
