import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NAMEDAYS_DEFAULT_BASE_URL = 'https://nameday.abalin.net/api'
export const NAMEDAYS_DEFAULT_DATE_LABEL = 'today'
export const NAMEDAYS_DEFAULT_NAME = 'John'
export const NAMEDAYS_DEFAULT_COUNTRY_LIMIT = 30
export const NAMEDAYS_MAX_COUNTRY_LIMIT = 30
export const NAMEDAYS_DEFAULT_MATCH_LIMIT = 20
export const NAMEDAYS_MAX_MATCH_LIMIT = 50

export type NamedaysDateQuery = {
  day: number
  month: number
  country?: string | undefined
  limit: number
}

export type NamedaysNameQuery = {
  name: string
  country?: string | undefined
  limit: number
}

export type NamedaysCountryNames = {
  country: string
  names: string
}

export type NamedaysNameMatch = {
  country: string
  day: number
  month: number
  names: string
}

export class NamedaysClient {
  constructor(private readonly baseUrl = NAMEDAYS_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async getDate(query: NamedaysDateQuery): Promise<NamedaysCountryNames[]> {
    const url = this.createUrl('/V2/date')
    url.searchParams.set('day', String(query.day))
    url.searchParams.set('month', String(query.month))
    const data = await this.fetchJson(url)
    const countries = parseDateResponse(data)
    const filtered = query.country === undefined
      ? countries
      : countries.filter(entry => entry.country === query.country)
    return filtered.slice(0, query.limit)
  }

  async getName(query: NamedaysNameQuery): Promise<NamedaysNameMatch[]> {
    const url = this.createUrl('/V2/getname')
    const data = await this.fetchJson(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ name: query.name }),
    })
    const matches = parseNameResponse(data)
    const filtered = query.country === undefined
      ? matches
      : matches.filter(entry => entry.country === query.country)
    return filtered.slice(0, query.limit)
  }

  private createUrl(pathname: string): URL {
    return new URL(`${normalizeBaseUrl(this.baseUrl)}${pathname.startsWith('/') ? pathname : `/${pathname}`}`)
  }

  private async fetchJson(url: URL, init?: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, init ?? { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Namedays request failed: ${String(error)}`, {
        provider: 'namedays',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      const reason = await readNamedaysErrorSummary(response)
      throw new RuntimeFailure('OPEN_API_FAILED', `Namedays request failed with HTTP ${response.status}${reason === undefined ? '' : `: ${reason}`}.`, {
        provider: 'namedays',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Namedays response was not JSON: ${String(error)}`, {
        provider: 'namedays',
        url: url.toString(),
      })
    }
  }
}

export function normalizeNamedaysDateQuery(input: { day?: number | undefined; month?: number | undefined; country?: string | undefined; limit?: number | undefined } = {}): NamedaysDateQuery {
  const defaults = getNamedaysDefaultDateParts()
  const day = normalizeDay(input.day, defaults.day)
  const month = normalizeMonth(input.month, defaults.month)
  assertValidMonthDay(day, month)
  return {
    day,
    month,
    ...(input.country !== undefined && input.country.trim() !== '' ? { country: normalizeCountry(input.country) } : {}),
    limit: normalizeLimit(input.limit, NAMEDAYS_DEFAULT_COUNTRY_LIMIT, NAMEDAYS_MAX_COUNTRY_LIMIT, 'limit'),
  }
}

export function normalizeNamedaysNameQuery(input: { name?: string | undefined; country?: string | undefined; limit?: number | undefined } = {}): NamedaysNameQuery {
  return {
    name: normalizeName(input.name),
    ...(input.country !== undefined && input.country.trim() !== '' ? { country: normalizeCountry(input.country) } : {}),
    limit: normalizeLimit(input.limit, NAMEDAYS_DEFAULT_MATCH_LIMIT, NAMEDAYS_MAX_MATCH_LIMIT, 'limit'),
  }
}

function parseDateResponse(value: unknown): NamedaysCountryNames[] {
  const data = readEnvelopeData(value, 'Namedays date response')
  if (!isRecord(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Namedays date response data was not an object.')
  }
  return Object.entries(data)
    .filter(([, names]) => typeof names === 'string')
    .map(([country, names]) => ({ country, names: String(names) }))
}

function parseNameResponse(value: unknown): NamedaysNameMatch[] {
  const data = readEnvelopeData(value, 'Namedays name response')
  if (!Array.isArray(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Namedays name response data was not an array.')
  }
  const matches: NamedaysNameMatch[] = []
  for (const countryEntry of data.filter(isRecord)) {
    if (typeof countryEntry.country !== 'string') {
      continue
    }
    for (const [key, rawMatch] of Object.entries(countryEntry)) {
      if (key === 'country' || !isRecord(rawMatch)) {
        continue
      }
      if (typeof rawMatch.day === 'number' && typeof rawMatch.month === 'number' && typeof rawMatch.name === 'string') {
        matches.push({
          country: countryEntry.country,
          day: rawMatch.day,
          month: rawMatch.month,
          names: rawMatch.name,
        })
      }
    }
  }
  return matches
}

function readEnvelopeData(value: unknown, label: string): unknown {
  if (!isRecord(value) || value.success !== true || !('data' in value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} envelope was invalid.`)
  }
  return value.data
}

export function getNamedaysDefaultDateParts(today = new Date()): { day: number; month: number } {
  return {
    day: today.getDate(),
    month: today.getMonth() + 1,
  }
}

function normalizeDay(value: number | undefined, defaultDay: number): number {
  if (value === undefined) {
    return defaultDay
  }
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Namedays day must be between 1 and 31.', { day: value })
  }
  return value
}

function normalizeMonth(value: number | undefined, defaultMonth: number): number {
  if (value === undefined) {
    return defaultMonth
  }
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Namedays month must be between 1 and 12.', { month: value })
  }
  return value
}

function normalizeName(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return NAMEDAYS_DEFAULT_NAME
  }
  const normalized = value.trim()
  if (normalized.length < 2 || normalized.length > 15) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Namedays name must be 2 to 15 characters.', { name: value })
  }
  return normalized
}

function normalizeCountry(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Namedays country must be a two-letter lowercase country code from the API response.', { country: value })
  }
  return normalized
}

function normalizeLimit(value: number | undefined, defaultValue: number, max: number, label: string): number {
  if (value === undefined) {
    return defaultValue
  }
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Namedays ${label} must be between 1 and ${max}.`, { [label]: value, max })
  }
  return value
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

async function readNamedaysErrorSummary(response: Response): Promise<string | undefined> {
  let body = ''
  try {
    body = (await response.text()).trim()
  } catch {
    return undefined
  }
  if (body === '') {
    return undefined
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(body)
      if (isRecord(parsed) && typeof parsed.message === 'string' && parsed.message.trim() !== '') {
        return parsed.message.trim()
      }
    } catch {
      // Fall through to a text summary.
    }
  }

  if (/<!doctype html|<html\b/iu.test(body)) {
    return 'HTML error page'
  }

  const summary = body.replace(/\s+/gu, ' ').trim()
  return summary === '' ? undefined : summary.slice(0, 160)
}

function assertValidMonthDay(day: number, month: number): void {
  const parsed = new Date(Date.UTC(2024, month - 1, day))
  if (parsed.getUTCDate() !== day || parsed.getUTCMonth() + 1 !== month) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Namedays day/month must form a valid calendar date.', {
      day,
      month,
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
