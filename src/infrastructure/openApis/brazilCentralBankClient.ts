import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BRAZIL_CENTRAL_BANK_DEFAULT_QUERY = 'selic'
export const BRAZIL_CENTRAL_BANK_DEFAULT_ROWS = 100
export const BRAZIL_CENTRAL_BANK_MAX_ROWS = 100
export const BRAZIL_CENTRAL_BANK_DEFAULT_START = 0
export const BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_CODE = 11
export const BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_LIMIT = 20
export const BRAZIL_CENTRAL_BANK_MAX_SERIES_LIMIT = 20

type FetchImpl = typeof fetch

type BrazilCentralBankClientOptions = {
  fetchImpl?: FetchImpl | undefined
}

export type BrazilCentralBankDatasetsInput = {
  query?: string | undefined
  rows?: number | undefined
  start?: number | undefined
}

export type NormalizedBrazilCentralBankDatasetsInput = {
  query: string
  rows: number
  start: number
}

export type BrazilCentralBankSgsLatestInput = {
  seriesCode?: number | undefined
  limit?: number | undefined
}

export type NormalizedBrazilCentralBankSgsLatestInput = {
  seriesCode: number
  limit: number
}

export type BrazilCentralBankDataset = {
  id: string
  name: string
  title?: string | undefined
  notes?: string | undefined
  organization?: string | undefined
  metadataModified?: string | undefined
  resourceCount?: number | undefined
  tags: string[]
}

export type BrazilCentralBankDatasetsResponse = {
  count: number
  rows: number
  start: number
  datasets: BrazilCentralBankDataset[]
}

export type BrazilCentralBankSgsPoint = {
  date: string
  value: number
  rawValue: string
}

export class BrazilCentralBankClient {
  private readonly fetchImpl: FetchImpl

  constructor(options: BrazilCentralBankClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchDatasets(input: BrazilCentralBankDatasetsInput = {}): Promise<BrazilCentralBankDatasetsResponse> {
    const normalized = normalizeBrazilCentralBankDatasetsInput(input)
    const url = new URL('https://dadosabertos.bcb.gov.br/api/3/action/package_search')
    url.searchParams.set('q', normalized.query)
    url.searchParams.set('rows', String(normalized.rows))
    url.searchParams.set('start', String(normalized.start))

    const response = await this.fetchImpl(url)
    const body = await readJson(response)
    if (!response.ok || !isRecord(body) || body.success !== true) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Brazil Central Bank CKAN request failed with HTTP ${response.status}.`, {
        status: response.status,
        message: readCkanError(body),
      })
    }

    const result = isRecord(body.result) ? body.result : {}
    const results = Array.isArray(result.results) ? result.results : []
    return {
      count: readNumber(result.count) ?? results.length,
      rows: normalized.rows,
      start: normalized.start,
      datasets: results.map(parseDataset).filter((entry): entry is BrazilCentralBankDataset => entry !== undefined),
    }
  }

  async getSgsLatest(input: BrazilCentralBankSgsLatestInput = {}): Promise<BrazilCentralBankSgsPoint[]> {
    const normalized = normalizeBrazilCentralBankSgsLatestInput(input)
    const url = new URL(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${normalized.seriesCode}/dados/ultimos/${normalized.limit}`)
    url.searchParams.set('formato', 'json')

    const response = await this.fetchImpl(url)
    const body = await readJson(response)
    if (!response.ok || !Array.isArray(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Brazil Central Bank SGS request failed with HTTP ${response.status}.`, {
        status: response.status,
      })
    }

    return body.map(parseSgsPoint).filter((entry): entry is BrazilCentralBankSgsPoint => entry !== undefined)
  }
}

export function normalizeBrazilCentralBankDatasetsInput(input: BrazilCentralBankDatasetsInput = {}): NormalizedBrazilCentralBankDatasetsInput {
  const query = normalizeQuery(input.query)
  const rows = normalizeBoundedInteger(input.rows, {
    name: '--rows',
    defaultValue: BRAZIL_CENTRAL_BANK_DEFAULT_ROWS,
    min: 1,
    max: BRAZIL_CENTRAL_BANK_MAX_ROWS,
  })
  const start = normalizeBoundedInteger(input.start, {
    name: '--start',
    defaultValue: BRAZIL_CENTRAL_BANK_DEFAULT_START,
    min: 0,
    max: 10_000,
  })
  return { query, rows, start }
}

export function normalizeBrazilCentralBankSgsLatestInput(input: BrazilCentralBankSgsLatestInput = {}): NormalizedBrazilCentralBankSgsLatestInput {
  const seriesCode = normalizeBoundedInteger(input.seriesCode, {
    name: '--series-code',
    defaultValue: BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_CODE,
    min: 1,
    max: 999_999,
  })
  const limit = normalizeBoundedInteger(input.limit, {
    name: '--limit',
    defaultValue: BRAZIL_CENTRAL_BANK_DEFAULT_SERIES_LIMIT,
    min: 1,
    max: BRAZIL_CENTRAL_BANK_MAX_SERIES_LIMIT,
  })
  return { seriesCode, limit }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Brazil Central Bank returned non-JSON content.', {
      status: response.status,
      preview: text.slice(0, 120),
    })
  }
}

function parseDataset(value: unknown): BrazilCentralBankDataset | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const id = readString(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) {
    return undefined
  }

  const organization = isRecord(value.organization) ? readString(value.organization.title) ?? readString(value.organization.name) : undefined
  return {
    id,
    name,
    title: readString(value.title),
    notes: readString(value.notes),
    organization,
    metadataModified: readString(value.metadata_modified),
    resourceCount: readNumber(value.num_resources),
    tags: Array.isArray(value.tags)
      ? value.tags.map(tag => (isRecord(tag) ? readString(tag.name) : undefined)).filter((tag): tag is string => tag !== undefined)
      : [],
  }
}

function parseSgsPoint(value: unknown): BrazilCentralBankSgsPoint | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const date = readString(value.data)
  const rawValue = readString(value.valor)
  if (date === undefined || rawValue === undefined) {
    return undefined
  }
  const numericValue = Number(rawValue.replace(',', '.'))
  if (!Number.isFinite(numericValue)) {
    return undefined
  }
  return { date, value: numericValue, rawValue }
}

function normalizeQuery(value: string | undefined): string {
  const query = value?.trim() || BRAZIL_CENTRAL_BANK_DEFAULT_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 120 characters or fewer.')
  }
  return query
}

function normalizeBoundedInteger(
  value: number | undefined,
  options: { name: string; defaultValue: number; min: number; max: number },
): number {
  const normalized = value ?? options.defaultValue
  if (!Number.isInteger(normalized) || normalized < options.min || normalized > options.max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${options.name} must be an integer from ${options.min} to ${options.max}.`)
  }
  return normalized
}

function readCkanError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const error = isRecord(value.error) ? value.error : {}
  return readString(error.message) ?? readString(value.error)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
