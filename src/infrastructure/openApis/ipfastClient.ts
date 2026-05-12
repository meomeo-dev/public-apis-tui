import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type IpfastRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type IpfastLookupResponse = {
  ip: string
  country?: string | undefined
  countryName?: string | undefined
  city?: string | undefined
  region?: string | undefined
  timezone?: string | undefined
  latitude?: string | undefined
  longitude?: string | undefined
  postalCode?: string | undefined
  asn?: number | undefined
  asOrganization?: string | undefined
  colo?: string | undefined
  regionCode?: string | undefined
  flag?: string | undefined
  continentCode?: string | undefined
  continent?: string | undefined
  isEU?: boolean | undefined
  currency?: string | undefined
  currencyName?: string | undefined
  currencySymbol?: string | undefined
  callingCode?: string | undefined
  languages?: string | undefined
  countryTld?: string | undefined
  countryCapital?: string | undefined
}

export type IpfastClientResponse = {
  body: IpfastLookupResponse
  endpoint: string
  contentType?: string | undefined
  rateLimit: IpfastRateLimit
}

export class IpfastClient {
  constructor(
    private readonly baseUrl = 'https://ipfast.dev',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async lookup(): Promise<IpfastClientResponse> {
    const endpoint = new URL('/json', this.baseUrl)
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
      throw new RuntimeFailure('OPEN_API_FAILED', `IPFast request failed: ${String(error)}`, {
        provider: 'ipfast',
        endpoint: endpoint.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IPFast request failed with HTTP ${response.status}.`, {
        provider: 'ipfast',
        status: response.status,
        endpoint: endpoint.href,
      })
    }

    const body = parseIpfastLookup(await response.json())
    return {
      body,
      endpoint: endpoint.href,
      ...(response.headers.get('content-type') !== null ? { contentType: response.headers.get('content-type') ?? undefined } : {}),
      rateLimit: readIpfastRateLimit(response.headers),
    }
  }
}

function parseIpfastLookup(value: unknown): IpfastLookupResponse {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'IPFast response was not a JSON object.', { provider: 'ipfast' })
  }

  const record = value as Record<string, unknown>
  if (typeof record.ip !== 'string' || record.ip.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'IPFast response did not include an IP address.', { provider: 'ipfast' })
  }

  return {
    ip: record.ip,
    ...readOptionalString(record, 'country'),
    ...readOptionalString(record, 'countryName'),
    ...readOptionalString(record, 'city'),
    ...readOptionalString(record, 'region'),
    ...readOptionalString(record, 'timezone'),
    ...readOptionalString(record, 'latitude'),
    ...readOptionalString(record, 'longitude'),
    ...readOptionalString(record, 'postalCode'),
    ...readOptionalNumber(record, 'asn'),
    ...readOptionalString(record, 'asOrganization'),
    ...readOptionalString(record, 'colo'),
    ...readOptionalString(record, 'regionCode'),
    ...readOptionalString(record, 'flag'),
    ...readOptionalString(record, 'continentCode'),
    ...readOptionalString(record, 'continent'),
    ...readOptionalBoolean(record, 'isEU'),
    ...readOptionalString(record, 'currency'),
    ...readOptionalString(record, 'currencyName'),
    ...readOptionalString(record, 'currencySymbol'),
    ...readOptionalString(record, 'callingCode'),
    ...readOptionalString(record, 'languages'),
    ...readOptionalString(record, 'countryTld'),
    ...readOptionalString(record, 'countryCapital'),
  }
}

function readOptionalString(record: Record<string, unknown>, key: keyof IpfastLookupResponse): Partial<IpfastLookupResponse> {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? { [key]: value } : {}
}

function readOptionalNumber(record: Record<string, unknown>, key: keyof IpfastLookupResponse): Partial<IpfastLookupResponse> {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? { [key]: value } : {}
}

function readOptionalBoolean(record: Record<string, unknown>, key: keyof IpfastLookupResponse): Partial<IpfastLookupResponse> {
  const value = record[key]
  return typeof value === 'boolean' ? { [key]: value } : {}
}

function readIpfastRateLimit(headers: Headers): IpfastRateLimit {
  return {
    ...(headers.get('x-ratelimit-limit') !== null ? { limit: headers.get('x-ratelimit-limit') ?? undefined } : {}),
    ...(headers.get('x-ratelimit-remaining') !== null ? { remaining: headers.get('x-ratelimit-remaining') ?? undefined } : {}),
    ...(headers.get('x-ratelimit-reset') !== null ? { reset: headers.get('x-ratelimit-reset') ?? undefined } : {}),
  }
}
