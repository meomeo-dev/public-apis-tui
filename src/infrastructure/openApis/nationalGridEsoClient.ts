import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NATIONAL_GRID_ESO_DEFAULT_BASE_URL = 'https://api.neso.energy/api/3/action'
export const NATIONAL_GRID_ESO_DEFAULT_QUERY = 'demand'
export const NATIONAL_GRID_ESO_SEARCH_DEFAULT_LIMIT = 1000
export const NATIONAL_GRID_ESO_SEARCH_MAX_LIMIT = 1000
export const NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID = '177f6fa4-ae49-4182-81ea-0c6b35f26ca6'
export const NATIONAL_GRID_ESO_RECORDS_DEFAULT_LIMIT = 100
export const NATIONAL_GRID_ESO_RECORDS_MAX_LIMIT = 100

export type NationalGridEsoSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedNationalGridEsoSearchInput = {
  query: string
  limit: number
}

export type NationalGridEsoRecordsInput = {
  resourceId?: string | undefined
  limit?: number | undefined
}

export type NormalizedNationalGridEsoRecordsInput = {
  resourceId: string
  limit: number
}

export type NationalGridEsoResource = {
  id: string
  name?: string | undefined
  format?: string | undefined
  url?: string | undefined
  datastoreActive: boolean
}

export type NationalGridEsoDataset = {
  id: string
  name?: string | undefined
  title?: string | undefined
  notes?: string | undefined
  organizationTitle?: string | undefined
  resources: NationalGridEsoResource[]
}

export type NationalGridEsoPackageSearch = {
  count?: number | undefined
  results: NationalGridEsoDataset[]
}

export type NationalGridEsoDatastoreRecords = {
  resourceId: string
  total?: number | undefined
  fields: string[]
  records: Array<Record<string, unknown>>
}

export class NationalGridEsoClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchDatasets(input: NormalizedNationalGridEsoSearchInput): Promise<NationalGridEsoPackageSearch> {
    const url = this.createActionUrl('/package_search')
    url.searchParams.set('q', input.query)
    url.searchParams.set('rows', String(input.limit))
    const parsed = await this.fetchAction(url)
    return parsePackageSearch(parsed)
  }

  async readRecords(input: NormalizedNationalGridEsoRecordsInput): Promise<NationalGridEsoDatastoreRecords> {
    const url = this.createActionUrl('/datastore_search')
    url.searchParams.set('resource_id', input.resourceId)
    url.searchParams.set('limit', String(input.limit))
    const parsed = await this.fetchAction(url)
    return parseDatastoreRecords(parsed, input.resourceId)
  }

  private createActionUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? NATIONAL_GRID_ESO_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchAction(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NESO Data Portal request failed: ${String(error)}`, {
        provider: 'nationalgrideso',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `NESO Data Portal returned a non-JSON response: ${String(error)}`, {
        provider: 'nationalgrideso',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `NESO Data Portal request failed with HTTP ${response.status}.`, {
        provider: 'nationalgrideso',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    if (!isRecord(parsed) || parsed.success !== true || !isRecord(parsed.result)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? 'NESO Data Portal action response was not successful.')
    }

    return parsed.result
  }
}

export function normalizeNationalGridEsoSearchInput(input: NationalGridEsoSearchInput = {}): NormalizedNationalGridEsoSearchInput {
  const query = (input.query ?? NATIONAL_GRID_ESO_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return { query, limit: normalizeLimit(input.limit, NATIONAL_GRID_ESO_SEARCH_DEFAULT_LIMIT, NATIONAL_GRID_ESO_SEARCH_MAX_LIMIT) }
}

export function normalizeNationalGridEsoRecordsInput(input: NationalGridEsoRecordsInput = {}): NormalizedNationalGridEsoRecordsInput {
  const resourceId = (input.resourceId ?? NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID).trim().toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(resourceId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--resource-id must be a CKAN resource UUID.')
  }
  return { resourceId, limit: normalizeLimit(input.limit, NATIONAL_GRID_ESO_RECORDS_DEFAULT_LIMIT, NATIONAL_GRID_ESO_RECORDS_MAX_LIMIT) }
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const limit = value ?? fallback
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${max}.`)
  }
  return limit
}

function parsePackageSearch(value: unknown): NationalGridEsoPackageSearch {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NESO Data Portal package_search response had an unexpected schema.')
  }
  return {
    count: optionalNumber(value.count),
    results: value.results.filter(isRecord).map(parseDataset),
  }
}

function parseDataset(value: Record<string, unknown>): NationalGridEsoDataset {
  return {
    id: requiredString(value.id, 'dataset.id'),
    name: optionalString(value.name),
    title: optionalString(value.title),
    notes: optionalString(value.notes),
    organizationTitle: isRecord(value.organization) ? optionalString(value.organization.title) : undefined,
    resources: Array.isArray(value.resources) ? value.resources.filter(isRecord).map(parseResource) : [],
  }
}

function parseResource(value: Record<string, unknown>): NationalGridEsoResource {
  return {
    id: requiredString(value.id, 'resource.id'),
    name: optionalString(value.name),
    format: optionalString(value.format),
    url: optionalString(value.url),
    datastoreActive: value.datastore_active === true,
  }
}

function parseDatastoreRecords(value: unknown, fallbackResourceId: string): NationalGridEsoDatastoreRecords {
  if (!isRecord(value) || !Array.isArray(value.records)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'NESO Data Portal datastore_search response had an unexpected schema.')
  }
  return {
    resourceId: optionalString(value.resource_id) ?? fallbackResourceId,
    total: optionalNumber(value.total),
    fields: Array.isArray(value.fields) ? value.fields.filter(isRecord).map(field => optionalString(field.id)).filter((field): field is string => field !== undefined) : [],
    records: value.records.filter(isRecord).map(record => ({ ...record })),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.error) ?? optionalString(value.message)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `NESO Data Portal response missing ${field}.`)
  }
  return value
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
