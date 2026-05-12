import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NAGER_DATE_DEFAULT_BASE_URL = 'https://date.nager.at/api/v3'
export const NAGER_DATE_DEFAULT_COUNTRY_CODE = 'US'
export const NAGER_DATE_DEFAULT_COUNTRY_LIMIT = 250
export const NAGER_DATE_MAX_COUNTRY_LIMIT = 250

export type NagerDateCountriesQuery = {
  query?: string | undefined
  limit: number
}

export type NagerDateHolidaysQuery = {
  year: number
  countryCode: string
  county?: string | undefined
  type?: string | undefined
}

export type NagerDateCountry = {
  countryCode: string
  name: string
}

export type NagerDateHoliday = {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[]
  launchYear?: number | undefined
  types: string[]
}

export class NagerDateClient {
  constructor(private readonly baseUrl = NAGER_DATE_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async listCountries(query: NagerDateCountriesQuery): Promise<NagerDateCountry[]> {
    const url = this.createUrl('/availablecountries')
    const data = await this.fetchJson(url)
    const countries = parseCountries(data)
    const queryText = query.query
    const filtered = queryText === undefined
      ? countries
      : countries.filter(country => matchesText([country.countryCode, country.name], queryText))
    return filtered.slice(0, query.limit)
  }

  async listPublicHolidays(query: NagerDateHolidaysQuery): Promise<NagerDateHoliday[]> {
    const url = this.createUrl(`/publicholidays/${query.year}/${encodeURIComponent(query.countryCode)}`)
    const data = await this.fetchJson(url)
    return parseHolidays(data)
      .filter(holiday => query.county === undefined || holiday.global || holiday.counties.includes(query.county))
      .filter(holiday => query.type === undefined || holiday.types.some(type => type.toLocaleLowerCase('en') === query.type?.toLocaleLowerCase('en')))
  }

  private createUrl(pathname: string): URL {
    const normalizedBase = normalizeBaseUrl(this.baseUrl)
    return new URL(`${normalizedBase}${pathname.startsWith('/') ? pathname : `/${pathname}`}`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nager.Date request failed: ${String(error)}`, {
        provider: 'nagerdate',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nager.Date request failed with HTTP ${response.status}.`, {
        provider: 'nagerdate',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nager.Date response was not JSON: ${String(error)}`, {
        provider: 'nagerdate',
        url: url.toString(),
      })
    }
  }
}

export function normalizeNagerDateCountriesQuery(input: { query?: string | undefined; limit?: number | undefined } = {}): NagerDateCountriesQuery {
  return {
    ...(input.query !== undefined && input.query.trim() !== '' ? { query: input.query.trim() } : {}),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeNagerDateHolidaysQuery(input: {
  year?: number | undefined
  countryCode?: string | undefined
  county?: string | undefined
  type?: string | undefined
} = {}): NagerDateHolidaysQuery {
  const countryCode = normalizeCountryCode(input.countryCode)
  return {
    year: normalizeYear(input.year),
    countryCode,
    ...(input.county !== undefined && input.county.trim() !== '' ? { county: input.county.trim().toUpperCase() } : {}),
    ...(input.type !== undefined && input.type.trim() !== '' ? { type: input.type.trim() } : {}),
  }
}

function parseCountries(value: unknown): NagerDateCountry[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Nager.Date countries response was not an array.')
  }
  return value.filter(isRecord).flatMap(entry => {
    if (typeof entry.countryCode !== 'string' || typeof entry.name !== 'string') {
      return []
    }
    return [{ countryCode: entry.countryCode, name: entry.name }]
  })
}

function parseHolidays(value: unknown): NagerDateHoliday[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Nager.Date holidays response was not an array.')
  }
  return value.filter(isRecord).flatMap(entry => {
    if (typeof entry.date !== 'string' || typeof entry.localName !== 'string' || typeof entry.name !== 'string' || typeof entry.countryCode !== 'string') {
      return []
    }
    return [{
      date: entry.date,
      localName: entry.localName,
      name: entry.name,
      countryCode: entry.countryCode,
      fixed: entry.fixed === true,
      global: entry.global === true,
      counties: Array.isArray(entry.counties) ? entry.counties.filter((county): county is string => typeof county === 'string') : [],
      ...(typeof entry.launchYear === 'number' ? { launchYear: entry.launchYear } : {}),
      types: Array.isArray(entry.types) ? entry.types.filter((type): type is string => typeof type === 'string') : [],
    }]
  })
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) {
    return NAGER_DATE_DEFAULT_COUNTRY_LIMIT
  }
  if (!Number.isInteger(value) || value < 1 || value > NAGER_DATE_MAX_COUNTRY_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Nager.Date limit must be between 1 and ${NAGER_DATE_MAX_COUNTRY_LIMIT}.`, {
      limit: value,
      max: NAGER_DATE_MAX_COUNTRY_LIMIT,
    })
  }
  return value
}

function normalizeYear(value: number | undefined): number {
  if (value === undefined) {
    return getNagerDateDefaultYear()
  }
  if (!Number.isInteger(value) || value < 1900 || value > 9999) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Nager.Date year must be between 1900 and 9999.', { year: value })
  }
  return value
}

export function getNagerDateDefaultYear(today = new Date()): number {
  return today.getFullYear()
}

function normalizeCountryCode(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return NAGER_DATE_DEFAULT_COUNTRY_CODE
  }
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Nager.Date country code must be a two-letter ISO 3166-1 alpha-2 code.', {
      countryCode: value,
    })
  }
  return normalized
}

function matchesText(values: string[], query: string): boolean {
  const needle = query.toLocaleLowerCase('en')
  return values.some(value => value.toLocaleLowerCase('en').includes(needle))
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
