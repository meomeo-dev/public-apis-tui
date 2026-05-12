import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const REST_COUNTRIES_BASE_URL = 'https://restcountries.com'
export const REST_COUNTRIES_DOCS_URL = 'https://restcountries.com/'
export const REST_COUNTRIES_DEFAULT_NAME = 'peru'
export const REST_COUNTRIES_DEFAULT_CODE = 'DE'
export const REST_COUNTRIES_DEFAULT_REGION = 'europe'
export const REST_COUNTRIES_DEFAULT_LIMIT = 10
export const REST_COUNTRIES_MAX_LIMIT = 60

const COUNTRY_FIELDS = 'name,cca2,cca3,capital,region,subregion,population,area,languages,currencies,flags'

export type RestCountriesNameInput = {
  name?: string | undefined
  limit?: number | undefined
}

export type RestCountriesAlphaInput = {
  code?: string | undefined
}

export type RestCountriesRegionInput = {
  region?: string | undefined
  limit?: number | undefined
}

export type NormalizedRestCountriesNameInput = {
  name: string
  limit: number
}

export type NormalizedRestCountriesAlphaInput = {
  code: string
}

export type NormalizedRestCountriesRegionInput = {
  region: string
  limit: number
}

export type RestCountriesCountry = {
  commonName: string
  officialName?: string | undefined
  cca2: string
  cca3: string
  capital: string[]
  region?: string | undefined
  subregion?: string | undefined
  population?: number | undefined
  area?: number | undefined
  languages: string[]
  currencies: string[]
  flagPng?: string | undefined
  flagSvg?: string | undefined
  flagAlt?: string | undefined
}

type RestCountriesClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class RestCountriesClient {
  constructor(private readonly options: RestCountriesClientOptions = {}) {}

  async byName(input: NormalizedRestCountriesNameInput): Promise<RestCountriesCountry[]> {
    const url = this.buildUrl(`/v3.1/name/${encodeURIComponent(input.name)}`)
    const parsed = await this.fetchJson(url)
    return parseCountryArrayEnvelope(parsed).slice(0, input.limit)
  }

  async byAlpha(input: NormalizedRestCountriesAlphaInput): Promise<RestCountriesCountry | undefined> {
    const url = this.buildUrl(`/v3.1/alpha/${encodeURIComponent(input.code)}`)
    const parsed = await this.fetchJson(url)
    if (isNotFoundEnvelope(parsed)) {
      return undefined
    }
    return parseCountryObject(parsed)
  }

  async byRegion(input: NormalizedRestCountriesRegionInput): Promise<RestCountriesCountry[]> {
    const url = this.buildUrl(`/v3.1/region/${encodeURIComponent(input.region)}`)
    const parsed = await this.fetchJson(url)
    return parseCountryArrayEnvelope(parsed).slice(0, input.limit)
  }

  private buildUrl(path: string): URL {
    const url = new URL(path, this.options.baseUrl ?? REST_COUNTRIES_BASE_URL)
    url.searchParams.set('fields', COUNTRY_FIELDS)
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `REST Countries request failed: ${String(error)}`, {
        provider: 'restcountries',
        endpoint: url.href,
      })
    }
    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `REST Countries response body could not be read: ${String(error)}`, {
        provider: 'restcountries',
        endpoint: url.href,
        status: response.status,
      })
    }
    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'REST Countries is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'restcountries',
        endpoint: url.href,
        status: response.status,
      })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `REST Countries returned a non-JSON response: ${String(error)}`, {
        provider: 'restcountries',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }
    if (!response.ok && response.status !== 404) {
      throw new RuntimeFailure('OPEN_API_FAILED', `REST Countries request failed with HTTP ${response.status}.`, {
        provider: 'restcountries',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeRestCountriesNameInput(input: RestCountriesNameInput = {}): NormalizedRestCountriesNameInput {
  return {
    name: normalizeText(input.name ?? REST_COUNTRIES_DEFAULT_NAME, '--name', 2, 80),
    limit: normalizeInteger(input.limit, REST_COUNTRIES_DEFAULT_LIMIT, 1, REST_COUNTRIES_MAX_LIMIT, '--limit'),
  }
}

export function normalizeRestCountriesAlphaInput(input: RestCountriesAlphaInput = {}): NormalizedRestCountriesAlphaInput {
  const code = (input.code ?? REST_COUNTRIES_DEFAULT_CODE).trim().toUpperCase()
  if (!/^[A-Z]{2,3}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--code must be an ISO 3166 alpha-2 or alpha-3 country code such as DE or DEU.')
  }
  return { code }
}

export function normalizeRestCountriesRegionInput(input: RestCountriesRegionInput = {}): NormalizedRestCountriesRegionInput {
  const region = normalizeText(input.region ?? REST_COUNTRIES_DEFAULT_REGION, '--region', 2, 40).toLowerCase()
  if (!/^[a-z]+(?: [a-z]+)?$/u.test(region)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--region must be a region name such as europe, asia, africa, americas, or oceania.')
  }
  return {
    region,
    limit: normalizeInteger(input.limit, REST_COUNTRIES_DEFAULT_LIMIT, 1, REST_COUNTRIES_MAX_LIMIT, '--limit'),
  }
}

function normalizeText(value: string, label: string, min: number, max: number): string {
  const text = value.trim()
  if (text.length < min || text.length > max || /[/?#]/u.test(text)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be ${String(min)}-${String(max)} characters and not a URL or expression.`)
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

function parseCountryArrayEnvelope(value: unknown): RestCountriesCountry[] {
  if (isNotFoundEnvelope(value)) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'REST Countries response was not a country array.', { provider: 'restcountries', response: value })
  }
  return value.map(parseCountryObject)
}

function parseCountryObject(value: unknown): RestCountriesCountry {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'REST Countries country entry had an unexpected schema.', { provider: 'restcountries', response: value })
  }
  const name = isRecord(value.name) ? value.name : {}
  const flags = isRecord(value.flags) ? value.flags : {}
  return {
    commonName: readRequiredString(name, 'common'),
    ...readOptionalStringAs(name, 'official', 'officialName'),
    cca2: readRequiredString(value, 'cca2'),
    cca3: readRequiredString(value, 'cca3'),
    capital: readStringArray(value.capital),
    ...readOptionalStringAs(value, 'region', 'region'),
    ...readOptionalStringAs(value, 'subregion', 'subregion'),
    ...readOptionalNumberAs(value, 'population', 'population'),
    ...readOptionalNumberAs(value, 'area', 'area'),
    languages: readRecordValues(value.languages),
    currencies: readCurrencyValues(value.currencies),
    ...readOptionalStringAs(flags, 'png', 'flagPng'),
    ...readOptionalStringAs(flags, 'svg', 'flagSvg'),
    ...readOptionalStringAs(flags, 'alt', 'flagAlt'),
  }
}

function isNotFoundEnvelope(value: unknown): boolean {
  return isRecord(value) && value.status === 404
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `REST Countries response did not include ${key}.`, { provider: 'restcountries', response: record })
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

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '').map(entry => entry.trim()) : []
}

function readRecordValues(value: unknown): string[] {
  if (!isRecord(value)) {
    return []
  }
  return Object.values(value).filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '').map(entry => entry.trim())
}

function readCurrencyValues(value: unknown): string[] {
  if (!isRecord(value)) {
    return []
  }
  return Object.entries(value).map(([code, entry]) => {
    const name = isRecord(entry) && typeof entry.name === 'string' ? entry.name : code
    return `${code} ${name}`.trim()
  })
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
