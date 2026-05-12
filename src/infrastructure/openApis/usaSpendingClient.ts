import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const USA_SPENDING_DEFAULT_BASE_URL = 'https://api.usaspending.gov'
export const USA_SPENDING_DEFAULT_START_DATE = '2024-10-01'
export const USA_SPENDING_DEFAULT_END_DATE = '2025-09-30'
export const USA_SPENDING_AWARDS_DEFAULT_LIMIT = 100
export const USA_SPENDING_AWARDS_MAX_LIMIT = 100
export const USA_SPENDING_AGENCIES_DEFAULT_LIMIT = 100
export const USA_SPENDING_AGENCIES_MAX_LIMIT = 200
export const USA_SPENDING_DEFAULT_AWARD_TYPE_CODES = ['A', 'B', 'C', 'D'] as const

export type UsaSpendingAwardsInput = {
  startDate?: string | undefined
  endDate?: string | undefined
  awardTypeCodes?: string | undefined
  recipient?: string | undefined
  awardingAgency?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  sort?: string | undefined
  order?: string | undefined
}

export type NormalizedUsaSpendingAwardsInput = {
  startDate: string
  endDate: string
  awardTypeCodes: string[]
  recipient?: string | undefined
  awardingAgency?: string | undefined
  limit: number
  page: number
  sort: string
  order: 'asc' | 'desc'
}

export type UsaSpendingOverTimeInput = {
  startDate?: string | undefined
  endDate?: string | undefined
  awardTypeCodes?: string | undefined
  recipient?: string | undefined
  awardingAgency?: string | undefined
  group?: string | undefined
}

export type NormalizedUsaSpendingOverTimeInput = {
  startDate: string
  endDate: string
  awardTypeCodes: string[]
  recipient?: string | undefined
  awardingAgency?: string | undefined
  group: 'calendar_year' | 'fiscal_year' | 'quarter' | 'month'
}

export type UsaSpendingAgenciesInput = {
  sort?: string | undefined
  order?: string | undefined
  limit?: number | undefined
}

export type NormalizedUsaSpendingAgenciesInput = {
  sort: string
  order: 'asc' | 'desc'
  limit: number
}

export type UsaSpendingAward = {
  internalId?: number | undefined
  awardId?: string | undefined
  recipientName?: string | undefined
  awardAmount?: number | undefined
  awardingAgency?: string | undefined
  startDate?: string | undefined
  endDate?: string | undefined
  description?: string | undefined
  agencySlug?: string | undefined
  generatedInternalId?: string | undefined
}

export type UsaSpendingPageMetadata = {
  page?: number | undefined
  total?: number | undefined
  limit?: number | undefined
  hasNextPage?: boolean | undefined
  hasPreviousPage?: boolean | undefined
  next?: string | undefined
  previous?: string | undefined
}

export type UsaSpendingAwardsResponse = {
  spendingLevel: string
  limit: number
  pageMetadata: UsaSpendingPageMetadata
  messages: string[]
  results: UsaSpendingAward[]
}

export type UsaSpendingTimeResult = {
  label: string
  aggregatedAmount?: number | undefined
  totalOutlays?: number | undefined
  contractObligations?: number | undefined
  grantObligations?: number | undefined
  loanObligations?: number | undefined
  directObligations?: number | undefined
  otherObligations?: number | undefined
}

export type UsaSpendingOverTimeResponse = {
  group: string
  spendingLevel: string
  messages: string[]
  results: UsaSpendingTimeResult[]
}

export type UsaSpendingAgency = {
  agencyId: number
  toptierCode?: string | undefined
  abbreviation?: string | undefined
  agencyName: string
  agencySlug?: string | undefined
  activeFy?: string | undefined
  activeFq?: string | undefined
  budgetAuthorityAmount?: number | undefined
  currentTotalBudgetAuthorityAmount?: number | undefined
  obligatedAmount?: number | undefined
  outlayAmount?: number | undefined
  percentageOfTotalBudgetAuthority?: number | undefined
  congressionalJustificationUrl?: string | undefined
}

export class UsaSpendingClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchAwards(input: NormalizedUsaSpendingAwardsInput): Promise<UsaSpendingAwardsResponse> {
    const parsed = await this.fetchJson('/api/v2/search/spending_by_award/', {
      method: 'POST',
      body: JSON.stringify({
        subawards: false,
        spending_level: 'awards',
        limit: input.limit,
        page: input.page,
        sort: input.sort,
        order: input.order,
        fields: [
          'Award ID',
          'Recipient Name',
          'Award Amount',
          'Awarding Agency',
          'Start Date',
          'End Date',
          'Description',
        ],
        filters: createAdvancedFilters(input),
      }),
    })
    return parseAwardsResponse(parsed)
  }

  async readSpendingOverTime(input: NormalizedUsaSpendingOverTimeInput): Promise<UsaSpendingOverTimeResponse> {
    const parsed = await this.fetchJson('/api/v2/search/spending_over_time/', {
      method: 'POST',
      body: JSON.stringify({
        group: input.group,
        subawards: false,
        spending_level: 'awards',
        filters: createAdvancedFilters(input),
      }),
    })
    return parseOverTimeResponse(parsed)
  }

  async listToptierAgencies(input: NormalizedUsaSpendingAgenciesInput): Promise<UsaSpendingAgency[]> {
    const url = this.createUrl('/api/v2/references/toptier_agencies/')
    url.searchParams.set('sort', input.sort)
    url.searchParams.set('order', input.order)
    const parsed = await this.fetchUrlJson(url, { method: 'GET' })
    return parseAgenciesResponse(parsed).slice(0, input.limit)
  }

  private async fetchJson(pathname: string, init: RequestInit): Promise<unknown> {
    return this.fetchUrlJson(this.createUrl(pathname), init)
  }

  private createUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? USA_SPENDING_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchUrlJson(url: URL, init: RequestInit): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        ...init,
        headers: {
          accept: 'application/json',
          ...(init.method === 'POST' ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `USAspending request failed: ${String(error)}`, {
        provider: 'usaspending',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `USAspending returned a non-JSON response: ${String(error)}`, {
        provider: 'usaspending',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `USAspending request failed with HTTP ${response.status}.`, {
        provider: 'usaspending',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeUsaSpendingAwardsInput(input: UsaSpendingAwardsInput = {}): NormalizedUsaSpendingAwardsInput {
  return {
    ...normalizeSharedSearchInput(input),
    limit: normalizeLimit(input.limit, USA_SPENDING_AWARDS_DEFAULT_LIMIT, USA_SPENDING_AWARDS_MAX_LIMIT, '--limit'),
    page: normalizePage(input.page),
    sort: normalizeSort(input.sort ?? 'Award Amount', ['Award Amount', 'Recipient Name', 'Awarding Agency', 'Start Date', 'End Date']),
    order: normalizeOrder(input.order),
  }
}

export function normalizeUsaSpendingOverTimeInput(input: UsaSpendingOverTimeInput = {}): NormalizedUsaSpendingOverTimeInput {
  const group = input.group ?? 'fiscal_year'
  if (!['calendar_year', 'fiscal_year', 'quarter', 'month'].includes(group)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--group must be calendar_year, fiscal_year, quarter, or month.')
  }
  return {
    ...normalizeSharedSearchInput(input),
    group: group as NormalizedUsaSpendingOverTimeInput['group'],
  }
}

export function normalizeUsaSpendingAgenciesInput(input: UsaSpendingAgenciesInput = {}): NormalizedUsaSpendingAgenciesInput {
  return {
    sort: normalizeSort(input.sort ?? 'budget_authority_amount', ['budget_authority_amount', 'obligated_amount', 'outlay_amount', 'percentage_of_total_budget_authority', 'agency_name']),
    order: normalizeOrder(input.order),
    limit: normalizeLimit(input.limit, USA_SPENDING_AGENCIES_DEFAULT_LIMIT, USA_SPENDING_AGENCIES_MAX_LIMIT, '--limit'),
  }
}

function normalizeSharedSearchInput(input: UsaSpendingAwardsInput | UsaSpendingOverTimeInput) {
  const startDate = normalizeDate(input.startDate ?? USA_SPENDING_DEFAULT_START_DATE, '--start-date')
  const endDate = normalizeDate(input.endDate ?? USA_SPENDING_DEFAULT_END_DATE, '--end-date')
  if (startDate > endDate) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--start-date must be on or before --end-date.')
  }
  const recipient = normalizeOptionalString(input.recipient)
  const awardingAgency = normalizeOptionalString(input.awardingAgency)
  return {
    startDate,
    endDate,
    awardTypeCodes: normalizeAwardTypeCodes(input.awardTypeCodes),
    ...(recipient !== undefined ? { recipient } : {}),
    ...(awardingAgency !== undefined ? { awardingAgency } : {}),
  }
}

function createAdvancedFilters(input: NormalizedUsaSpendingAwardsInput | NormalizedUsaSpendingOverTimeInput): Record<string, unknown> {
  return {
    time_period: [{ start_date: input.startDate, end_date: input.endDate }],
    award_type_codes: input.awardTypeCodes,
    ...(input.recipient !== undefined ? { recipient_search_text: [input.recipient] } : {}),
    ...(input.awardingAgency !== undefined ? { agencies: [{ type: 'awarding', tier: 'toptier', name: input.awardingAgency }] } : {}),
  }
}

function parseAwardsResponse(value: unknown): UsaSpendingAwardsResponse {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'USAspending awards response had an unexpected schema.')
  }
  return {
    spendingLevel: optionalString(value.spending_level) ?? 'awards',
    limit: readNumber(value.limit) ?? USA_SPENDING_AWARDS_DEFAULT_LIMIT,
    pageMetadata: parsePageMetadata(value.page_metadata),
    messages: readStringArray(value.messages),
    results: value.results.filter(isRecord).map(parseAward),
  }
}

function parseAward(value: Record<string, unknown>): UsaSpendingAward {
  return {
    internalId: readNumber(value.internal_id),
    awardId: optionalString(value['Award ID']),
    recipientName: optionalString(value['Recipient Name']),
    awardAmount: readNumber(value['Award Amount']),
    awardingAgency: optionalString(value['Awarding Agency']),
    startDate: optionalString(value['Start Date']),
    endDate: optionalString(value['End Date']),
    description: optionalString(value.Description),
    agencySlug: optionalString(value.agency_slug),
    generatedInternalId: optionalString(value.generated_internal_id),
  }
}

function parsePageMetadata(value: unknown): UsaSpendingPageMetadata {
  if (!isRecord(value)) {
    return {}
  }
  return {
    page: readNumber(value.page),
    total: readNumber(value.total),
    limit: readNumber(value.limit),
    hasNextPage: typeof value.hasNext === 'boolean' ? value.hasNext : undefined,
    hasPreviousPage: typeof value.hasPrevious === 'boolean' ? value.hasPrevious : undefined,
    next: optionalString(value.next),
    previous: optionalString(value.previous),
  }
}

function parseOverTimeResponse(value: unknown): UsaSpendingOverTimeResponse {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'USAspending over-time response had an unexpected schema.')
  }
  return {
    group: optionalString(value.group) ?? 'fiscal_year',
    spendingLevel: optionalString(value.spending_level) ?? 'awards',
    messages: readStringArray(value.messages),
    results: value.results.filter(isRecord).map(parseTimeResult),
  }
}

function parseTimeResult(value: Record<string, unknown>): UsaSpendingTimeResult {
  const timePeriod = isRecord(value.time_period) ? value.time_period : {}
  const label = optionalString(timePeriod.fiscal_year)
    ?? optionalString(timePeriod.calendar_year)
    ?? [optionalString(timePeriod.quarter), optionalString(timePeriod.month)].filter(Boolean).join('-')
    ?? 'unknown'
  return {
    label,
    aggregatedAmount: readNumber(value.aggregated_amount),
    totalOutlays: readNumber(value.total_outlays),
    contractObligations: readNumber(value.Contract_Obligations),
    grantObligations: readNumber(value.Grant_Obligations),
    loanObligations: readNumber(value.Loan_Obligations),
    directObligations: readNumber(value.Direct_Obligations),
    otherObligations: readNumber(value.Other_Obligations),
  }
}

function parseAgenciesResponse(value: unknown): UsaSpendingAgency[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'USAspending agencies response had an unexpected schema.')
  }
  return value.results.filter(isRecord).map(parseAgency)
}

function parseAgency(value: Record<string, unknown>): UsaSpendingAgency {
  const agencyId = readNumber(value.agency_id)
  if (agencyId === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'USAspending agency row was missing agency_id.')
  }
  return {
    agencyId,
    toptierCode: optionalString(value.toptier_code),
    abbreviation: optionalString(value.abbreviation),
    agencyName: optionalString(value.agency_name) ?? `agency ${agencyId}`,
    agencySlug: optionalString(value.agency_slug),
    activeFy: optionalString(value.active_fy),
    activeFq: optionalString(value.active_fq),
    budgetAuthorityAmount: readNumber(value.budget_authority_amount),
    currentTotalBudgetAuthorityAmount: readNumber(value.current_total_budget_authority_amount),
    obligatedAmount: readNumber(value.obligated_amount),
    outlayAmount: readNumber(value.outlay_amount),
    percentageOfTotalBudgetAuthority: readNumber(value.percentage_of_total_budget_authority),
    congressionalJustificationUrl: optionalString(value.congressional_justification_url),
  }
}

function normalizeAwardTypeCodes(value: string | undefined): string[] {
  const codes = value === undefined
    ? [...USA_SPENDING_DEFAULT_AWARD_TYPE_CODES]
    : value.split(',').map(code => code.trim()).filter(code => code !== '')
  if (codes.length === 0 || codes.length > 20) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--award-type-codes must include 1-20 comma-separated codes.')
  }
  return codes
}

function normalizeSort(value: string, supported: string[]): string {
  const normalized = value.trim()
  if (!supported.includes(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported sort: ${value}`, { supported })
  }
  return normalized
}

function normalizeOrder(value: string | undefined): 'asc' | 'desc' {
  const order = value ?? 'desc'
  if (order !== 'asc' && order !== 'desc') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--order must be asc or desc.')
  }
  return order
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--page must be a positive integer.')
  }
  return page
}

function normalizeLimit(value: number | undefined, fallback: number, max: number, label: string): number {
  const limit = value ?? fallback
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer from 1 to ${max}.`)
  }
  return limit
}

function normalizeDate(value: string, label: string): string {
  const normalized = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must use YYYY-MM-DD format.`)
  }
  return normalized
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.detail) ?? optionalString(value.message)
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(item => item.length > 0) : []
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

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
