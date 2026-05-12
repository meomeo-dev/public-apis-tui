import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const VATCOMPLY_DEFAULT_BASE_URL = 'https://api.vatcomply.com'
export const VATCOMPLY_DEFAULT_BASE = 'EUR'
export const VATCOMPLY_RATES_DEFAULT_LIMIT = 33
export const VATCOMPLY_RATES_MAX_LIMIT = 33
export const VATCOMPLY_VAT_RATES_DEFAULT_LIMIT = 27
export const VATCOMPLY_VAT_RATES_MAX_LIMIT = 27

export type VatComplyRatesInput = {
  base?: string | undefined
  symbols?: string | undefined
  date?: string | undefined
  limit?: number | undefined
}

export type NormalizedVatComplyRatesInput = {
  base: string
  symbols: string[]
  date: string
  limit: number
}

export type VatComplyVatRatesInput = {
  countryCode?: string | undefined
  limit?: number | undefined
}

export type NormalizedVatComplyVatRatesInput = {
  countryCode: string
  limit: number
}

export type VatComplyVatInput = {
  vatNumber?: string | undefined
}

export type NormalizedVatComplyVatInput = {
  vatNumber: string
}

export type VatComplyRate = {
  code: string
  rate: number
}

export type VatComplyRates = {
  date: string
  base: string
  rates: VatComplyRate[]
}

export type VatComplyVatRate = {
  countryCode: string
  countryName: string
  standardRate: number
  reducedRates: number[]
  superReducedRate?: number | undefined
  parkingRate?: number | undefined
  currency?: string | undefined
  memberState?: boolean | undefined
  rateCommentCount: number
  rateCategoryCount: number
}

export type VatComplyLocation = {
  iso2?: string | undefined
  iso3?: string | undefined
  countryCode?: string | undefined
  name?: string | undefined
  numericCode?: number | undefined
  phoneCode?: string | undefined
  capital?: string | undefined
  currency?: string | undefined
  tld?: string | undefined
  region?: string | undefined
  subregion?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  emoji?: string | undefined
  ip?: string | undefined
}

export type VatComplyVatValidation = {
  valid: boolean
  vatNumber?: string | undefined
  countryCode?: string | undefined
  name?: string | undefined
  address?: string | undefined
}

export class VatComplyClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async rates(input: NormalizedVatComplyRatesInput): Promise<VatComplyRates> {
    const url = this.createUrl('/rates')
    url.searchParams.set('base', input.base)
    if (input.symbols.length > 0) url.searchParams.set('symbols', input.symbols.join(','))
    if (input.date !== '') url.searchParams.set('date', input.date)
    const body = await this.fetchJson(url)
    if (!isRecord(body) || !isRecord(body.rates)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'VATComply rates response was not a JSON object with rates.', { provider: 'vatcomply' })
    }
    const rates = Object.entries(body.rates)
      .flatMap(([code, value]) => normalizeRate(code, value))
      .slice(0, input.limit)
    return {
      date: typeof body.date === 'string' ? body.date : input.date,
      base: typeof body.base === 'string' ? body.base.toUpperCase() : input.base,
      rates,
    }
  }

  async vatRates(input: NormalizedVatComplyVatRatesInput): Promise<VatComplyVatRate[]> {
    const url = this.createUrl('/vat_rates')
    if (input.countryCode !== '') url.searchParams.set('country_code', input.countryCode)
    const body = await this.fetchJson(url)
    if (!Array.isArray(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'VATComply VAT rates response was not a JSON array.', { provider: 'vatcomply' })
    }
    return body.filter(isRecord).flatMap(entry => normalizeVatRate(entry)).slice(0, input.limit)
  }

  async geolocate(): Promise<VatComplyLocation> {
    const body = await this.fetchJson(this.createUrl('/geolocate'))
    if (!isRecord(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'VATComply geolocate response was not a JSON object.', { provider: 'vatcomply' })
    }
    return normalizeLocation(body)
  }

  async vat(input: NormalizedVatComplyVatInput): Promise<VatComplyVatValidation> {
    const url = this.createUrl('/vat')
    url.searchParams.set('vat_number', input.vatNumber)
    const body = await this.fetchJson(url)
    if (!isRecord(body) || typeof body.valid !== 'boolean') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'VATComply VAT validation response was not a JSON object with valid.', { provider: 'vatcomply' })
    }
    return normalizeVatValidation(body)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.options.baseUrl ?? VATCOMPLY_DEFAULT_BASE_URL)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `VATComply request failed: ${String(error)}`, { provider: 'vatcomply', endpoint: url.href })
    }
    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `VATComply returned a non-JSON response: ${String(error)}`, { provider: 'vatcomply', endpoint: url.href, status: response.status })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `VATComply request failed with HTTP ${response.status}.`, { provider: 'vatcomply', endpoint: url.href, status: response.status, response: parsed })
    }
    return parsed
  }
}

export function normalizeVatComplyRatesInput(input: VatComplyRatesInput = {}): NormalizedVatComplyRatesInput {
  return {
    base: normalizeCurrencyCode(input.base ?? VATCOMPLY_DEFAULT_BASE),
    symbols: normalizeSymbols(input.symbols),
    date: normalizeOptionalDate(input.date),
    limit: normalizeLimit(input.limit ?? VATCOMPLY_RATES_DEFAULT_LIMIT, '--limit', VATCOMPLY_RATES_MAX_LIMIT),
  }
}

export function normalizeVatComplyVatRatesInput(input: VatComplyVatRatesInput = {}): NormalizedVatComplyVatRatesInput {
  return {
    countryCode: normalizeOptionalCountryCode(input.countryCode),
    limit: normalizeLimit(input.limit ?? VATCOMPLY_VAT_RATES_DEFAULT_LIMIT, '--limit', VATCOMPLY_VAT_RATES_MAX_LIMIT),
  }
}

export function normalizeVatComplyVatInput(input: VatComplyVatInput = {}): NormalizedVatComplyVatInput {
  const vatNumber = input.vatNumber?.trim().replace(/\s+/gu, '').toUpperCase() ?? ''
  if (!/^[A-Z]{2}[A-Z0-9]{2,14}$/u.test(vatNumber)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--vat-number must include a two-letter country prefix and VAT identifier, e.g. IE6388047V.', { value: input.vatNumber })
  }
  return { vatNumber }
}

function normalizeSymbols(value: string | undefined): string[] {
  if (value === undefined || value.trim() === '') {
    return []
  }
  const symbols = value.split(',').map(symbol => normalizeCurrencyCode(symbol)).filter(Boolean)
  return [...new Set(symbols)]
}

function normalizeCurrencyCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency code must be a three-letter ISO code, e.g. EUR.', { value })
  }
  return code
}

function normalizeOptionalCountryCode(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  const countryCode = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(countryCode)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--country-code must be a two-letter ISO country code, e.g. DE.', { value })
  }
  return countryCode
}

function normalizeOptionalDate(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--date must be YYYY-MM-DD when provided.', { value })
  }
  return date
}

function normalizeLimit(value: number, flag: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${flag} must be an integer between 1 and ${max}.`, { value, max })
  }
  return value
}

function normalizeRate(code: string, value: unknown): VatComplyRate[] {
  const rate = Number(value)
  if (!Number.isFinite(rate)) return []
  return [{ code: code.toUpperCase(), rate }]
}

function normalizeVatRate(value: Record<string, unknown>): VatComplyVatRate[] {
  const countryCode = typeof value.country_code === 'string' ? value.country_code.toUpperCase() : ''
  const countryName = typeof value.country_name === 'string' ? value.country_name : ''
  const standardRate = Number(value.standard_rate)
  if (countryCode === '' || countryName === '' || !Number.isFinite(standardRate)) return []
  return [{
    countryCode,
    countryName,
    standardRate,
    reducedRates: Array.isArray(value.reduced_rates) ? value.reduced_rates.map(Number).filter(Number.isFinite) : [],
    superReducedRate: parseOptionalNumber(value.super_reduced_rate),
    parkingRate: parseOptionalNumber(value.parking_rate),
    currency: typeof value.currency === 'string' ? value.currency.toUpperCase() : undefined,
    memberState: typeof value.member_state === 'boolean' ? value.member_state : undefined,
    rateCommentCount: isRecord(value.rate_comments) ? Object.values(value.rate_comments).flatMap(entry => Array.isArray(entry) ? entry : [entry]).length : 0,
    rateCategoryCount: isRecord(value.rate_categories) ? Object.keys(value.rate_categories).length : 0,
  }]
}

function normalizeLocation(value: Record<string, unknown>): VatComplyLocation {
  return {
    iso2: readString(value.iso2),
    iso3: readString(value.iso3),
    countryCode: readString(value.country_code),
    name: readString(value.name),
    numericCode: parseOptionalNumber(value.numeric_code),
    phoneCode: readString(value.phone_code),
    capital: readString(value.capital),
    currency: readString(value.currency),
    tld: readString(value.tld),
    region: readString(value.region),
    subregion: readString(value.subregion),
    latitude: parseOptionalNumber(value.latitude),
    longitude: parseOptionalNumber(value.longitude),
    emoji: readString(value.emoji),
    ip: readString(value.ip),
  }
}

function normalizeVatValidation(value: Record<string, unknown>): VatComplyVatValidation {
  return {
    valid: value.valid === true,
    vatNumber: readString(value.vat_number),
    countryCode: readString(value.country_code),
    name: readString(value.name),
    address: readString(value.address),
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
