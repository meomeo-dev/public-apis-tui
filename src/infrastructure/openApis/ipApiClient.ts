import { isIP } from 'node:net'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const IPAPI_DEFAULT_QUERY = '8.8.8.8'

export type IpApiLookupInput = {
  query?: string | undefined
}

export type NormalizedIpApiLookupInput = {
  query: string
}

export type IpApiRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  resetSeconds?: string | undefined
}

export type IpApiLookup = {
  status: 'success'
  query: string
  country?: string | undefined
  countryCode?: string | undefined
  region?: string | undefined
  regionName?: string | undefined
  city?: string | undefined
  zip?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  timezone?: string | undefined
  isp?: string | undefined
  organization?: string | undefined
  asn?: string | undefined
}

type IpApiRawLookup = IpApiLookup | {
  status: 'fail'
  message?: string | undefined
  query?: string | undefined
}

export type IpApiClientLookupResponse = {
  lookup: IpApiLookup
  endpoint: string
  contentType?: string | undefined
  rateLimit: IpApiRateLimit
}

const IP_API_FIELDS = [
  'status',
  'message',
  'country',
  'countryCode',
  'region',
  'regionName',
  'city',
  'zip',
  'lat',
  'lon',
  'timezone',
  'isp',
  'org',
  'as',
  'query',
].join(',')

export class IpApiClient {
  constructor(
    private readonly baseUrl = 'http://ip-api.com',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async lookup(input: NormalizedIpApiLookupInput): Promise<IpApiClientLookupResponse> {
    const endpoint = new URL(`/json/${encodeURIComponent(input.query)}`, this.baseUrl)
    endpoint.searchParams.set('fields', IP_API_FIELDS)

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
      throw new RuntimeFailure('OPEN_API_FAILED', `ip-api request failed: ${String(error)}`, {
        provider: 'ip-api',
        endpoint: endpoint.href,
      })
    }

    const parsed = await parseJsonResponse(response, endpoint)
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `ip-api request failed with HTTP ${response.status}.`, {
        provider: 'ip-api',
        status: response.status,
        endpoint: endpoint.href,
        response: parsed,
      })
    }

    return {
      lookup: parseIpApiLookup(parsed),
      endpoint: endpoint.href,
      ...(response.headers.get('content-type') !== null ? { contentType: response.headers.get('content-type') ?? undefined } : {}),
      rateLimit: readIpApiRateLimit(response.headers),
    }
  }
}

export function normalizeIpApiLookupInput(input: IpApiLookupInput = {}): NormalizedIpApiLookupInput {
  const query = (input.query ?? IPAPI_DEFAULT_QUERY).trim()
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
    throw new RuntimeFailure('OPEN_API_FAILED', `ip-api response body could not be read: ${String(error)}`, {
      provider: 'ip-api',
      status: response.status,
      endpoint: endpoint.href,
    })
  }

  if (isCloudflareChallenge(response, body)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'ip-api is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
      provider: 'ip-api',
      status: response.status,
      endpoint: endpoint.href,
    })
  }

  try {
    return JSON.parse(body)
  } catch (error) {
    throw new RuntimeFailure('OPEN_API_FAILED', `ip-api returned a non-JSON response: ${String(error)}`, {
      provider: 'ip-api',
      status: response.status,
      endpoint: endpoint.href,
      contentType: response.headers.get('content-type') ?? undefined,
    })
  }
}

function parseIpApiLookup(value: unknown): IpApiLookup {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'ip-api response was not a JSON object.', { provider: 'ip-api', response: value })
  }

  const raw = parseRawLookup(value)
  if (raw.status === 'fail') {
    throw new RuntimeFailure('OPEN_API_FAILED', `ip-api lookup failed: ${raw.message ?? 'unknown provider error'}`, {
      provider: 'ip-api',
      query: raw.query,
      response: value,
    })
  }

  return raw
}

function parseRawLookup(record: Record<string, unknown>): IpApiRawLookup {
  const status = record.status
  if (status !== 'success' && status !== 'fail') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'ip-api response did not include a success/fail status.', { provider: 'ip-api', response: record })
  }
  if (status === 'fail') {
    return {
      status,
      ...readOptionalString(record, 'message'),
      ...readOptionalString(record, 'query'),
    }
  }

  const query = readRequiredString(record, 'query')
  return {
    status,
    query,
    ...readOptionalString(record, 'country'),
    ...readOptionalString(record, 'countryCode'),
    ...readOptionalString(record, 'region'),
    ...readOptionalString(record, 'regionName'),
    ...readOptionalString(record, 'city'),
    ...readOptionalString(record, 'zip'),
    ...readOptionalNumberAs(record, 'lat', 'latitude'),
    ...readOptionalNumberAs(record, 'lon', 'longitude'),
    ...readOptionalString(record, 'timezone'),
    ...readOptionalString(record, 'isp'),
    ...readOptionalStringAs(record, 'org', 'organization'),
    ...readOptionalStringAs(record, 'as', 'asn'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `ip-api response did not include ${key}.`, { provider: 'ip-api', response: record })
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

function readOptionalNumberAs<T extends string>(record: Record<string, unknown>, key: string, outputKey: T): Partial<Record<T, number>> {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? { [outputKey]: value } as Partial<Record<T, number>> : {}
}

function readIpApiRateLimit(headers: Headers): IpApiRateLimit {
  return {
    ...(headers.get('x-rl') !== null ? { remaining: headers.get('x-rl') ?? undefined } : {}),
    ...(headers.get('x-ttl') !== null ? { resetSeconds: headers.get('x-ttl') ?? undefined } : {}),
    limit: '45 requests/minute on the free endpoint',
  }
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
