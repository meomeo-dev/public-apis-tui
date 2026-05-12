import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const POSTCODES_IO_BASE_URL = 'https://api.postcodes.io'
export const POSTCODES_IO_DOCS_URL = 'https://postcodes.io/docs/api/'
export const POSTCODES_IO_DEFAULT_POSTCODE = 'SW1A 2AA'
export const POSTCODES_IO_DEFAULT_QUERY = 'SW1A'
export const POSTCODES_IO_DEFAULT_LATITUDE = 51.5074
export const POSTCODES_IO_DEFAULT_LONGITUDE = -0.1278
export const POSTCODES_IO_DEFAULT_LIMIT = 5
export const POSTCODES_IO_MAX_LIMIT = 20

export type PostcodesIoLookupInput = {
  postcode?: string | undefined
}

export type PostcodesIoSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type PostcodesIoNearestInput = {
  latitude?: number | undefined
  longitude?: number | undefined
  limit?: number | undefined
  radius?: number | undefined
}

export type NormalizedPostcodesIoLookupInput = {
  postcode: string
}

export type NormalizedPostcodesIoSearchInput = {
  query: string
  limit: number
}

export type NormalizedPostcodesIoNearestInput = {
  latitude: number
  longitude: number
  limit: number
  radius?: number | undefined
}

export type PostcodesIoPostcode = {
  postcode: string
  country?: string | undefined
  region?: string | undefined
  adminDistrict?: string | undefined
  adminCounty?: string | undefined
  adminWard?: string | undefined
  parliamentaryConstituency?: string | undefined
  longitude?: number | undefined
  latitude?: number | undefined
  quality?: number | undefined
  eastings?: number | undefined
  northings?: number | undefined
  outcode?: string | undefined
  incode?: string | undefined
}

type PostcodesIoClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class PostcodesIoClient {
  constructor(private readonly options: PostcodesIoClientOptions = {}) {}

  async lookup(input: NormalizedPostcodesIoLookupInput): Promise<PostcodesIoPostcode | undefined> {
    const url = new URL(`/postcodes/${encodeURIComponent(input.postcode)}`, this.options.baseUrl ?? POSTCODES_IO_BASE_URL)
    const parsed = await this.fetchJson(url)
    return parseSinglePostcodeEnvelope(parsed)
  }

  async search(input: NormalizedPostcodesIoSearchInput): Promise<PostcodesIoPostcode[]> {
    const url = new URL('/postcodes', this.options.baseUrl ?? POSTCODES_IO_BASE_URL)
    url.searchParams.set('q', input.query)
    const parsed = await this.fetchJson(url)
    return parsePostcodeArrayEnvelope(parsed).slice(0, input.limit)
  }

  async nearest(input: NormalizedPostcodesIoNearestInput): Promise<PostcodesIoPostcode[]> {
    const url = new URL('/postcodes', this.options.baseUrl ?? POSTCODES_IO_BASE_URL)
    url.searchParams.set('lat', String(input.latitude))
    url.searchParams.set('lon', String(input.longitude))
    if (input.radius !== undefined) {
      url.searchParams.set('radius', String(input.radius))
    }
    const parsed = await this.fetchJson(url)
    return parsePostcodeArrayEnvelope(parsed).slice(0, input.limit)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Postcodes.io request failed: ${String(error)}`, {
        provider: 'postcodes-io',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Postcodes.io response body could not be read: ${String(error)}`, {
        provider: 'postcodes-io',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Postcodes.io is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'postcodes-io',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Postcodes.io returned a non-JSON response: ${String(error)}`, {
        provider: 'postcodes-io',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok && response.status !== 404) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Postcodes.io request failed with HTTP ${response.status}.`, {
        provider: 'postcodes-io',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizePostcodesIoLookupInput(input: PostcodesIoLookupInput = {}): NormalizedPostcodesIoLookupInput {
  return { postcode: normalizePostcode(input.postcode ?? POSTCODES_IO_DEFAULT_POSTCODE) }
}

export function normalizePostcodesIoSearchInput(input: PostcodesIoSearchInput = {}): NormalizedPostcodesIoSearchInput {
  const query = (input.query ?? POSTCODES_IO_DEFAULT_QUERY).trim().toUpperCase()
  if (query.length < 2) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must contain at least 2 characters.')
  }
  if (query.length > 12 || /[/?#]/u.test(query)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be a UK postcode fragment, not a URL or expression.')
  }
  return { query, limit: normalizeInteger(input.limit, POSTCODES_IO_DEFAULT_LIMIT, 1, POSTCODES_IO_MAX_LIMIT, '--limit') }
}

export function normalizePostcodesIoNearestInput(input: PostcodesIoNearestInput = {}): NormalizedPostcodesIoNearestInput {
  return {
    latitude: normalizeLatitude(input.latitude ?? POSTCODES_IO_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(input.longitude ?? POSTCODES_IO_DEFAULT_LONGITUDE),
    limit: normalizeInteger(input.limit, POSTCODES_IO_DEFAULT_LIMIT, 1, POSTCODES_IO_MAX_LIMIT, '--limit'),
    ...(input.radius !== undefined ? { radius: normalizeInteger(input.radius, 1000, 1, 2000, '--radius') } : {}),
  }
}

function normalizePostcode(value: string): string {
  const postcode = value.trim().replace(/\s+/gu, ' ').toUpperCase()
  if (postcode.length < 5 || postcode.length > 8 || !/^[A-Z0-9 ]+$/u.test(postcode)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--postcode must be a UK postcode such as SW1A 2AA.')
  }
  return postcode
}

function normalizeLatitude(value: number): number {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--latitude must be a number between -90 and 90.')
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--longitude must be a number between -180 and 180.')
  }
  return value
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function parseSinglePostcodeEnvelope(value: unknown): PostcodesIoPostcode | undefined {
  const envelope = parseEnvelope(value)
  if (envelope.status === 404) {
    return undefined
  }
  if (!isRecord(envelope.result)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Postcodes.io lookup response did not include a postcode object.', { provider: 'postcodes-io', response: value })
  }
  return parsePostcode(envelope.result)
}

function parsePostcodeArrayEnvelope(value: unknown): PostcodesIoPostcode[] {
  const envelope = parseEnvelope(value)
  if (!Array.isArray(envelope.result)) {
    return []
  }
  return envelope.result.map(parsePostcode)
}

function parseEnvelope(value: unknown): { status: number; result?: unknown; error?: unknown } {
  if (!isRecord(value) || typeof value.status !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Postcodes.io response did not include numeric status.', { provider: 'postcodes-io', response: value })
  }
  return {
    status: value.status,
    result: value.result,
    error: value.error,
  }
}

function parsePostcode(value: unknown): PostcodesIoPostcode {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Postcodes.io postcode entry had an unexpected schema.', { provider: 'postcodes-io', response: value })
  }
  return {
    postcode: readRequiredString(value, 'postcode'),
    ...readOptionalStringAs(value, 'country', 'country'),
    ...readOptionalStringAs(value, 'region', 'region'),
    ...readOptionalStringAs(value, 'admin_district', 'adminDistrict'),
    ...readOptionalStringAs(value, 'admin_county', 'adminCounty'),
    ...readOptionalStringAs(value, 'admin_ward', 'adminWard'),
    ...readOptionalStringAs(value, 'parliamentary_constituency', 'parliamentaryConstituency'),
    ...readOptionalNumberAs(value, 'longitude', 'longitude'),
    ...readOptionalNumberAs(value, 'latitude', 'latitude'),
    ...readOptionalNumberAs(value, 'quality', 'quality'),
    ...readOptionalNumberAs(value, 'eastings', 'eastings'),
    ...readOptionalNumberAs(value, 'northings', 'northings'),
    ...readOptionalStringAs(value, 'outcode', 'outcode'),
    ...readOptionalStringAs(value, 'incode', 'incode'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Postcodes.io response did not include ${key}.`, { provider: 'postcodes-io', response: record })
  }
  return value.trim()
}

function readOptionalStringAs(record: Record<string, unknown>, source: string, target: string): Record<string, string> {
  const value = record[source]
  return typeof value === 'string' && value.trim() !== '' ? { [target]: value.trim() } : {}
}

function readOptionalNumberAs(record: Record<string, unknown>, source: string, target: string): Record<string, number> {
  const value = record[source]
  return typeof value === 'number' && Number.isFinite(value) ? { [target]: value } : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  const contentType = response.headers.get('content-type')?.toLowerCase()
  return (
    mitigated === 'challenge' ||
    body.includes('Just a moment...') ||
    ((response.status === 403 || response.status === 429) && server === 'cloudflare' && contentType?.includes('text/html') === true)
  )
}
