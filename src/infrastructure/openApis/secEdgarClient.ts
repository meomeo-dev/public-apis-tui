import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SEC_EDGAR_DEFAULT_BASE_URL = 'https://data.sec.gov'
export const SEC_EDGAR_DEFAULT_CIK = '0000320193'
export const SEC_EDGAR_DEFAULT_LIMIT = 100
export const SEC_EDGAR_MAX_LIMIT = 1000
export const SEC_EDGAR_DEFAULT_TAXONOMY = 'us-gaap'
export const SEC_EDGAR_DEFAULT_TAG = 'AccountsPayableCurrent'
export const SEC_EDGAR_DEFAULT_UNIT = 'USD'
export const SEC_EDGAR_USER_AGENT = 'public-apis-tui/0.5.0 public-api-research@example.invalid'

export type SecEdgarSubmissionsInput = {
  cik?: string | number | undefined
  limit?: number | undefined
}

export type NormalizedSecEdgarSubmissionsInput = {
  cik: string
  limit: number
}

export type SecEdgarCompanyConceptInput = {
  cik?: string | number | undefined
  taxonomy?: string | undefined
  tag?: string | undefined
  unit?: string | undefined
  limit?: number | undefined
}

export type NormalizedSecEdgarCompanyConceptInput = {
  cik: string
  taxonomy: string
  tag: string
  unit: string
  limit: number
}

export type SecEdgarRecentFiling = {
  accessionNumber: string
  filingDate?: string | undefined
  reportDate?: string | undefined
  acceptanceDateTime?: string | undefined
  act?: string | undefined
  form?: string | undefined
  fileNumber?: string | undefined
  filmNumber?: string | undefined
  items?: string | undefined
  size?: number | undefined
  isXbrl?: number | undefined
  isInlineXbrl?: number | undefined
  primaryDocument?: string | undefined
  primaryDocDescription?: string | undefined
}

export type SecEdgarSubmissionsResponse = {
  cik: string
  entityType?: string | undefined
  sic?: string | undefined
  sicDescription?: string | undefined
  name?: string | undefined
  tickers: string[]
  exchanges: string[]
  filings: SecEdgarRecentFiling[]
  recentTotal: number
}

export type SecEdgarConceptFact = {
  end?: string | undefined
  val?: number | undefined
  accn?: string | undefined
  fy?: number | undefined
  fp?: string | undefined
  form?: string | undefined
  filed?: string | undefined
  frame?: string | undefined
}

type SecEdgarEndpointContext =
  | { kind: 'submissions'; input: NormalizedSecEdgarSubmissionsInput }
  | { kind: 'companyConcept'; input: NormalizedSecEdgarCompanyConceptInput }

export type SecEdgarCompanyConceptResponse = {
  cik: string
  taxonomy: string
  tag: string
  label?: string | undefined
  description?: string | undefined
  entityName?: string | undefined
  unit: string
  facts: SecEdgarConceptFact[]
  unitTotal: number
  availableUnits: string[]
}

export class SecEdgarClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined; userAgent?: string | undefined } = {}) {}

  async getSubmissions(input: NormalizedSecEdgarSubmissionsInput): Promise<SecEdgarSubmissionsResponse> {
    const url = new URL(`/submissions/CIK${input.cik}.json`, this.options.baseUrl ?? SEC_EDGAR_DEFAULT_BASE_URL)
    const parsed = await this.fetchJson(url, { kind: 'submissions', input })
    return parseSubmissionsResponse(parsed, input.limit)
  }

  async getCompanyConcept(input: NormalizedSecEdgarCompanyConceptInput): Promise<SecEdgarCompanyConceptResponse> {
    const url = new URL(`/api/xbrl/companyconcept/CIK${input.cik}/${encodeURIComponent(input.taxonomy)}/${encodeURIComponent(input.tag)}.json`, this.options.baseUrl ?? SEC_EDGAR_DEFAULT_BASE_URL)
    const parsed = await this.fetchJson(url, { kind: 'companyConcept', input })
    return parseCompanyConceptResponse(parsed, input)
  }

  private async fetchJson(url: URL, context: SecEdgarEndpointContext): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': this.options.userAgent ?? SEC_EDGAR_USER_AGENT,
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `SEC EDGAR request failed: ${String(error)}`, {
        provider: 'secedgar',
        endpoint: url.href,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('json')) {
      const bodySample = await readBodySample(response)
      throw new RuntimeFailure('OPEN_API_FAILED', readNonJsonError(response.status, context, bodySample), {
        provider: 'secedgar',
        status: response.status,
        endpoint: url.href,
        contentType,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `SEC EDGAR returned a non-JSON response: ${String(error)}`, {
        provider: 'secedgar',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed, response.status, context) ?? `SEC EDGAR request failed with HTTP ${response.status}.`, {
        provider: 'secedgar',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeSecEdgarSubmissionsInput(input: SecEdgarSubmissionsInput = {}): NormalizedSecEdgarSubmissionsInput {
  return {
    cik: normalizeCik(input.cik ?? SEC_EDGAR_DEFAULT_CIK),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeSecEdgarCompanyConceptInput(input: SecEdgarCompanyConceptInput = {}): NormalizedSecEdgarCompanyConceptInput {
  return {
    cik: normalizeCik(input.cik ?? SEC_EDGAR_DEFAULT_CIK),
    taxonomy: normalizeToken(input.taxonomy ?? SEC_EDGAR_DEFAULT_TAXONOMY, 'taxonomy'),
    tag: normalizeToken(input.tag ?? SEC_EDGAR_DEFAULT_TAG, 'tag'),
    unit: normalizeToken(input.unit ?? SEC_EDGAR_DEFAULT_UNIT, 'unit'),
    limit: normalizeLimit(input.limit),
  }
}

function parseSubmissionsResponse(value: unknown, limit: number): SecEdgarSubmissionsResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'SEC EDGAR submissions response had an unexpected schema.')
  }
  const filingsRecord = isRecord(value.filings) ? value.filings : {}
  const recent = isRecord(filingsRecord.recent) ? filingsRecord.recent : {}
  const accessionNumbers: unknown[] = Array.isArray(recent.accessionNumber) ? recent.accessionNumber : []
  const filings = accessionNumbers.slice(0, limit).map((accessionNumber, index) => parseRecentFiling(recent, index, accessionNumber))
  return {
    cik: requiredStringOrNumber(value.cik, 'cik'),
    entityType: optionalString(value.entityType),
    sic: optionalString(value.sic),
    sicDescription: optionalString(value.sicDescription),
    name: optionalString(value.name),
    tickers: stringArray(value.tickers),
    exchanges: stringArray(value.exchanges),
    filings,
    recentTotal: accessionNumbers.length,
  }
}

function parseRecentFiling(recent: Record<string, unknown>, index: number, accessionNumber: unknown): SecEdgarRecentFiling {
  return {
    accessionNumber: requiredString(accessionNumber, `accessionNumber[${index}]`),
    filingDate: arrayString(recent.filingDate, index),
    reportDate: arrayString(recent.reportDate, index),
    acceptanceDateTime: arrayString(recent.acceptanceDateTime, index),
    act: arrayString(recent.act, index),
    form: arrayString(recent.form, index),
    fileNumber: arrayString(recent.fileNumber, index),
    filmNumber: arrayString(recent.filmNumber, index),
    items: arrayString(recent.items, index),
    size: arrayNumber(recent.size, index),
    isXbrl: arrayNumber(recent.isXBRL, index),
    isInlineXbrl: arrayNumber(recent.isInlineXBRL, index),
    primaryDocument: arrayString(recent.primaryDocument, index),
    primaryDocDescription: arrayString(recent.primaryDocDescription, index),
  }
}

function parseCompanyConceptResponse(value: unknown, input: NormalizedSecEdgarCompanyConceptInput): SecEdgarCompanyConceptResponse {
  if (!isRecord(value) || !isRecord(value.units)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'SEC EDGAR company concept response had an unexpected schema.')
  }
  const availableUnits = Object.keys(value.units)
  const unitRows = value.units[input.unit]
  if (!Array.isArray(unitRows)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `SEC EDGAR concept ${input.tag} did not include unit ${input.unit}; available units: ${formatAvailableUnits(availableUnits)}.`, {
      availableUnits,
    })
  }
  const facts = unitRows.slice(-input.limit).map(parseConceptFact).sort(compareConceptFactsLatestFirst)
  return {
    cik: value.cik === undefined ? input.cik : requiredStringOrNumber(value.cik, 'cik'),
    taxonomy: requiredString(value.taxonomy, 'taxonomy'),
    tag: requiredString(value.tag, 'tag'),
    label: optionalString(value.label),
    description: optionalString(value.description),
    entityName: optionalString(value.entityName),
    unit: input.unit,
    facts,
    unitTotal: unitRows.length,
    availableUnits,
  }
}

function parseConceptFact(value: unknown): SecEdgarConceptFact {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'SEC EDGAR company concept fact had an unexpected schema.')
  }
  return {
    end: optionalString(value.end),
    val: optionalNumber(value.val),
    accn: optionalString(value.accn),
    fy: optionalNumber(value.fy),
    fp: optionalString(value.fp),
    form: optionalString(value.form),
    filed: optionalString(value.filed),
    frame: optionalString(value.frame),
  }
}

function normalizeCik(value: string | number): string {
  const raw = String(value).trim().replace(/^CIK/iu, '')
  if (!/^\d{1,10}$/u.test(raw)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--cik must be 1 to 10 digits, optionally prefixed by CIK.')
  }
  return raw.padStart(10, '0')
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? SEC_EDGAR_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > SEC_EDGAR_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${SEC_EDGAR_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeToken(value: string, label: string): string {
  const token = value.trim()
  if (!/^[A-Za-z0-9_-]+$/u.test(token)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} must contain only letters, numbers, underscore, or hyphen.`)
  }
  return token
}

async function readBodySample(response: Response): Promise<string> {
  try {
    return (await response.text()).replace(/\s+/gu, ' ').trim().slice(0, 240)
  } catch {
    return ''
  }
}

function readNonJsonError(status: number, context: SecEdgarEndpointContext, bodySample: string): string {
  if (status === 404 && context.kind === 'companyConcept') {
    return `No SEC EDGAR company concept found for CIK ${context.input.cik} ${context.input.taxonomy}/${context.input.tag}; try --tag ${SEC_EDGAR_DEFAULT_TAG}.`
  }
  if (status === 404 && context.kind === 'submissions') {
    return `No SEC EDGAR submissions found for CIK ${context.input.cik}; verify the CIK or try --cik ${SEC_EDGAR_DEFAULT_CIK}.`
  }
  return bodySample === '' ? `SEC EDGAR returned a non-JSON HTTP ${status} response.` : `SEC EDGAR returned a non-JSON HTTP ${status} response: ${bodySample}`
}

function readApiError(value: unknown, status: number, context: SecEdgarEndpointContext): string | undefined {
  if (status === 404 && context.kind === 'companyConcept') {
    return `No SEC EDGAR company concept found for CIK ${context.input.cik} ${context.input.taxonomy}/${context.input.tag}; try --tag ${SEC_EDGAR_DEFAULT_TAG}.`
  }
  if (status === 404 && context.kind === 'submissions') {
    return `No SEC EDGAR submissions found for CIK ${context.input.cik}; verify the CIK or try --cik ${SEC_EDGAR_DEFAULT_CIK}.`
  }
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.error) ?? optionalString(value.detail)
}

function formatAvailableUnits(units: string[]): string {
  return units.length === 0 ? 'none' : units.slice(0, 8).join(', ')
}

function compareConceptFactsLatestFirst(left: SecEdgarConceptFact, right: SecEdgarConceptFact): number {
  return String(right.end ?? right.filed ?? '').localeCompare(String(left.end ?? left.filed ?? ''))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function arrayString(value: unknown, index: number): string | undefined {
  return Array.isArray(value) ? optionalString(value[index]) : undefined
}

function arrayNumber(value: unknown, index: number): number | undefined {
  return Array.isArray(value) ? optionalNumber(value[index]) : undefined
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `SEC EDGAR response missing ${field}.`)
  }
  return value
}

function requiredStringOrNumber(value: unknown, field: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).padStart(10, '0')
  }
  return requiredString(value, field)
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
