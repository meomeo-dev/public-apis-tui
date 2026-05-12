import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MF_API_DEFAULT_BASE_URL = 'https://api.mfapi.in'
export const MF_API_DEFAULT_QUERY = 'SBI Small Cap'
export const MF_API_DEFAULT_SCHEME_CODE = 125497
export const MF_API_DEFAULT_LIMIT = 100
export const MF_API_MAX_LIMIT = 100

export type MfApiSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedMfApiSearchInput = {
  query: string
  limit: number
}

export type MfApiLatestInput = {
  schemeCode?: number | string | undefined
}

export type NormalizedMfApiLatestInput = {
  schemeCode: number
}

export type MfApiSchemeSummary = {
  schemeCode: number
  schemeName: string
}

export type MfApiMeta = {
  fundHouse?: string | undefined
  schemeType?: string | undefined
  schemeCategory?: string | undefined
  schemeCode?: number | undefined
  schemeName?: string | undefined
  isinGrowth?: string | undefined
  isinDivReinvestment?: string | undefined
}

export type MfApiNavPoint = {
  date: string
  nav: number
}

export type MfApiLatestResponse = {
  meta: MfApiMeta
  data: MfApiNavPoint[]
  status?: string | undefined
}

export class MfApiClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchSchemes(input: NormalizedMfApiSearchInput): Promise<MfApiSchemeSummary[]> {
    const url = new URL('/mf/search', this.options.baseUrl ?? MF_API_DEFAULT_BASE_URL)
    url.searchParams.set('q', input.query)
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'MFapi search response had an unexpected schema.')
    }
    return parsed.map(parseSchemeSummary).slice(0, input.limit)
  }

  async getLatest(input: NormalizedMfApiLatestInput): Promise<MfApiLatestResponse> {
    const parsed = await this.fetchJson(new URL(`/mf/${input.schemeCode}/latest`, this.options.baseUrl ?? MF_API_DEFAULT_BASE_URL))
    return parseLatestResponse(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `MFapi request failed: ${String(error)}`, {
        provider: 'mfapi',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `MFapi returned a non-JSON response: ${String(error)}`, {
        provider: 'mfapi',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `MFapi request failed with HTTP ${response.status}.`, {
        provider: 'mfapi',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeMfApiSearchInput(input: MfApiSearchInput = {}): NormalizedMfApiSearchInput {
  const query = input.query?.trim() ?? MF_API_DEFAULT_QUERY
  if (query.length < 2) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must contain at least 2 characters.')
  }
  return {
    query,
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeMfApiLatestInput(input: MfApiLatestInput = {}): NormalizedMfApiLatestInput {
  return {
    schemeCode: normalizeSchemeCode(input.schemeCode ?? MF_API_DEFAULT_SCHEME_CODE),
  }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? MF_API_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > MF_API_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${MF_API_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeSchemeCode(value: number | string): number {
  const schemeCode = typeof value === 'number' ? value : Number(value.trim())
  if (!Number.isInteger(schemeCode) || schemeCode < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--scheme-code must be a positive integer.')
  }
  return schemeCode
}

function parseSchemeSummary(value: unknown): MfApiSchemeSummary {
  if (!isRecord(value) || typeof value.schemeCode !== 'number' || typeof value.schemeName !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MFapi scheme summary had an unexpected schema.')
  }
  return {
    schemeCode: value.schemeCode,
    schemeName: value.schemeName,
  }
}

function parseLatestResponse(value: unknown): MfApiLatestResponse {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MFapi latest NAV response had an unexpected schema.')
  }
  return {
    meta: parseMeta(value.meta),
    data: value.data.map(parseNavPoint),
    status: optionalString(value.status),
  }
}

function parseMeta(value: unknown): MfApiMeta {
  if (!isRecord(value)) {
    return {}
  }
  return {
    fundHouse: optionalString(value.fund_house),
    schemeType: optionalString(value.scheme_type),
    schemeCategory: optionalString(value.scheme_category),
    schemeCode: typeof value.scheme_code === 'number' ? value.scheme_code : undefined,
    schemeName: optionalString(value.scheme_name),
    isinGrowth: optionalString(value.isin_growth),
    isinDivReinvestment: optionalString(value.isin_div_reinvestment),
  }
}

function parseNavPoint(value: unknown): MfApiNavPoint {
  if (!isRecord(value) || typeof value.date !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MFapi NAV row had an unexpected schema.')
  }
  const nav = typeof value.nav === 'number' ? value.nav : typeof value.nav === 'string' ? Number(value.nav) : Number.NaN
  if (!Number.isFinite(nav)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MFapi NAV row had an unexpected schema.')
  }
  return {
    date: value.date,
    nav,
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.error) ?? optionalString(value.message)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
