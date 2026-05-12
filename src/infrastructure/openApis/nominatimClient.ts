import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
export const NOMINATIM_DOCS_URL = 'https://nominatim.org/release-docs/latest/api/Overview/'
export const NOMINATIM_POLICY_URL = 'https://operations.osmfoundation.org/policies/nominatim/'
export const NOMINATIM_DEFAULT_QUERY = 'Berlin'
export const NOMINATIM_DEFAULT_LIMIT = 3
export const NOMINATIM_MAX_LIMIT = 5
export const NOMINATIM_DEFAULT_LATITUDE = 52.5170365
export const NOMINATIM_DEFAULT_LONGITUDE = 13.3888599
export const NOMINATIM_DEFAULT_LANGUAGE = 'en'
export const NOMINATIM_USER_AGENT = 'public-apis-tui/0.5.0 no-auth CLI (https://github.com/openai/codex)'

export type NominatimSearchInput = {
  query?: string | undefined
  limit?: number | undefined
  language?: string | undefined
}

export type NormalizedNominatimSearchInput = {
  query: string
  limit: number
  language: string
}

export type NominatimReverseInput = {
  latitude?: number | string | undefined
  longitude?: number | string | undefined
  language?: string | undefined
}

export type NormalizedNominatimReverseInput = {
  latitude: number
  longitude: number
  language: string
}

export type NominatimPlace = {
  placeId: number
  licence?: string | undefined
  osmType?: string | undefined
  osmId?: number | undefined
  latitude: number
  longitude: number
  category?: string | undefined
  type?: string | undefined
  placeRank?: number | undefined
  importance?: number | undefined
  addressType?: string | undefined
  name?: string | undefined
  displayName: string
  address: Record<string, string>
  boundingBox: string[]
}

type NominatimClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class NominatimClient {
  constructor(private readonly options: NominatimClientOptions = {}) {}

  async search(input: NormalizedNominatimSearchInput): Promise<NominatimPlace[]> {
    const url = new URL('/search', this.options.baseUrl ?? NOMINATIM_BASE_URL)
    url.searchParams.set('q', input.query)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', String(input.limit))
    url.searchParams.set('accept-language', input.language)
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Nominatim search response was not a JSON array.', { provider: 'nominatim', response: parsed })
    }
    return parsed.map(parsePlace)
  }

  async reverse(input: NormalizedNominatimReverseInput): Promise<NominatimPlace> {
    const url = new URL('/reverse', this.options.baseUrl ?? NOMINATIM_BASE_URL)
    url.searchParams.set('lat', String(input.latitude))
    url.searchParams.set('lon', String(input.longitude))
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', input.language)
    const parsed = await this.fetchJson(url)
    return parsePlace(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'accept-language': 'en',
          'user-agent': NOMINATIM_USER_AGENT,
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nominatim request failed: ${String(error)}`, {
        provider: 'nominatim',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nominatim response body could not be read: ${String(error)}`, {
        provider: 'nominatim',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Nominatim is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'nominatim',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nominatim returned a non-JSON response: ${String(error)}`, {
        provider: 'nominatim',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isErrorResponse(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readError(parsed) ?? `Nominatim request failed with HTTP ${response.status}.`, {
        provider: 'nominatim',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeNominatimSearchInput(input: NominatimSearchInput = {}): NormalizedNominatimSearchInput {
  const query = (input.query ?? NOMINATIM_DEFAULT_QUERY).trim()
  if (query.length < 2) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must contain at least 2 characters.')
  }
  if (query.length > 200) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 200 characters or fewer.')
  }
  return {
    query,
    limit: normalizeInteger(input.limit, NOMINATIM_DEFAULT_LIMIT, 1, NOMINATIM_MAX_LIMIT, '--limit'),
    language: normalizeLanguage(input.language),
  }
}

export function normalizeNominatimReverseInput(input: NominatimReverseInput = {}): NormalizedNominatimReverseInput {
  return {
    latitude: normalizeCoordinate(input.latitude ?? NOMINATIM_DEFAULT_LATITUDE, -90, 90, '--latitude'),
    longitude: normalizeCoordinate(input.longitude ?? NOMINATIM_DEFAULT_LONGITUDE, -180, 180, '--longitude'),
    language: normalizeLanguage(input.language),
  }
}

function parsePlace(value: unknown): NominatimPlace {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Nominatim place was not a JSON object.', { provider: 'nominatim', response: value })
  }
  const placeId = readRequiredNumber(value, 'place_id')
  const latitude = parseRequiredNumericString(value, 'lat')
  const longitude = parseRequiredNumericString(value, 'lon')
  const displayName = readRequiredString(value, 'display_name')
  return {
    placeId,
    ...readOptionalStringAs(value, 'licence', 'licence'),
    ...readOptionalStringAs(value, 'osm_type', 'osmType'),
    ...readOptionalNumberAs(value, 'osm_id', 'osmId'),
    latitude,
    longitude,
    ...readOptionalStringAs(value, 'category', 'category'),
    ...readOptionalStringAs(value, 'type', 'type'),
    ...readOptionalNumberAs(value, 'place_rank', 'placeRank'),
    ...readOptionalNumberAs(value, 'importance', 'importance'),
    ...readOptionalStringAs(value, 'addresstype', 'addressType'),
    ...readOptionalStringAs(value, 'name', 'name'),
    displayName,
    address: parseStringRecord(value.address),
    boundingBox: parseStringArray(value.boundingbox),
  }
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function normalizeCoordinate(value: number | string, min: number, max: number, label: string): number {
  const parsed = typeof value === 'string' ? Number(value.trim()) : value
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a number between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function normalizeLanguage(value: string | undefined): string {
  const language = (value ?? NOMINATIM_DEFAULT_LANGUAGE).trim()
  if (!/^[A-Za-z]{2,3}(?:[-,][A-Za-z0-9-]{2,8})*$/u.test(language)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--language must be a short Accept-Language code such as en, de, or en-US.')
  }
  return language
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Nominatim response did not include ${key}.`, { provider: 'nominatim', response: record })
  }
  return value.trim()
}

function readRequiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Nominatim response did not include numeric ${key}.`, { provider: 'nominatim', response: record })
  }
  return value
}

function parseRequiredNumericString(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  const parsed = typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Nominatim response did not include numeric ${key}.`, { provider: 'nominatim', response: record })
  }
  return parsed
}

function readOptionalStringAs<T extends string>(record: Record<string, unknown>, key: string, outputKey: T): Partial<Record<T, string>> {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? { [outputKey]: value.trim() } as Partial<Record<T, string>> : {}
}

function readOptionalNumberAs<T extends string>(record: Record<string, unknown>, key: string, outputKey: T): Partial<Record<T, number>> {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? { [outputKey]: value } as Partial<Record<T, number>> : {}
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== ''))
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function isErrorResponse(value: unknown): boolean {
  return isRecord(value) && (typeof value.error === 'string' || value.error === true)
}

function readError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.error === 'string') return value.error
  if (typeof value.message === 'string') return value.message
  return undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
