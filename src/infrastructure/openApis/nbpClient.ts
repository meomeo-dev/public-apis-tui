import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NBP_DEFAULT_BASE_URL = 'https://api.nbp.pl'
export const NBP_DEFAULT_TABLE = 'A'
export const NBP_TABLES_DEFAULT_LIMIT = 120
export const NBP_TABLES_MAX_LIMIT = 120
export const NBP_DEFAULT_CODE = 'USD'
export const NBP_HISTORY_DEFAULT_COUNT = 93
export const NBP_HISTORY_MAX_COUNT = 93

export type NbpTableInput = {
  table?: string | undefined
  code?: string | undefined
  limit?: number | undefined
}

export type NormalizedNbpTableInput = {
  table: 'A' | 'B' | 'C'
  code: string
  limit: number
}

export type NbpHistoryInput = {
  table?: string | undefined
  code?: string | undefined
  count?: number | undefined
}

export type NormalizedNbpHistoryInput = {
  table: 'A' | 'B' | 'C'
  code: string
  count: number
}

export type NbpRate = {
  currency?: string | undefined
  code?: string | undefined
  no?: string | undefined
  effectiveDate?: string | undefined
  mid?: number | undefined
  bid?: number | undefined
  ask?: number | undefined
}

export type NbpTable = {
  table: string
  no?: string | undefined
  tradingDate?: string | undefined
  effectiveDate?: string | undefined
  rates: NbpRate[]
}

export type NbpHistory = {
  table: string
  currency?: string | undefined
  code: string
  rates: NbpRate[]
}

export class NbpClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async table(input: NormalizedNbpTableInput): Promise<NbpTable> {
    const url = this.createUrl(`/api/exchangerates/tables/${input.table.toLowerCase()}/`)
    url.searchParams.set('format', 'json')
    const body = await this.fetchJson(url)
    if (!Array.isArray(body) || !isRecord(body[0])) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'NBP table response was not a JSON array with one table.', { provider: 'nbp' })
    }
    const table = normalizeTable(body[0])
    const rates = input.code === '' ? table.rates : table.rates.filter(rate => rate.code === input.code)
    return { ...table, rates: rates.slice(0, input.limit) }
  }

  async history(input: NormalizedNbpHistoryInput): Promise<NbpHistory> {
    const url = this.createUrl(`/api/exchangerates/rates/${input.table.toLowerCase()}/${input.code.toLowerCase()}/last/${input.count}/`)
    url.searchParams.set('format', 'json')
    const body = await this.fetchJson(url)
    if (!isRecord(body) || !Array.isArray(body.rates)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'NBP history response was not a JSON object with rates.', { provider: 'nbp' })
    }
    return {
      table: String(body.table ?? input.table).toUpperCase(),
      currency: typeof body.currency === 'string' ? body.currency : undefined,
      code: typeof body.code === 'string' ? body.code.toUpperCase() : input.code,
      rates: body.rates.filter(isRecord).flatMap(record => normalizeRate(record)),
    }
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.options.baseUrl ?? NBP_DEFAULT_BASE_URL)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NBP request failed: ${String(error)}`, { provider: 'nbp', endpoint: url.href })
    }
    const body = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NBP request failed with HTTP ${response.status}.`, { provider: 'nbp', endpoint: url.href, status: response.status, response: body.slice(0, 500) })
    }
    try {
      return JSON.parse(body) as unknown
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NBP returned invalid JSON: ${String(error)}`, { provider: 'nbp', endpoint: url.href, response: body.slice(0, 500) })
    }
  }
}

export function normalizeNbpTableInput(input: NbpTableInput = {}): NormalizedNbpTableInput {
  return {
    table: normalizeTableName(input.table ?? NBP_DEFAULT_TABLE),
    code: normalizeOptionalCode(input.code),
    limit: normalizeLimit(input.limit ?? NBP_TABLES_DEFAULT_LIMIT, '--limit', NBP_TABLES_MAX_LIMIT),
  }
}

export function normalizeNbpHistoryInput(input: NbpHistoryInput = {}): NormalizedNbpHistoryInput {
  return {
    table: normalizeTableName(input.table ?? NBP_DEFAULT_TABLE),
    code: normalizeRequiredCode(input.code ?? NBP_DEFAULT_CODE),
    count: normalizeLimit(input.count ?? NBP_HISTORY_DEFAULT_COUNT, '--count', NBP_HISTORY_MAX_COUNT),
  }
}

function normalizeTable(value: Record<string, unknown>): NbpTable {
  return {
    table: String(value.table ?? '').toUpperCase(),
    no: typeof value.no === 'string' ? value.no : undefined,
    tradingDate: typeof value.tradingDate === 'string' ? value.tradingDate : undefined,
    effectiveDate: typeof value.effectiveDate === 'string' ? value.effectiveDate : undefined,
    rates: Array.isArray(value.rates) ? value.rates.filter(isRecord).flatMap(record => normalizeRate(record)) : [],
  }
}

function normalizeRate(record: Record<string, unknown>): NbpRate[] {
  const code = typeof record.code === 'string' ? record.code.toUpperCase() : undefined
  return [{
    currency: typeof record.currency === 'string' ? record.currency : undefined,
    code,
    no: typeof record.no === 'string' ? record.no : undefined,
    effectiveDate: typeof record.effectiveDate === 'string' ? record.effectiveDate : undefined,
    mid: parseNumber(record.mid),
    bid: parseNumber(record.bid),
    ask: parseNumber(record.ask),
  }]
}

function normalizeTableName(value: string): 'A' | 'B' | 'C' {
  const table = value.trim().toUpperCase()
  if (table === 'A' || table === 'B' || table === 'C') {
    return table
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--table must be A, B, or C.', { value, supported: ['A', 'B', 'C'] })
}

function normalizeOptionalCode(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  return normalizeRequiredCode(value)
}

function normalizeRequiredCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency code must be a three-letter ISO code, e.g. USD.', { value })
  }
  return code
}

function normalizeLimit(value: number, flag: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${flag} must be an integer between 1 and ${max}.`, { value, max })
  }
  return value
}

function parseNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
