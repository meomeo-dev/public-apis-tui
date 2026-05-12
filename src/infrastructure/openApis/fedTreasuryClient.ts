import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FED_TREASURY_DEFAULT_BASE_URL = 'https://api.fiscaldata.treasury.gov'
export const FED_TREASURY_DEFAULT_PAGE_NUMBER = 1
export const FED_TREASURY_DEFAULT_PAGE_SIZE = 100
export const FED_TREASURY_MAX_PAGE_SIZE = 100
export const FED_TREASURY_DEFAULT_SORT = '-record_date'
export const FED_TREASURY_DEBT_ENDPOINT = '/services/api/fiscal_service/v2/accounting/od/debt_to_penny'
export const FED_TREASURY_RATES_ENDPOINT = '/services/api/fiscal_service/v2/accounting/od/avg_interest_rates'

const DEBT_FIELDS = 'record_date,tot_pub_debt_out_amt,intragov_hold_amt,debt_held_public_amt'
const RATES_FIELDS = 'record_date,security_desc,avg_interest_rate_amt,src_line_nbr'

export type FedTreasuryDebtInput = {
  pageNumber?: number | undefined
  pageSize?: number | undefined
  recordDate?: string | undefined
}

export type NormalizedFedTreasuryDebtInput = {
  pageNumber: number
  pageSize: number
  recordDate?: string | undefined
}

export type FedTreasuryRatesInput = {
  pageNumber?: number | undefined
  pageSize?: number | undefined
  recordDate?: string | undefined
  securityDesc?: string | undefined
}

export type NormalizedFedTreasuryRatesInput = {
  pageNumber: number
  pageSize: number
  recordDate?: string | undefined
  securityDesc?: string | undefined
}

export type FedTreasuryMeta = {
  count?: number | undefined
  totalCount?: number | undefined
  totalPages?: number | undefined
  labels: Record<string, string>
  dataTypes: Record<string, string>
}

export type FedTreasuryDebtRow = {
  recordDate: string
  totalPublicDebtOutstanding?: number | undefined
  intragovernmentalHoldings?: number | undefined
  debtHeldByPublic?: number | undefined
}

export type FedTreasuryRateRow = {
  recordDate: string
  securityDescription: string
  averageInterestRate?: number | undefined
  sourceLineNumber?: number | undefined
}

export type FedTreasuryDebtResponse = {
  meta: FedTreasuryMeta
  links: Record<string, unknown>
  rows: FedTreasuryDebtRow[]
}

export type FedTreasuryRatesResponse = {
  meta: FedTreasuryMeta
  links: Record<string, unknown>
  rows: FedTreasuryRateRow[]
}

export class FedTreasuryClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getDebt(input: NormalizedFedTreasuryDebtInput): Promise<FedTreasuryDebtResponse> {
    const url = this.createUrl(FED_TREASURY_DEBT_ENDPOINT, input.pageNumber, input.pageSize, DEBT_FIELDS, FED_TREASURY_DEFAULT_SORT)
    if (input.recordDate !== undefined) {
      url.searchParams.set('filter', `record_date:eq:${input.recordDate}`)
    }
    const parsed = await this.fetchJson(url)
    return parseDebtResponse(parsed)
  }

  async getRates(input: NormalizedFedTreasuryRatesInput): Promise<FedTreasuryRatesResponse> {
    const url = this.createUrl(FED_TREASURY_RATES_ENDPOINT, input.pageNumber, input.pageSize, RATES_FIELDS, `${FED_TREASURY_DEFAULT_SORT},src_line_nbr`)
    const filters: string[] = []
    if (input.recordDate !== undefined) {
      filters.push(`record_date:eq:${input.recordDate}`)
    }
    if (input.securityDesc !== undefined) {
      filters.push(`security_desc:eq:${input.securityDesc}`)
    }
    if (filters.length > 0) {
      url.searchParams.set('filter', filters.join(','))
    }
    const parsed = await this.fetchJson(url)
    return parseRatesResponse(parsed)
  }

  private createUrl(pathname: string, pageNumber: number, pageSize: number, fields: string, sort: string): URL {
    const url = new URL(pathname, this.options.baseUrl ?? FED_TREASURY_DEFAULT_BASE_URL)
    url.searchParams.set('fields', fields)
    url.searchParams.set('sort', sort)
    url.searchParams.set('page[number]', String(pageNumber))
    url.searchParams.set('page[size]', String(pageSize))
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Fed Treasury request failed: ${String(error)}`, {
        provider: 'fedtreasury',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Fed Treasury returned a non-JSON response: ${String(error)}`, {
        provider: 'fedtreasury',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Fed Treasury request failed with HTTP ${response.status}.`, {
        provider: 'fedtreasury',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeFedTreasuryDebtInput(input: FedTreasuryDebtInput = {}): NormalizedFedTreasuryDebtInput {
  const normalized: NormalizedFedTreasuryDebtInput = {
    pageNumber: normalizePageNumber(input.pageNumber),
    pageSize: normalizePageSize(input.pageSize),
  }
  const recordDate = normalizeOptionalDate(input.recordDate, '--record-date')
  if (recordDate !== undefined) {
    normalized.recordDate = recordDate
  }
  return normalized
}

export function normalizeFedTreasuryRatesInput(input: FedTreasuryRatesInput = {}): NormalizedFedTreasuryRatesInput {
  const normalized: NormalizedFedTreasuryRatesInput = {
    pageNumber: normalizePageNumber(input.pageNumber),
    pageSize: normalizePageSize(input.pageSize),
  }
  const recordDate = normalizeOptionalDate(input.recordDate, '--record-date')
  if (recordDate !== undefined) {
    normalized.recordDate = recordDate
  }
  const securityDesc = normalizeOptionalString(input.securityDesc)
  if (securityDesc !== undefined) {
    normalized.securityDesc = securityDesc
  }
  return normalized
}

function normalizePageNumber(value: number | undefined): number {
  const pageNumber = value ?? FED_TREASURY_DEFAULT_PAGE_NUMBER
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--page-number must be a positive integer.')
  }
  return pageNumber
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = value ?? FED_TREASURY_DEFAULT_PAGE_SIZE
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > FED_TREASURY_MAX_PAGE_SIZE) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--page-size must be an integer from 1 to ${FED_TREASURY_MAX_PAGE_SIZE}.`)
  }
  return pageSize
}

function normalizeOptionalDate(value: string | undefined, label: string): string | undefined {
  const normalized = normalizeOptionalString(value)
  if (normalized === undefined) {
    return undefined
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must use YYYY-MM-DD format.`)
  }
  return normalized
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized
}

function parseDebtResponse(value: unknown): FedTreasuryDebtResponse {
  const envelope = parseEnvelope(value)
  return {
    meta: envelope.meta,
    links: envelope.links,
    rows: envelope.data.map(parseDebtRow),
  }
}

function parseRatesResponse(value: unknown): FedTreasuryRatesResponse {
  const envelope = parseEnvelope(value)
  return {
    meta: envelope.meta,
    links: envelope.links,
    rows: envelope.data.map(parseRateRow),
  }
}

function parseEnvelope(value: unknown): { meta: FedTreasuryMeta; links: Record<string, unknown>; data: unknown[] } {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Fed Treasury response had an unexpected schema.')
  }
  return {
    meta: parseMeta(value.meta),
    links: isRecord(value.links) ? value.links : {},
    data: value.data,
  }
}

function parseMeta(value: unknown): FedTreasuryMeta {
  if (!isRecord(value)) {
    return { labels: {}, dataTypes: {} }
  }
  return {
    count: readNumber(value.count),
    totalCount: readNumber(value['total-count']),
    totalPages: readNumber(value['total-pages']),
    labels: parseStringRecord(value.labels),
    dataTypes: parseStringRecord(value.dataTypes),
  }
}

function parseDebtRow(value: unknown): FedTreasuryDebtRow {
  if (!isRecord(value) || typeof value.record_date !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Fed Treasury debt row had an unexpected schema.')
  }
  return {
    recordDate: value.record_date,
    totalPublicDebtOutstanding: readNumber(value.tot_pub_debt_out_amt),
    intragovernmentalHoldings: readNumber(value.intragov_hold_amt),
    debtHeldByPublic: readNumber(value.debt_held_public_amt),
  }
}

function parseRateRow(value: unknown): FedTreasuryRateRow {
  if (!isRecord(value) || typeof value.record_date !== 'string' || typeof value.security_desc !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Fed Treasury rate row had an unexpected schema.')
  }
  return {
    recordDate: value.record_date,
    securityDescription: value.security_desc,
    averageInterestRate: readNumber(value.avg_interest_rate_amt),
    sourceLineNumber: readNumber(value.src_line_nbr),
  }
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      result[key] = entry
    }
  }
  return result
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
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
