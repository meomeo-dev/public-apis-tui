import { isIP } from 'node:net'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const IPGEO_DEFAULT_QUERY = '8.8.8.8'

export type IpGeoLookupInput = {
  query?: string | undefined
}

export type NormalizedIpGeoLookupInput = {
  query: string
}

export type IpGeoLookup = {
  status: 'success'
  ip: string
  continent?: string | undefined
  country?: string | undefined
  countryCode?: string | undefined
  regionName?: string | undefined
  city?: string | undefined
  zip?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  timezone?: string | undefined
  currency?: string | undefined
  isp?: string | undefined
  organization?: string | undefined
  asn?: string | undefined
  reverse?: string | undefined
  mobile?: boolean | undefined
  proxy?: boolean | undefined
  hosting?: boolean | undefined
  cached?: boolean | undefined
  cacheTimestamp?: number | undefined
}

export type IpGeoClientLookupResponse = {
  lookup: IpGeoLookup
  endpoint: string
  contentType?: string | undefined
}

export class IpGeoClient {
  constructor(
    private readonly baseUrl = 'https://api.techniknews.net',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async lookup(input: NormalizedIpGeoLookupInput): Promise<IpGeoClientLookupResponse> {
    const endpoint = new URL(`/ipgeo/${input.query}`, this.baseUrl)

    let response: Response
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPGEO request failed: ${String(error)}`, {
        provider: 'ipgeo',
        endpoint: endpoint.href,
      })
    }

    const parsed = await parseJsonResponse(response, endpoint)
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPGEO request failed with HTTP ${response.status}.`, {
        provider: 'ipgeo',
        status: response.status,
        endpoint: endpoint.href,
        response: parsed,
      })
    }

    return {
      lookup: parseIpGeoLookup(parsed),
      endpoint: endpoint.href,
      ...(response.headers.get('content-type') !== null ? { contentType: response.headers.get('content-type') ?? undefined } : {}),
    }
  }
}

export function normalizeIpGeoLookupInput(input: IpGeoLookupInput = {}): NormalizedIpGeoLookupInput {
  const query = (input.query ?? IPGEO_DEFAULT_QUERY).trim()
  if (query === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be an IPv4/IPv6 address or domain name such as 8.8.8.8 or example.com.')
  }
  if (query.length > 253) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 253 characters or fewer.')
  }
  if (query.includes('/') || query.includes('?') || query.includes('#') || /\s/u.test(query)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be a plain IP address or domain name, not a URL or expression.')
  }
  if (isIP(query) !== 0) {
    return { query }
  }
  if (!isDomainName(query)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be an IPv4/IPv6 address or domain name such as 8.8.8.8 or example.com.')
  }
  return { query: query.toLowerCase() }
}

async function parseJsonResponse(response: Response, endpoint: URL): Promise<unknown> {
  let body: string
  try {
    body = await response.text()
  } catch (error) {
    throw new RuntimeFailure('OPEN_API_FAILED', `IPGEO response body could not be read: ${String(error)}`, {
      provider: 'ipgeo',
      status: response.status,
      endpoint: endpoint.href,
    })
  }

  if (isCloudflareChallenge(response, body)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'IPGEO is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
      provider: 'ipgeo',
      status: response.status,
      endpoint: endpoint.href,
    })
  }

  try {
    return JSON.parse(body)
  } catch (error) {
    throw new RuntimeFailure('OPEN_API_FAILED', `IPGEO returned a non-JSON response: ${String(error)}`, {
      provider: 'ipgeo',
      status: response.status,
      endpoint: endpoint.href,
      contentType: response.headers.get('content-type') ?? undefined,
    })
  }
}

function parseIpGeoLookup(value: unknown): IpGeoLookup {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'IPGEO response was not a JSON object.', { provider: 'ipgeo', response: value })
  }

  if (typeof value.error === 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `IPGEO lookup failed: ${value.error}`, {
      provider: 'ipgeo',
      response: value,
    })
  }

  if (value.status !== 'success') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'IPGEO lookup did not return success.', {
      provider: 'ipgeo',
      response: value,
    })
  }

  const ip = readRequiredString(value, 'ip')
  return {
    status: 'success',
    ip,
    ...readOptionalString(value, 'continent'),
    ...readOptionalString(value, 'country'),
    ...readOptionalString(value, 'countryCode'),
    ...readOptionalString(value, 'regionName'),
    ...readOptionalString(value, 'city'),
    ...readOptionalString(value, 'zip'),
    ...readOptionalNumberAs(value, 'lat', 'latitude'),
    ...readOptionalNumberAs(value, 'lon', 'longitude'),
    ...readOptionalString(value, 'timezone'),
    ...readOptionalString(value, 'currency'),
    ...readOptionalString(value, 'isp'),
    ...readOptionalStringAs(value, 'org', 'organization'),
    ...readOptionalStringAs(value, 'as', 'asn'),
    ...readOptionalString(value, 'reverse'),
    ...readOptionalBoolean(value, 'mobile'),
    ...readOptionalBoolean(value, 'proxy'),
    ...readOptionalBoolean(value, 'hosting'),
    ...readOptionalBoolean(value, 'cached'),
    ...readOptionalNumber(value, 'cacheTimestamp'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `IPGEO response did not include ${key}.`, { provider: 'ipgeo', response: record })
  }
  return value.trim()
}

function readOptionalString<T extends string>(record: Record<string, unknown>, key: T): Partial<Record<T, string>> {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? { [key]: value.trim() } as Partial<Record<T, string>> : {}
}

function readOptionalStringAs<T extends string>(record: Record<string, unknown>, key: string, outputKey: T): Partial<Record<T, string>> {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? { [outputKey]: value.trim() } as Partial<Record<T, string>> : {}
}

function readOptionalNumber<T extends string>(record: Record<string, unknown>, key: T): Partial<Record<T, number>> {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? { [key]: value } as Partial<Record<T, number>> : {}
}

function readOptionalNumberAs<T extends string>(record: Record<string, unknown>, key: string, outputKey: T): Partial<Record<T, number>> {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? { [outputKey]: value } as Partial<Record<T, number>> : {}
}

function readOptionalBoolean<T extends string>(record: Record<string, unknown>, key: T): Partial<Record<T, boolean>> {
  const value = record[key]
  return typeof value === 'boolean' ? { [key]: value } as Partial<Record<T, boolean>> : {}
}

function isDomainName(value: string): boolean {
  if (value.length > 253 || value.startsWith('.') || value.endsWith('.')) return false
  const labels = value.split('.')
  if (labels.length < 2) return false
  return labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu.test(label))
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
