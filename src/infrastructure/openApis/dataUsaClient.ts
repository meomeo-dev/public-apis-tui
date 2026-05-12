import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const DATA_USA_DEFAULT_BASE_URL = 'https://api.datausa.io'
export const DATA_USA_POPULATION_CUBE = 'acs_yg_total_population_5'
export const DATA_USA_DEFAULT_DRILLDOWN = 'State'
export const DATA_USA_DEFAULT_YEAR = 'latest'
export const DATA_USA_DEFAULT_LIMIT = 100
export const DATA_USA_MAX_LIMIT = 100
export const DATA_USA_DEFAULT_OFFSET = 0
export const DATA_USA_DEFAULT_GEOGRAPHY_LEVEL = 'State'

export type DataUsaPopulationInput = {
  drilldown?: string | undefined
  year?: string | number | undefined
  geographyId?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type NormalizedDataUsaPopulationInput = {
  drilldown: DataUsaGeographyLevel
  year: string
  geographyId?: string | undefined
  limit: number
  offset: number
}

export type DataUsaGeographiesInput = {
  level?: string | undefined
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedDataUsaGeographiesInput = {
  level: DataUsaGeographyLevel
  query?: string | undefined
  limit: number
}

export type DataUsaGeographyLevel = 'Nation' | 'State'

export type DataUsaPage = {
  limit?: number | undefined
  offset?: number | undefined
  total?: number | undefined
}

export type DataUsaPopulationRow = {
  geographyId: string
  geography: string
  year: number
  population: number
}

export type DataUsaPopulationResponse = {
  annotations: Record<string, unknown>
  columns: string[]
  page: DataUsaPage
  rows: DataUsaPopulationRow[]
}

export type DataUsaGeographyMember = {
  key: string
  caption: string
}

export type DataUsaGeographiesResponse = {
  name?: string | undefined
  caption?: string | undefined
  depth?: number | undefined
  members: DataUsaGeographyMember[]
}

export class DataUsaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getPopulation(input: NormalizedDataUsaPopulationInput): Promise<DataUsaPopulationResponse> {
    const url = new URL('/tesseract/data.jsonrecords', this.options.baseUrl ?? DATA_USA_DEFAULT_BASE_URL)
    url.searchParams.set('cube', DATA_USA_POPULATION_CUBE)
    url.searchParams.set('drilldowns', `${input.drilldown},Year`)
    url.searchParams.set('measures', 'Population')
    url.searchParams.set('time', input.year === DATA_USA_DEFAULT_YEAR ? 'Year.latest' : `Year.${input.year}`)
    url.searchParams.set('limit', `${input.limit},${input.offset}`)
    if (input.geographyId !== undefined) {
      url.searchParams.set(input.drilldown, input.geographyId)
    }
    const parsed = await this.fetchJson(url)
    return parsePopulation(parsed, input.drilldown)
  }

  async listGeographies(input: NormalizedDataUsaGeographiesInput): Promise<DataUsaGeographiesResponse> {
    const url = new URL('/tesseract/members', this.options.baseUrl ?? DATA_USA_DEFAULT_BASE_URL)
    url.searchParams.set('cube', DATA_USA_POPULATION_CUBE)
    url.searchParams.set('level', input.level)
    const parsed = await this.fetchJson(url)
    const geographies = parseGeographies(parsed)
    const query = input.query?.toLowerCase()
    const members = geographies.members
      .filter(member => member.key !== '' && member.caption !== '')
      .filter(member => query === undefined || member.key.toLowerCase().includes(query) || member.caption.toLowerCase().includes(query))
      .slice(0, input.limit)
    return { ...geographies, members }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Data USA request failed: ${String(error)}`, {
        provider: 'datausa',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Data USA returned a non-JSON response: ${String(error)}`, {
        provider: 'datausa',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Data USA request failed with HTTP ${response.status}.`, {
        provider: 'datausa',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeDataUsaPopulationInput(input: DataUsaPopulationInput = {}): NormalizedDataUsaPopulationInput {
  const yearValue = input.year ?? DATA_USA_DEFAULT_YEAR
  const year = typeof yearValue === 'number' ? String(yearValue) : yearValue.trim().toLowerCase()
  if (year !== DATA_USA_DEFAULT_YEAR && !/^\d{4}$/u.test(year)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--year must be latest or a four-digit year.')
  }
  const drilldown = normalizeGeographyLevel(input.drilldown ?? DATA_USA_DEFAULT_DRILLDOWN, '--drilldown')
  const normalized: NormalizedDataUsaPopulationInput = {
    drilldown,
    year,
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
  const geographyId = normalizeOptionalGeographyId(input.geographyId)
  if (geographyId !== undefined) {
    normalized.geographyId = geographyId
  }
  return normalized
}

export function normalizeDataUsaGeographiesInput(input: DataUsaGeographiesInput = {}): NormalizedDataUsaGeographiesInput {
  return {
    level: normalizeGeographyLevel(input.level ?? DATA_USA_DEFAULT_GEOGRAPHY_LEVEL, '--level'),
    query: normalizeOptionalQuery(input.query),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeGeographyLevel(value: string, label: string): DataUsaGeographyLevel {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'nation') {
    return 'Nation'
  }
  if (normalized === 'state') {
    return 'State'
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be Nation or State.`)
}

function normalizeOptionalGeographyId(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized
}

function normalizeOptionalQuery(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? DATA_USA_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > DATA_USA_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${DATA_USA_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? DATA_USA_DEFAULT_OFFSET
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--offset must be a non-negative integer.')
  }
  return offset
}

function parsePopulation(value: unknown, drilldown: DataUsaGeographyLevel): DataUsaPopulationResponse {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Data USA population response had an unexpected schema.')
  }
  return {
    annotations: isRecord(value.annotations) ? value.annotations : {},
    columns: Array.isArray(value.columns) ? value.columns.filter((column): column is string => typeof column === 'string') : [],
    page: parsePage(value.page),
    rows: value.data.map(row => parsePopulationRow(row, drilldown)),
  }
}

function parsePopulationRow(value: unknown, drilldown: DataUsaGeographyLevel): DataUsaPopulationRow {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Data USA population row had an unexpected schema.')
  }
  const id = value[`${drilldown} ID`]
  const geography = value[drilldown]
  if (typeof id !== 'string' || typeof geography !== 'string' || typeof value.Year !== 'number' || typeof value.Population !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Data USA population row had an unexpected schema.')
  }
  return {
    geographyId: id,
    geography,
    year: value.Year,
    population: value.Population,
  }
}

function parseGeographies(value: unknown): DataUsaGeographiesResponse {
  if (!isRecord(value) || !Array.isArray(value.members)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Data USA geographies response had an unexpected schema.')
  }
  return {
    name: optionalString(value.name),
    caption: optionalString(value.caption),
    depth: typeof value.depth === 'number' ? value.depth : undefined,
    members: value.members.map(parseGeographyMember),
  }
}

function parseGeographyMember(value: unknown): DataUsaGeographyMember {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.caption !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Data USA geography member had an unexpected schema.')
  }
  return { key: value.key, caption: value.caption }
}

function parsePage(value: unknown): DataUsaPage {
  if (!isRecord(value)) {
    return {}
  }
  return {
    limit: typeof value.limit === 'number' ? value.limit : undefined,
    offset: typeof value.offset === 'number' ? value.offset : undefined,
    total: typeof value.total === 'number' ? value.total : undefined,
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
