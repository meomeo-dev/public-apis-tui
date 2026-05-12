import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CENSUS_GOV_DEFAULT_DATASET_QUERY = 'acs'
export const CENSUS_GOV_DEFAULT_DATASET_LIMIT = 100
export const CENSUS_GOV_MAX_DATASET_LIMIT = 100
export const CENSUS_GOV_DEFAULT_YEAR = 2024
export const CENSUS_GOV_DEFAULT_GEOGRAPHY = 'state'
export const CENSUS_GOV_STATE_ROW_COUNT = 52

type FetchImpl = typeof fetch

export type CensusGovDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedCensusGovDatasetsInput = {
  query: string
  limit: number
}

export type CensusGovAcsProfileStatesInput = {
  year?: number | undefined
  limit?: number | undefined
}

export type NormalizedCensusGovAcsProfileStatesInput = {
  year: number
  limit: number
}

export type CensusGovDataset = {
  id?: string | undefined
  title: string
  description?: string | undefined
  vintage?: number | undefined
  dataset: string[]
  variablesUrl?: string | undefined
  examplesUrl?: string | undefined
  documentationUrl?: string | undefined
}

export type CensusGovAcsProfileState = {
  name: string
  state: string
  population?: number | undefined
  medianHouseholdIncome?: number | undefined
}

export class CensusGovClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined; baseUrl?: string | undefined } = {}) {}

  async listDatasets(input: NormalizedCensusGovDatasetsInput): Promise<{ total: number; datasets: CensusGovDataset[] }> {
    const url = new URL('/data.json', this.options.baseUrl ?? 'https://api.census.gov')
    const parsed = await this.fetchJson(url)
    const allDatasets = parseDatasets(parsed)
    const query = input.query.toLowerCase()
    const filtered = allDatasets.filter(dataset =>
      [dataset.title, dataset.description, dataset.dataset.join('/'), String(dataset.vintage ?? '')]
        .some(value => value?.toLowerCase().includes(query)),
    )
    return {
      total: filtered.length,
      datasets: filtered.slice(0, input.limit),
    }
  }

  async getAcsProfileStates(input: NormalizedCensusGovAcsProfileStatesInput): Promise<CensusGovAcsProfileState[]> {
    const url = new URL(`/data/${input.year}/acs/acs5/profile`, this.options.baseUrl ?? 'https://api.census.gov')
    url.searchParams.set('get', 'NAME,DP05_0001E,DP03_0062E')
    url.searchParams.set('for', 'state:*')
    const parsed = await this.fetchJson(url)
    return parseAcsProfileRows(parsed).slice(0, input.limit)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Census.gov returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Census.gov request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeCensusGovDatasetsInput(input: CensusGovDatasetsInput = {}): NormalizedCensusGovDatasetsInput {
  const query = input.query?.trim() || CENSUS_GOV_DEFAULT_DATASET_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 120 characters or fewer.')
  }
  return {
    query,
    limit: normalizeInteger(input.limit, '--limit', CENSUS_GOV_DEFAULT_DATASET_LIMIT, 1, CENSUS_GOV_MAX_DATASET_LIMIT),
  }
}

export function normalizeCensusGovAcsProfileStatesInput(input: CensusGovAcsProfileStatesInput = {}): NormalizedCensusGovAcsProfileStatesInput {
  const year = normalizeInteger(input.year, '--year', CENSUS_GOV_DEFAULT_YEAR, 2010, CENSUS_GOV_DEFAULT_YEAR)
  return {
    year,
    limit: normalizeInteger(input.limit, '--limit', CENSUS_GOV_STATE_ROW_COUNT, 1, CENSUS_GOV_STATE_ROW_COUNT),
  }
}

function parseDatasets(value: unknown): CensusGovDataset[] {
  if (!isRecord(value) || !Array.isArray(value.dataset)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Census.gov dataset catalog response had an unexpected schema.')
  }
  return value.dataset.map(parseDataset).filter((entry): entry is CensusGovDataset => entry !== undefined)
}

function parseDataset(value: unknown): CensusGovDataset | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const title = readString(value.title)
  if (title === undefined) {
    return undefined
  }
  return {
    id: readString(value['@id']),
    title,
    description: readString(value.description),
    vintage: readNumber(value.c_vintage),
    dataset: Array.isArray(value.c_dataset) ? value.c_dataset.filter((entry): entry is string => typeof entry === 'string') : [],
    variablesUrl: readString(value.c_variablesLink),
    examplesUrl: readString(value.c_examplesLink),
    documentationUrl: readString(value.c_documentationLink),
  }
}

function parseAcsProfileRows(value: unknown): CensusGovAcsProfileState[] {
  if (!Array.isArray(value) || !Array.isArray(value[0])) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Census.gov ACS profile response had an unexpected schema.')
  }
  const [header, ...rows] = value
  return rows.map(row => parseAcsProfileRow(header, row)).filter((entry): entry is CensusGovAcsProfileState => entry !== undefined)
}

function parseAcsProfileRow(header: unknown[], row: unknown): CensusGovAcsProfileState | undefined {
  if (!Array.isArray(row)) {
    return undefined
  }
  const values = new Map<string, unknown>()
  header.forEach((key, index) => {
    if (typeof key === 'string') {
      values.set(key, row[index])
    }
  })
  const name = readString(values.get('NAME'))
  const state = readString(values.get('state'))
  if (name === undefined || state === undefined) {
    return undefined
  }
  return {
    name,
    state,
    population: readNumberString(values.get('DP05_0001E')),
    medianHouseholdIncome: readNumberString(values.get('DP03_0062E')),
  }
}

function normalizeInteger(value: number | undefined, name: string, defaultValue: number, min: number, max: number): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${name} must be an integer from ${min} to ${max}.`)
  }
  return normalized
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readNumberString(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
