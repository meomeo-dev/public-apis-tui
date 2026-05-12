import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FRANKFURTER_DEFAULT_BASE_URL = 'https://api.frankfurter.dev'
export const FRANKFURTER_DEFAULT_BASE = 'EUR'
export const FRANKFURTER_DEFAULT_QUOTE = 'USD'
export const FRANKFURTER_DEFAULT_SCOPE = 'all'
export const FRANKFURTER_DEFAULT_LIMIT = 200
export const FRANKFURTER_MAX_LIMIT = 200
export const FRANKFURTER_DEFAULT_AMOUNT = 1

export type FrankfurterCurrenciesInput = {
  scope?: string | undefined
  search?: string | undefined
  limit?: number | undefined
}

export type NormalizedFrankfurterCurrenciesInput = {
  scope: 'active' | 'all'
  search: string
  limit: number
}

export type FrankfurterRatesInput = {
  base?: string | undefined
  quotes?: string | undefined
  date?: string | undefined
  limit?: number | undefined
}

export type NormalizedFrankfurterRatesInput = {
  base: string
  quotes: string[]
  date: string
  limit: number
}

export type FrankfurterConvertInput = {
  base?: string | undefined
  quote?: string | undefined
  amount?: number | undefined
  date?: string | undefined
}

export type NormalizedFrankfurterConvertInput = {
  base: string
  quote: string
  amount: number
  date: string
}

export type FrankfurterCurrency = {
  code: string
  numeric?: string | undefined
  name?: string | undefined
  symbol?: string | undefined
  startDate?: string | undefined
  endDate?: string | undefined
}

export type FrankfurterRate = {
  date: string
  base: string
  quote: string
  rate: number
}

export class FrankfurterClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async currencies(input: NormalizedFrankfurterCurrenciesInput): Promise<FrankfurterCurrency[]> {
    const url = this.createUrl('/v2/currencies')
    url.searchParams.set('scope', input.scope)
    const body = await this.fetchJson(url)
    if (!Array.isArray(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Frankfurter currencies response was not a JSON array.', { provider: 'frankfurter' })
    }
    const currencies = body.filter(isRecord).flatMap(record => normalizeCurrency(record))
    const search = input.search.toLowerCase()
    const filtered = search === '' ? currencies : currencies.filter(currency => `${currency.code} ${currency.name ?? ''}`.toLowerCase().includes(search))
    return filtered.slice(0, input.limit)
  }

  async rates(input: NormalizedFrankfurterRatesInput): Promise<FrankfurterRate[]> {
    const url = this.createUrl('/v2/rates')
    url.searchParams.set('base', input.base)
    if (input.quotes.length > 0) {
      url.searchParams.set('quotes', input.quotes.join(','))
    }
    if (input.date !== '') {
      url.searchParams.set('from', input.date)
      url.searchParams.set('to', input.date)
    }
    const body = await this.fetchJson(url)
    if (!Array.isArray(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Frankfurter rates response was not a JSON array.', { provider: 'frankfurter' })
    }
    return dedupeRates(body.filter(isRecord).flatMap(record => normalizeRate(record))).slice(0, input.limit)
  }

  async convert(input: NormalizedFrankfurterConvertInput): Promise<FrankfurterRate & { amount: number; converted: number }> {
    const url = this.createUrl(`/v2/rate/${input.base}/${input.quote}`)
    if (input.date !== '') {
      url.searchParams.set('date', input.date)
    }
    const body = await this.fetchJson(url)
    if (!isRecord(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Frankfurter rate response was not a JSON object.', { provider: 'frankfurter' })
    }
    const rate = normalizeRate(body)[0]
    if (rate === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Frankfurter rate response did not include a numeric rate.', { provider: 'frankfurter' })
    }
    return { ...rate, amount: input.amount, converted: input.amount * rate.rate }
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.options.baseUrl ?? FRANKFURTER_DEFAULT_BASE_URL)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Frankfurter request failed: ${String(error)}`, { provider: 'frankfurter', endpoint: url.href })
    }
    const body = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Frankfurter request failed with HTTP ${response.status}.`, { provider: 'frankfurter', endpoint: url.href, status: response.status, response: body.slice(0, 500) })
    }
    try {
      return JSON.parse(body) as unknown
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Frankfurter returned invalid JSON: ${String(error)}`, { provider: 'frankfurter', endpoint: url.href, response: body.slice(0, 500) })
    }
  }
}

export function normalizeFrankfurterCurrenciesInput(input: FrankfurterCurrenciesInput = {}): NormalizedFrankfurterCurrenciesInput {
  return {
    scope: normalizeScope(input.scope ?? FRANKFURTER_DEFAULT_SCOPE),
    search: input.search?.trim() ?? '',
    limit: normalizeLimit(input.limit ?? FRANKFURTER_DEFAULT_LIMIT),
  }
}

export function normalizeFrankfurterRatesInput(input: FrankfurterRatesInput = {}): NormalizedFrankfurterRatesInput {
  return {
    base: normalizeCurrencyCode(input.base ?? FRANKFURTER_DEFAULT_BASE),
    quotes: normalizeQuotes(input.quotes),
    date: normalizeDate(input.date),
    limit: normalizeLimit(input.limit ?? FRANKFURTER_DEFAULT_LIMIT),
  }
}

export function normalizeFrankfurterConvertInput(input: FrankfurterConvertInput = {}): NormalizedFrankfurterConvertInput {
  const normalized = {
    base: normalizeCurrencyCode(input.base ?? FRANKFURTER_DEFAULT_BASE),
    quote: normalizeCurrencyCode(input.quote ?? FRANKFURTER_DEFAULT_QUOTE),
    amount: normalizeAmount(input.amount ?? FRANKFURTER_DEFAULT_AMOUNT),
    date: normalizeDate(input.date),
  }
  if (normalized.base === normalized.quote) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--base and --quote must be different currency codes.', { base: normalized.base, quote: normalized.quote })
  }
  return normalized
}

function normalizeCurrency(record: Record<string, unknown>): FrankfurterCurrency[] {
  const code = typeof record.iso_code === 'string' ? record.iso_code.toUpperCase() : ''
  return code === '' ? [] : [{
    code,
    numeric: typeof record.iso_numeric === 'string' ? record.iso_numeric : undefined,
    name: typeof record.name === 'string' ? record.name : undefined,
    symbol: typeof record.symbol === 'string' ? record.symbol : undefined,
    startDate: typeof record.start_date === 'string' ? record.start_date : undefined,
    endDate: typeof record.end_date === 'string' ? record.end_date : undefined,
  }]
}

function normalizeRate(record: Record<string, unknown>): FrankfurterRate[] {
  if (typeof record.date !== 'string' || typeof record.base !== 'string' || typeof record.quote !== 'string' || typeof record.rate !== 'number') {
    return []
  }
  return [{ date: record.date, base: record.base.toUpperCase(), quote: record.quote.toUpperCase(), rate: record.rate }]
}

function dedupeRates(rates: FrankfurterRate[]): FrankfurterRate[] {
  const seen = new Set<string>()
  const deduped: FrankfurterRate[] = []
  for (const rate of rates) {
    const key = `${rate.date}:${rate.base}:${rate.quote}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(rate)
    }
  }
  return deduped
}

function normalizeScope(value: string): 'active' | 'all' {
  if (value === 'active' || value === 'all') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--scope must be active or all.', { value, supported: ['active', 'all'] })
}

function normalizeQuotes(value: string | undefined): string[] {
  if (value === undefined || value.trim() === '') {
    return []
  }
  return [...new Set(value.split(',').map(normalizeCurrencyCode))]
}

function normalizeCurrencyCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency code must be a three-letter ISO code, e.g. USD.', { value })
  }
  return code
}

function normalizeDate(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Date must be formatted as YYYY-MM-DD.', { value })
  }
  return value
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > FRANKFURTER_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${FRANKFURTER_MAX_LIMIT}.`, { value, max: FRANKFURTER_MAX_LIMIT })
  }
  return value
}

function normalizeAmount(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--amount must be a positive number.', { value })
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
