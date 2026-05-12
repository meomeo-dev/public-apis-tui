import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const POSTCODE_DATA_NL_BASE_URL = 'http://api.postcodedata.nl'
export const POSTCODE_DATA_NL_DOCS_URL = 'http://api.postcodedata.nl/v1/postcode/?postcode=1211EP&streetnumber=60&ref=domeinnaam.nl&type=json'
export const POSTCODE_DATA_NL_DEFAULT_POSTCODE = '1211EP'
export const POSTCODE_DATA_NL_DEFAULT_STREET_NUMBER = 60
export const POSTCODE_DATA_NL_DEFAULT_REF = 'public-apis-tui.local'

export type PostcodeDataNlLookupInput = {
  postcode?: string | undefined
  streetNumber?: number | undefined
  ref?: string | undefined
}

export type NormalizedPostcodeDataNlLookupInput = {
  postcode: string
  streetNumber: number
  ref: string
}

export type PostcodeDataNlAddress = {
  street: string
  city: string
  municipality: string
  province: string
  postcode: string
  pnum: string
  pchar: string
  rdX?: number | undefined
  rdY?: number | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

type PostcodeDataNlClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class PostcodeDataNlClient {
  constructor(private readonly options: PostcodeDataNlClientOptions = {}) {}

  async lookup(input: NormalizedPostcodeDataNlLookupInput): Promise<PostcodeDataNlAddress[]> {
    const url = new URL('/v1/postcode/', this.options.baseUrl ?? POSTCODE_DATA_NL_BASE_URL)
    url.searchParams.set('postcode', input.postcode)
    url.searchParams.set('streetnumber', String(input.streetNumber))
    url.searchParams.set('ref', input.ref)
    url.searchParams.set('type', 'json')
    const parsed = await this.fetchJson(url)
    return parseLookupResponse(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostcodeData.nl request failed: ${String(error)}`, {
        provider: 'postcodedata-nl',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostcodeData.nl response body could not be read: ${String(error)}`, {
        provider: 'postcodedata-nl',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'PostcodeData.nl is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'postcodedata-nl',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostcodeData.nl returned a non-JSON response: ${String(error)}`, {
        provider: 'postcodedata-nl',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostcodeData.nl request failed with HTTP ${response.status}.`, {
        provider: 'postcodedata-nl',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizePostcodeDataNlLookupInput(input: PostcodeDataNlLookupInput = {}): NormalizedPostcodeDataNlLookupInput {
  const postcode = normalizePostcode(input.postcode)
  return {
    postcode,
    streetNumber: normalizeStreetNumber(input.streetNumber),
    ref: normalizeRef(input.ref),
  }
}

function normalizePostcode(value: string | undefined): string {
  const postcode = (value ?? POSTCODE_DATA_NL_DEFAULT_POSTCODE).trim().replace(/\s+/gu, '').toUpperCase()
  if (!/^[1-9][0-9]{3}[A-Z]{2}$/u.test(postcode)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--postcode must be a Dutch postcode in 1234AB format.')
  }
  return postcode
}

function normalizeStreetNumber(value: number | undefined): number {
  const parsed = value ?? POSTCODE_DATA_NL_DEFAULT_STREET_NUMBER
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99999) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--street-number must be an integer between 1 and 99999.')
  }
  return parsed
}

function normalizeRef(value: string | undefined): string {
  const ref = (value ?? POSTCODE_DATA_NL_DEFAULT_REF).trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9.-]{1,62}[a-z0-9]$/u.test(ref) || !ref.includes('.')) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ref must be a domain-style identifier such as public-apis-tui.local.')
  }
  return ref
}

function parseLookupResponse(value: unknown): PostcodeDataNlAddress[] {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PostcodeData.nl response was not a JSON object.', { provider: 'postcodedata-nl', response: value })
  }
  const status = value.status
  if (status === 'error') {
    const message = typeof value.errormessage === 'string' && value.errormessage.trim() !== '' ? value.errormessage.trim() : 'unknown provider error'
    if (message === 'no results') {
      return []
    }
    throw new RuntimeFailure('OPEN_API_FAILED', `PostcodeData.nl lookup failed: ${message}`, {
      provider: 'postcodedata-nl',
      response: value,
    })
  }
  if (status !== 'ok') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PostcodeData.nl response did not include status ok/error.', { provider: 'postcodedata-nl', response: value })
  }
  if (!Array.isArray(value.details)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PostcodeData.nl response did not include details array.', { provider: 'postcodedata-nl', response: value })
  }
  return value.details.map(parseAddress)
}

function parseAddress(value: unknown): PostcodeDataNlAddress {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PostcodeData.nl address had an unexpected schema.', { provider: 'postcodedata-nl', response: value })
  }
  return {
    street: readRequiredString(value, 'street'),
    city: readRequiredString(value, 'city'),
    municipality: readRequiredString(value, 'municipality'),
    province: readRequiredString(value, 'province'),
    postcode: readRequiredString(value, 'postcode'),
    pnum: readRequiredString(value, 'pnum'),
    pchar: readRequiredString(value, 'pchar'),
    ...readOptionalNumberString(value, 'rd_x', 'rdX'),
    ...readOptionalNumberString(value, 'rd_y', 'rdY'),
    ...readOptionalNumberString(value, 'lat', 'latitude'),
    ...readOptionalNumberString(value, 'lon', 'longitude'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `PostcodeData.nl response did not include ${key}.`, { provider: 'postcodedata-nl', response: record })
  }
  return value.trim()
}

function readOptionalNumberString(record: Record<string, unknown>, source: string, target: string): Record<string, number> {
  const value = record[source]
  if (typeof value !== 'string' || value.trim() === '') {
    return {}
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? { [target]: parsed } : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}
