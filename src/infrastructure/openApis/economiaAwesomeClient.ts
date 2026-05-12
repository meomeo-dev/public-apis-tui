import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ECONOMIA_AWESOME_DEFAULT_BASE_URL = 'https://economia.awesomeapi.com.br'
export const ECONOMIA_AWESOME_DEFAULT_PAIRS = 'USD-BRL,EUR-BRL,BTC-BRL'
export const ECONOMIA_AWESOME_MAX_PAIRS = 20
export const ECONOMIA_AWESOME_DEFAULT_PAIR = 'USD-BRL'
export const ECONOMIA_AWESOME_DEFAULT_DAYS = 360
export const ECONOMIA_AWESOME_MAX_DAYS = 360

export type EconomiaAwesomeLatestInput = {
  pairs?: string | undefined
}

export type NormalizedEconomiaAwesomeLatestInput = {
  pairs: string[]
}

export type EconomiaAwesomeDailyInput = {
  pair?: string | undefined
  days?: number | undefined
}

export type NormalizedEconomiaAwesomeDailyInput = {
  pair: string
  days: number
}

export type EconomiaAwesomeQuote = {
  pair: string
  code: string
  codeIn: string
  name?: string | undefined
  high?: number | undefined
  low?: number | undefined
  variation?: number | undefined
  percentChange?: number | undefined
  bid?: number | undefined
  ask?: number | undefined
  timestamp?: number | undefined
  createDate?: string | undefined
}

export class EconomiaAwesomeClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async latest(input: NormalizedEconomiaAwesomeLatestInput): Promise<EconomiaAwesomeQuote[]> {
    const url = this.createUrl(`/json/last/${input.pairs.join(',')}`)
    const body = await this.fetchJson(url)
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Economia.Awesome latest response was not a JSON object.', { provider: 'economiaawesome' })
    }
    return Object.values(body).filter(isRecord).map(record => normalizeQuote(record)).sort((left, right) => left.pair.localeCompare(right.pair))
  }

  async daily(input: NormalizedEconomiaAwesomeDailyInput): Promise<EconomiaAwesomeQuote[]> {
    const url = this.createUrl(`/json/daily/${input.pair}/${input.days}`)
    const body = await this.fetchJson(url)
    if (!Array.isArray(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Economia.Awesome daily response was not a JSON array.', { provider: 'economiaawesome' })
    }
    return body.filter(isRecord).map(record => normalizeQuote(record, input.pair))
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.options.baseUrl ?? ECONOMIA_AWESOME_DEFAULT_BASE_URL)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Economia.Awesome request failed: ${String(error)}`, { provider: 'economiaawesome', endpoint: url.href })
    }
    const body = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Economia.Awesome request failed with HTTP ${response.status}.`, { provider: 'economiaawesome', endpoint: url.href, status: response.status, response: body.slice(0, 500) })
    }
    try {
      return JSON.parse(body) as unknown
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Economia.Awesome returned invalid JSON: ${String(error)}`, { provider: 'economiaawesome', endpoint: url.href, response: body.slice(0, 500) })
    }
  }
}

export function normalizeEconomiaAwesomeLatestInput(input: EconomiaAwesomeLatestInput = {}): NormalizedEconomiaAwesomeLatestInput {
  return {
    pairs: normalizePairs(input.pairs ?? ECONOMIA_AWESOME_DEFAULT_PAIRS),
  }
}

export function normalizeEconomiaAwesomeDailyInput(input: EconomiaAwesomeDailyInput = {}): NormalizedEconomiaAwesomeDailyInput {
  return {
    pair: normalizePair(input.pair ?? ECONOMIA_AWESOME_DEFAULT_PAIR),
    days: normalizeDays(input.days ?? ECONOMIA_AWESOME_DEFAULT_DAYS),
  }
}

function normalizePairs(value: string): string[] {
  const pairs = [...new Set(value.split(',').map(entry => normalizePair(entry)))]
  if (pairs.length === 0 || pairs.length > ECONOMIA_AWESOME_MAX_PAIRS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--pairs must include between 1 and ${ECONOMIA_AWESOME_MAX_PAIRS} currency pairs.`, { value, max: ECONOMIA_AWESOME_MAX_PAIRS })
  }
  return pairs
}

function normalizePair(value: string): string {
  const pair = value.trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}-[A-Z0-9]{2,10}$/u.test(pair)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency pair must be formatted as BASE-QUOTE, e.g. USD-BRL.', { value })
  }
  return pair
}

function normalizeDays(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > ECONOMIA_AWESOME_MAX_DAYS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--days must be an integer between 1 and ${ECONOMIA_AWESOME_MAX_DAYS}.`, { value, max: ECONOMIA_AWESOME_MAX_DAYS })
  }
  return value
}

function normalizeQuote(record: Record<string, unknown>, fallbackPair?: string | undefined): EconomiaAwesomeQuote {
  const [fallbackCode = '', fallbackCodeIn = ''] = fallbackPair?.split('-') ?? []
  const code = String(record.code ?? fallbackCode).toUpperCase()
  const codeIn = String(record.codein ?? fallbackCodeIn).toUpperCase()
  const pair = code !== '' && codeIn !== '' ? `${code}-${codeIn}` : String(record.pair ?? fallbackPair ?? '-')
  return {
    pair,
    code,
    codeIn,
    name: typeof record.name === 'string' ? record.name : code !== '' && codeIn !== '' ? `${code}/${codeIn}` : undefined,
    high: parseNumber(record.high),
    low: parseNumber(record.low),
    variation: parseNumber(record.varBid),
    percentChange: parseNumber(record.pctChange),
    bid: parseNumber(record.bid),
    ask: parseNumber(record.ask),
    timestamp: parseInteger(record.timestamp),
    createDate: typeof record.create_date === 'string' ? record.create_date : undefined,
  }
}

function parseNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseInteger(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
