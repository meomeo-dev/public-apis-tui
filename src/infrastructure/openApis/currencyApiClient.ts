import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CURRENCY_API_DEFAULT_BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'
export const CURRENCY_API_FALLBACK_HOST_SUFFIX = '.currency-api.pages.dev'
export const CURRENCY_API_DEFAULT_DATE = 'latest'
export const CURRENCY_API_DEFAULT_BASE = 'usd'
export const CURRENCY_API_DEFAULT_LIMIT = 301
export const CURRENCY_API_MAX_LIMIT = 301

export type CurrencyApiCurrenciesInput = {
  search?: string | undefined
  limit?: number | undefined
}

export type NormalizedCurrencyApiCurrenciesInput = {
  search: string
  limit: number
}

export type CurrencyApiRatesInput = {
  base?: string | undefined
  date?: string | undefined
  symbols?: string | undefined
  limit?: number | undefined
}

export type NormalizedCurrencyApiRatesInput = {
  base: string
  date: string
  symbols: string[]
  limit: number
}

export type CurrencyApiCurrency = {
  code: string
  name?: string | undefined
}

export type CurrencyApiRate = {
  code: string
  rate: number
}

export type CurrencyApiRates = {
  date?: string | undefined
  base: string
  rates: CurrencyApiRate[]
}

export class CurrencyApiClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async currencies(input: NormalizedCurrencyApiCurrenciesInput): Promise<CurrencyApiCurrency[]> {
    const parsed = await this.fetchJson(createPrimaryUrl(this.options.baseUrl, 'latest', '/v1/currencies.json'), createFallbackUrl('latest', '/v1/currencies.json'))
    const currencies = parseCurrencies(parsed)
    const filtered = input.search === '' ? currencies : currencies.filter(currency => currency.code.includes(input.search))
    return filtered.slice(0, input.limit)
  }

  async rates(input: NormalizedCurrencyApiRatesInput): Promise<CurrencyApiRates> {
    const path = `/v1/currencies/${input.base}.json`
    const parsed = await this.fetchJson(createPrimaryUrl(this.options.baseUrl, input.date, path), createFallbackUrl(input.date, path))
    const result = parseRates(parsed, input.base)
    const symbolSet = new Set(input.symbols)
    const filtered = symbolSet.size === 0 ? result.rates : result.rates.filter(rate => symbolSet.has(rate.code))
    return { ...result, rates: filtered.slice(0, input.limit) }
  }

  private async fetchJson(primaryUrl: URL, fallbackUrl: URL): Promise<unknown> {
    try {
      return await this.fetchJsonOnce(primaryUrl)
    } catch (primaryError) {
      try {
        return await this.fetchJsonOnce(fallbackUrl)
      } catch (fallbackError) {
        throw new RuntimeFailure('OPEN_API_FAILED', `Currency-api request failed via primary and fallback endpoints: ${String(primaryError)}; ${String(fallbackError)}`, {
          provider: 'currencyapi',
          primaryEndpoint: primaryUrl.href,
          fallbackEndpoint: fallbackUrl.href,
        })
      }
    }
  }

  private async fetchJsonOnce(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Currency-api request failed: ${String(error)}`, { provider: 'currencyapi', endpoint: url.href })
    }
    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Currency-api returned a non-JSON response: ${String(error)}`, { provider: 'currencyapi', endpoint: url.href, status: response.status })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Currency-api request failed with HTTP ${response.status}.`, { provider: 'currencyapi', endpoint: url.href, status: response.status, response: parsed })
    }
    return parsed
  }
}

export function normalizeCurrencyApiCurrenciesInput(input: CurrencyApiCurrenciesInput = {}): NormalizedCurrencyApiCurrenciesInput {
  return {
    search: normalizeSearch(input.search),
    limit: normalizeLimit(input.limit ?? CURRENCY_API_DEFAULT_LIMIT),
  }
}

export function normalizeCurrencyApiRatesInput(input: CurrencyApiRatesInput = {}): NormalizedCurrencyApiRatesInput {
  return {
    base: normalizeCurrencyCode(input.base ?? CURRENCY_API_DEFAULT_BASE),
    date: normalizeDate(input.date ?? CURRENCY_API_DEFAULT_DATE),
    symbols: normalizeSymbols(input.symbols),
    limit: normalizeLimit(input.limit ?? CURRENCY_API_DEFAULT_LIMIT),
  }
}

function createPrimaryUrl(baseUrl: string | undefined, date: string, path: string): URL {
  return new URL(`${baseUrl ?? CURRENCY_API_DEFAULT_BASE_URL}@${date}${path}`)
}

function createFallbackUrl(date: string, path: string): URL {
  return new URL(`https://${date}${CURRENCY_API_FALLBACK_HOST_SUFFIX}${path}`)
}

function parseCurrencies(value: unknown): CurrencyApiCurrency[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '').map(code => ({ code: code.toLowerCase() }))
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([code, name]) => ({ code: code.toLowerCase(), name }))
  }
  throw new RuntimeFailure('OPEN_API_FAILED', 'Currency-api currencies response must be a JSON object or array.', { provider: 'currencyapi' })
}

function parseRates(value: unknown, base: string): CurrencyApiRates {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Currency-api rates response must be a JSON object.', { provider: 'currencyapi' })
  }
  const ratesObject = isRecord(value[base]) ? value[base] : undefined
  if (ratesObject === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Currency-api rates response is missing base field ${base}.`, { provider: 'currencyapi', base })
  }
  return {
    date: typeof value.date === 'string' ? value.date : undefined,
    base,
    rates: Object.entries(ratesObject)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
      .map(([code, rate]) => ({ code: code.toLowerCase(), rate })),
  }
}

function normalizeSearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function normalizeSymbols(value: string | undefined): string[] {
  return (value ?? '').split(',').map(symbol => symbol.trim().toLowerCase()).filter(symbol => symbol !== '').map(normalizeCurrencyCode)
}

function normalizeCurrencyCode(value: string): string {
  const code = value.trim().toLowerCase()
  if (!/^[a-z0-9]{2,12}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency code must be 2-12 lowercase letters/digits, e.g. usd, eur, btc, or 1inch.', { value })
  }
  return code
}

function normalizeDate(value: string): string {
  const date = value.trim().toLowerCase()
  if (date === 'latest' || /^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    return date
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--date must be latest or YYYY-MM-DD.', { value })
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > CURRENCY_API_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${CURRENCY_API_MAX_LIMIT}.`, { value, max: CURRENCY_API_MAX_LIMIT })
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
