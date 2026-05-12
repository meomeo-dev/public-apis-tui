import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BNM_DEFAULT_BASE_URL = 'https://api.bnm.gov.my'
export const BNM_ACCEPT_HEADER = 'application/vnd.BNM.API.v1+json'
export const BNM_DEFAULT_LIMIT = 27
export const BNM_MAX_LIMIT = 27
export const BNM_DEFAULT_CURRENCY = 'USD'

export type BnmExchangeRatesInput = {
  currencyCode?: string | undefined
  limit?: number | undefined
}

export type NormalizedBnmExchangeRatesInput = {
  currencyCode?: string | undefined
  limit: number
}

export type BnmMeta = {
  lastUpdated?: string | undefined
  totalResult?: number | undefined
  quote?: string | undefined
  session?: string | undefined
}

export type BnmOpr = {
  year?: number | undefined
  date?: string | undefined
  changeInOpr?: number | undefined
  newOprLevel?: number | undefined
}

export type BnmExchangeRate = {
  currencyCode: string
  unit?: number | undefined
  date?: string | undefined
  buyingRate?: number | undefined
  sellingRate?: number | undefined
  middleRate?: number | null | undefined
}

export type BnmKijangEmas = {
  effectiveDate?: string | undefined
  oneOz?: BnmGoldQuote | undefined
  halfOz?: BnmGoldQuote | undefined
  quarterOz?: BnmGoldQuote | undefined
}

export type BnmGoldQuote = {
  buying?: number | undefined
  selling?: number | undefined
}

export type BnmResponse<T> = {
  data: T
  meta: BnmMeta
}

export class BankNegaraMalaysiaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getOpr(): Promise<BnmResponse<BnmOpr>> {
    const parsed = await this.fetchJson(new URL('/public/opr', this.options.baseUrl ?? BNM_DEFAULT_BASE_URL))
    return parseOprResponse(parsed)
  }

  async getExchangeRates(input: NormalizedBnmExchangeRatesInput): Promise<BnmResponse<BnmExchangeRate[]>> {
    const path = input.currencyCode === undefined ? '/public/exchange-rate' : `/public/exchange-rate/${encodeURIComponent(input.currencyCode)}`
    const parsed = await this.fetchJson(new URL(path, this.options.baseUrl ?? BNM_DEFAULT_BASE_URL))
    const response = parseExchangeRatesResponse(parsed)
    return { data: response.data.slice(0, input.limit), meta: response.meta }
  }

  async getKijangEmas(): Promise<BnmResponse<BnmKijangEmas>> {
    const parsed = await this.fetchJson(new URL('/public/kijang-emas', this.options.baseUrl ?? BNM_DEFAULT_BASE_URL))
    return parseKijangEmasResponse(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: BNM_ACCEPT_HEADER } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Bank Negara Malaysia request failed: ${String(error)}`, {
        provider: 'banknegaramalaysia',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Bank Negara Malaysia returned a non-JSON response: ${String(error)}`, {
        provider: 'banknegaramalaysia',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? `Bank Negara Malaysia request failed with HTTP ${response.status}.`, {
        provider: 'banknegaramalaysia',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeBnmExchangeRatesInput(input: BnmExchangeRatesInput = {}): NormalizedBnmExchangeRatesInput {
  return {
    ...(input.currencyCode !== undefined ? { currencyCode: normalizeCurrencyCode(input.currencyCode) } : {}),
    limit: normalizeLimit(input.limit),
  }
}

function parseOprResponse(value: unknown): BnmResponse<BnmOpr> {
  const record = parseEnvelope(value)
  return {
    data: parseOpr(record.data),
    meta: parseMeta(record.meta),
  }
}

function parseExchangeRatesResponse(value: unknown): BnmResponse<BnmExchangeRate[]> {
  const record = parseEnvelope(value)
  const rates = Array.isArray(record.data) ? record.data.map(parseExchangeRate) : [parseExchangeRate(record.data)]
  return {
    data: rates,
    meta: parseMeta(record.meta),
  }
}

function parseKijangEmasResponse(value: unknown): BnmResponse<BnmKijangEmas> {
  const record = parseEnvelope(value)
  if (!isRecord(record.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bank Negara Malaysia Kijang Emas response had an unexpected schema.')
  }
  return {
    data: {
      effectiveDate: optionalString(record.data.effective_date),
      oneOz: parseGoldQuote(record.data.one_oz),
      halfOz: parseGoldQuote(record.data.half_oz),
      quarterOz: parseGoldQuote(record.data.quarter_oz),
    },
    meta: parseMeta(record.meta),
  }
}

function parseEnvelope(value: unknown): { data: unknown; meta: unknown } {
  if (!isRecord(value) || value.data === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bank Negara Malaysia response had an unexpected schema.')
  }
  return { data: value.data, meta: value.meta }
}

function parseOpr(value: unknown): BnmOpr {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bank Negara Malaysia OPR response had an unexpected schema.')
  }
  return {
    year: optionalNumber(value.year),
    date: optionalString(value.date),
    changeInOpr: optionalNumber(value.change_in_opr),
    newOprLevel: optionalNumber(value.new_opr_level),
  }
}

function parseExchangeRate(value: unknown): BnmExchangeRate {
  if (!isRecord(value) || typeof value.currency_code !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Bank Negara Malaysia exchange-rate response had an unexpected schema.')
  }
  const rate = isRecord(value.rate) ? value.rate : {}
  return {
    currencyCode: value.currency_code,
    unit: optionalNumber(value.unit),
    date: optionalString(rate.date),
    buyingRate: optionalNumber(rate.buying_rate),
    sellingRate: optionalNumber(rate.selling_rate),
    middleRate: rate.middle_rate === null ? null : optionalNumber(rate.middle_rate),
  }
}

function parseGoldQuote(value: unknown): BnmGoldQuote | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    buying: optionalNumber(value.buying),
    selling: optionalNumber(value.selling),
  }
}

function parseMeta(value: unknown): BnmMeta {
  if (!isRecord(value)) {
    return {}
  }
  return {
    lastUpdated: optionalString(value.last_updated),
    totalResult: optionalNumber(value.total_result),
    quote: optionalString(value.quote),
    session: optionalString(value.session),
  }
}

function normalizeCurrencyCode(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--currency-code must be a 3-letter ISO currency code.')
  }
  return normalized
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? BNM_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > BNM_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${BNM_MAX_LIMIT}.`)
  }
  return limit
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.error)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
