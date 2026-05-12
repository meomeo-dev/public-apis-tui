import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NYC_OPEN_DATA_DEFAULT_DATASET_QUERY = '311'
export const NYC_OPEN_DATA_DEFAULT_DATASET_LIMIT = 100
export const NYC_OPEN_DATA_MAX_DATASET_LIMIT = 100
export const NYC_OPEN_DATA_DEFAULT_311_LIMIT = 1000
export const NYC_OPEN_DATA_MAX_311_LIMIT = 1000
export const NYC_OPEN_DATA_DEFAULT_BOROUGH = 'BROOKLYN'

type FetchImpl = typeof fetch

export type NycOpenDataDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedNycOpenDataDatasetsInput = {
  query: string
  limit: number
}

export type NycOpenData311RequestsInput = {
  borough?: string | undefined
  limit?: number | undefined
}

export type NormalizedNycOpenData311RequestsInput = {
  borough?: string | undefined
  limit: number
}

export type NycOpenDataDataset = {
  id: string
  name: string
  description?: string | undefined
  attribution?: string | undefined
  category?: string | undefined
  updatedAt?: string | undefined
  link?: string | undefined
}

export type NycOpenData311Request = {
  uniqueKey: string
  createdDate?: string | undefined
  agency?: string | undefined
  complaintType?: string | undefined
  borough?: string | undefined
  status?: string | undefined
}

export class NycOpenDataClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined; baseUrl?: string | undefined } = {}) {}

  async listDatasets(input: NormalizedNycOpenDataDatasetsInput): Promise<{ total: number; datasets: NycOpenDataDataset[] }> {
    const url = new URL('/api/catalog/v1', 'https://api.us.socrata.com')
    url.searchParams.set('domains', 'data.cityofnewyork.us')
    url.searchParams.set('only', 'datasets')
    url.searchParams.set('limit', '100')
    const parsed = await this.fetchJson(url)
    const allDatasets = parseCatalogDatasets(parsed)
    const query = input.query.toLowerCase()
    const filtered = allDatasets.filter(dataset =>
      [dataset.id, dataset.name, dataset.description, dataset.attribution, dataset.category]
        .some(value => value?.toLowerCase().includes(query)),
    )
    return {
      total: filtered.length,
      datasets: filtered.slice(0, input.limit),
    }
  }

  async list311Requests(input: NormalizedNycOpenData311RequestsInput): Promise<NycOpenData311Request[]> {
    const url = new URL('/resource/erm2-nwe9.json', this.options.baseUrl ?? 'https://data.cityofnewyork.us')
    url.searchParams.set('$select', 'unique_key,created_date,agency,complaint_type,borough,status')
    url.searchParams.set('$order', 'created_date DESC')
    url.searchParams.set('$limit', String(input.limit))
    if (input.borough !== undefined) {
      url.searchParams.set('borough', input.borough)
    }
    const parsed = await this.fetchJson(url)
    return parse311Requests(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'NYC Open Data returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NYC Open Data request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeNycOpenDataDatasetsInput(input: NycOpenDataDatasetsInput = {}): NormalizedNycOpenDataDatasetsInput {
  const query = input.query?.trim() || NYC_OPEN_DATA_DEFAULT_DATASET_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 120 characters or fewer.')
  }
  return {
    query,
    limit: normalizeInteger(input.limit, '--limit', NYC_OPEN_DATA_DEFAULT_DATASET_LIMIT, 1, NYC_OPEN_DATA_MAX_DATASET_LIMIT),
  }
}

export function normalizeNycOpenData311RequestsInput(input: NycOpenData311RequestsInput = {}): NormalizedNycOpenData311RequestsInput {
  const borough = normalizeBorough(input.borough)
  return {
    ...(borough !== undefined ? { borough } : {}),
    limit: normalizeInteger(input.limit, '--limit', NYC_OPEN_DATA_DEFAULT_311_LIMIT, 1, NYC_OPEN_DATA_MAX_311_LIMIT),
  }
}

function parseCatalogDatasets(value: unknown): NycOpenDataDataset[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYC Open Data catalog response had an unexpected schema.')
  }
  return value.results.map(parseCatalogDataset).filter((entry): entry is NycOpenDataDataset => entry !== undefined)
}

function parseCatalogDataset(value: unknown): NycOpenDataDataset | undefined {
  if (!isRecord(value) || !isRecord(value.resource)) {
    return undefined
  }
  const resource = value.resource
  const id = readString(resource.id)
  const name = readString(resource.name)
  if (id === undefined || name === undefined) {
    return undefined
  }
  return {
    id,
    name,
    description: readString(resource.description),
    attribution: readString(resource.attribution),
    category: readString(resource.category),
    updatedAt: readString(resource.updatedAt),
    link: `https://data.cityofnewyork.us/d/${id}`,
  }
}

function parse311Requests(value: unknown): NycOpenData311Request[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NYC Open Data 311 response had an unexpected schema.')
  }
  return value.map(parse311Request).filter((entry): entry is NycOpenData311Request => entry !== undefined)
}

function parse311Request(value: unknown): NycOpenData311Request | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const uniqueKey = readString(value.unique_key)
  if (uniqueKey === undefined) {
    return undefined
  }
  return {
    uniqueKey,
    createdDate: readString(value.created_date),
    agency: readString(value.agency),
    complaintType: readString(value.complaint_type),
    borough: readString(value.borough),
    status: readString(value.status),
  }
}

function normalizeBorough(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return NYC_OPEN_DATA_DEFAULT_BOROUGH
  }
  const borough = value.trim().toUpperCase().replace(/\s+/gu, ' ')
  const allowed = new Set(['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND', 'Unspecified'.toUpperCase()])
  if (!allowed.has(borough)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--borough must be one of BRONX, BROOKLYN, MANHATTAN, QUEENS, STATEN ISLAND, or Unspecified.')
  }
  return borough === 'UNSPECIFIED' ? 'Unspecified' : borough
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
