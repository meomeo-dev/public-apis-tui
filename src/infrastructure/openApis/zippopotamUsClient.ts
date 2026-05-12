import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ZIPPOPOTAM_US_BASE_URL = 'https://api.zippopotam.us'
export const ZIPPOPOTAM_US_DOCS_URL = 'https://api.zippopotam.us/'
export const ZIPPOPOTAM_US_DEFAULT_COUNTRY = 'US'
export const ZIPPOPOTAM_US_DEFAULT_POSTAL_CODE = '90210'
export const ZIPPOPOTAM_US_DEFAULT_STATE = 'MA'
export const ZIPPOPOTAM_US_DEFAULT_CITY = 'Belmont'
export const ZIPPOPOTAM_US_DEFAULT_LIMIT = 10
export const ZIPPOPOTAM_US_MAX_LIMIT = 50

export type ZippopotamUsLookupInput = {
  country?: string | undefined
  postalCode?: string | undefined
  limit?: number | undefined
}

export type ZippopotamUsSearchInput = {
  country?: string | undefined
  state?: string | undefined
  city?: string | undefined
  limit?: number | undefined
}

export type NormalizedZippopotamUsLookupInput = {
  country: string
  postalCode: string
  limit: number
}

export type NormalizedZippopotamUsSearchInput = {
  country: string
  state: string
  city: string
  limit: number
}

export type ZippopotamUsPlace = {
  placeName: string
  postalCode?: string | undefined
  state?: string | undefined
  stateAbbreviation?: string | undefined
  longitude?: string | undefined
  latitude?: string | undefined
}

export type ZippopotamUsLookup = {
  country: string
  countryAbbreviation: string
  postalCode: string
  places: ZippopotamUsPlace[]
}

export type ZippopotamUsSearch = {
  country: string
  countryAbbreviation: string
  state?: string | undefined
  stateAbbreviation?: string | undefined
  placeName?: string | undefined
  places: ZippopotamUsPlace[]
}

type ZippopotamUsClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ZippopotamUsClient {
  constructor(private readonly options: ZippopotamUsClientOptions = {}) {}

  async lookup(input: NormalizedZippopotamUsLookupInput): Promise<ZippopotamUsLookup | undefined> {
    const url = new URL(`/${input.country.toLowerCase()}/${encodeURIComponent(input.postalCode)}`, this.options.baseUrl ?? ZIPPOPOTAM_US_BASE_URL)
    const parsed = await this.fetchJson(url)
    if (isEmptyObject(parsed)) {
      return undefined
    }
    const result = parseLookupResponse(parsed)
    return { ...result, places: result.places.slice(0, input.limit) }
  }

  async search(input: NormalizedZippopotamUsSearchInput): Promise<ZippopotamUsSearch | undefined> {
    const url = new URL(
      `/${input.country.toLowerCase()}/${encodeURIComponent(input.state.toLowerCase())}/${encodeURIComponent(input.city.toLowerCase())}`,
      this.options.baseUrl ?? ZIPPOPOTAM_US_BASE_URL,
    )
    const parsed = await this.fetchJson(url)
    if (isEmptyObject(parsed)) {
      return undefined
    }
    const result = parseSearchResponse(parsed)
    return { ...result, places: result.places.slice(0, input.limit) }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Zippopotam.us request failed: ${String(error)}`, {
        provider: 'zippopotam-us',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Zippopotam.us response body could not be read: ${String(error)}`, {
        provider: 'zippopotam-us',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Zippopotam.us is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'zippopotam-us',
        endpoint: url.href,
        status: response.status,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Zippopotam.us returned a non-JSON response: ${String(error)}`, {
        provider: 'zippopotam-us',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok && response.status !== 404) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Zippopotam.us request failed with HTTP ${response.status}.`, {
        provider: 'zippopotam-us',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeZippopotamUsLookupInput(input: ZippopotamUsLookupInput = {}): NormalizedZippopotamUsLookupInput {
  return {
    country: normalizeCountry(input.country ?? ZIPPOPOTAM_US_DEFAULT_COUNTRY),
    postalCode: normalizePathText(input.postalCode ?? ZIPPOPOTAM_US_DEFAULT_POSTAL_CODE, '--postal-code', 2, 16),
    limit: normalizeInteger(input.limit, ZIPPOPOTAM_US_DEFAULT_LIMIT, 1, ZIPPOPOTAM_US_MAX_LIMIT, '--limit'),
  }
}

export function normalizeZippopotamUsSearchInput(input: ZippopotamUsSearchInput = {}): NormalizedZippopotamUsSearchInput {
  return {
    country: normalizeCountry(input.country ?? ZIPPOPOTAM_US_DEFAULT_COUNTRY),
    state: normalizePathText(input.state ?? ZIPPOPOTAM_US_DEFAULT_STATE, '--state', 1, 12).toUpperCase(),
    city: normalizePathText(input.city ?? ZIPPOPOTAM_US_DEFAULT_CITY, '--city', 2, 80),
    limit: normalizeInteger(input.limit, ZIPPOPOTAM_US_DEFAULT_LIMIT, 1, ZIPPOPOTAM_US_MAX_LIMIT, '--limit'),
  }
}

function normalizeCountry(value: string): string {
  const country = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(country)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--country must be an ISO 3166-1 alpha-2 country code such as US, DE, ES, or FR.')
  }
  return country
}

function normalizePathText(value: string, label: string, min: number, max: number): string {
  const text = value.trim().replace(/\s+/gu, ' ')
  if (text.length < min || text.length > max || /[/?#\\]/u.test(text)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be ${String(min)}-${String(max)} characters and cannot contain URL path/query separators.`)
  }
  return text
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function parseLookupResponse(value: unknown): ZippopotamUsLookup {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Zippopotam.us lookup response was not a JSON object.', { provider: 'zippopotam-us', response: value })
  }
  return {
    country: readRequiredString(value, 'country'),
    countryAbbreviation: readRequiredString(value, 'country abbreviation'),
    postalCode: readRequiredString(value, 'post code'),
    places: parsePlaces(value.places),
  }
}

function parseSearchResponse(value: unknown): ZippopotamUsSearch {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Zippopotam.us search response was not a JSON object.', { provider: 'zippopotam-us', response: value })
  }
  return {
    country: readRequiredString(value, 'country'),
    countryAbbreviation: readRequiredString(value, 'country abbreviation'),
    ...readOptionalStringAs(value, 'state', 'state'),
    ...readOptionalStringAs(value, 'state abbreviation', 'stateAbbreviation'),
    ...readOptionalStringAs(value, 'place name', 'placeName'),
    places: parsePlaces(value.places),
  }
}

function parsePlaces(value: unknown): ZippopotamUsPlace[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(parsePlace)
}

function parsePlace(value: unknown): ZippopotamUsPlace {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Zippopotam.us place entry had an unexpected schema.', {
      provider: 'zippopotam-us',
      response: value,
    })
  }
  return {
    placeName: readRequiredString(value, 'place name'),
    ...readOptionalStringAs(value, 'post code', 'postalCode'),
    ...readOptionalStringAs(value, 'state', 'state'),
    ...readOptionalStringAs(value, 'state abbreviation', 'stateAbbreviation'),
    ...readOptionalStringAs(value, 'longitude', 'longitude'),
    ...readOptionalStringAs(value, 'latitude', 'latitude'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Zippopotam.us response was missing required field ${key}.`, {
      provider: 'zippopotam-us',
      response: record,
    })
  }
  return value.trim()
}

function readOptionalStringAs(record: Record<string, unknown>, sourceKey: string, targetKey: keyof ZippopotamUsPlace | keyof ZippopotamUsSearch): Record<string, string> {
  const value = record[sourceKey]
  return typeof value === 'string' && value.trim() !== '' ? { [targetKey]: value.trim() } : {}
}

function isEmptyObject(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 0
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
