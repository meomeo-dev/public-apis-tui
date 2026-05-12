import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_BASE_URL = 'https://data.gov.au/data/api/3/action'
export const OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_QUERY = 'business'
export const OPEN_GOVERNMENT_AUSTRALIA_SEARCH_DEFAULT_LIMIT = 1000
export const OPEN_GOVERNMENT_AUSTRALIA_SEARCH_MAX_LIMIT = 1000
export const OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID = '55ad4b1c-5eeb-44ea-8b29-d410da431be3'
export const OPEN_GOVERNMENT_AUSTRALIA_RECORDS_DEFAULT_LIMIT = 5000
export const OPEN_GOVERNMENT_AUSTRALIA_RECORDS_MAX_LIMIT = 5000

export type OpenGovernmentAustraliaSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedOpenGovernmentAustraliaSearchInput = {
  query: string
  limit: number
}

export type OpenGovernmentAustraliaRecordsInput = {
  resourceId?: string | undefined
  limit?: number | undefined
}

export type NormalizedOpenGovernmentAustraliaRecordsInput = {
  resourceId: string
  limit: number
}

export type OpenGovernmentAustraliaResource = {
  id: string
  name?: string | undefined
  format?: string | undefined
  url?: string | undefined
  datastoreActive: boolean
}

export type OpenGovernmentAustraliaDataset = {
  id: string
  name?: string | undefined
  title?: string | undefined
  notes?: string | undefined
  organizationTitle?: string | undefined
  resources: OpenGovernmentAustraliaResource[]
}

export type OpenGovernmentAustraliaPackageSearch = {
  count?: number | undefined
  results: OpenGovernmentAustraliaDataset[]
}

export type OpenGovernmentAustraliaDatastoreRecords = {
  resourceId: string
  total?: number | undefined
  fields: string[]
  records: Array<Record<string, unknown>>
}

export class OpenGovernmentAustraliaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchDatasets(input: NormalizedOpenGovernmentAustraliaSearchInput): Promise<OpenGovernmentAustraliaPackageSearch> {
    const url = this.createActionUrl('/package_search')
    url.searchParams.set('q', input.query)
    url.searchParams.set('rows', String(input.limit))
    const parsed = await this.fetchAction(url)
    return parsePackageSearch(parsed)
  }

  async readRecords(input: NormalizedOpenGovernmentAustraliaRecordsInput): Promise<OpenGovernmentAustraliaDatastoreRecords> {
    const url = this.createActionUrl('/datastore_search')
    url.searchParams.set('resource_id', input.resourceId)
    url.searchParams.set('limit', String(input.limit))
    const parsed = await this.fetchAction(url)
    return parseDatastoreRecords(parsed, input.resourceId)
  }

  private createActionUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchAction(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Government Australia request failed: ${String(error)}`, {
        provider: 'opengovernmentau',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Government Australia returned a non-JSON response: ${String(error)}`, {
        provider: 'opengovernmentau',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Open Government Australia request failed with HTTP ${response.status}.`, {
        provider: 'opengovernmentau',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    if (!isRecord(parsed) || parsed.success !== true || !isRecord(parsed.result)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? 'Open Government Australia action response was not successful.')
    }

    return parsed.result
  }
}

export function normalizeOpenGovernmentAustraliaSearchInput(input: OpenGovernmentAustraliaSearchInput = {}): NormalizedOpenGovernmentAustraliaSearchInput {
  const query = (input.query ?? OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return { query, limit: normalizeLimit(input.limit, OPEN_GOVERNMENT_AUSTRALIA_SEARCH_DEFAULT_LIMIT, OPEN_GOVERNMENT_AUSTRALIA_SEARCH_MAX_LIMIT) }
}

export function normalizeOpenGovernmentAustraliaRecordsInput(input: OpenGovernmentAustraliaRecordsInput = {}): NormalizedOpenGovernmentAustraliaRecordsInput {
  const resourceId = (input.resourceId ?? OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID).trim().toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(resourceId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--resource-id must be a CKAN resource UUID.')
  }
  return { resourceId, limit: normalizeLimit(input.limit, OPEN_GOVERNMENT_AUSTRALIA_RECORDS_DEFAULT_LIMIT, OPEN_GOVERNMENT_AUSTRALIA_RECORDS_MAX_LIMIT) }
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const limit = value ?? fallback
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${max}.`)
  }
  return limit
}

function parsePackageSearch(value: unknown): OpenGovernmentAustraliaPackageSearch {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government Australia package_search response had an unexpected schema.')
  }
  return {
    count: optionalNumber(value.count),
    results: value.results.filter(isRecord).map(parseDataset),
  }
}

function parseDataset(value: Record<string, unknown>): OpenGovernmentAustraliaDataset {
  return {
    id: requiredString(value.id, 'dataset.id'),
    name: optionalString(value.name),
    title: optionalString(value.title),
    notes: optionalString(value.notes),
    organizationTitle: isRecord(value.organization) ? optionalString(value.organization.title) : undefined,
    resources: Array.isArray(value.resources) ? value.resources.filter(isRecord).map(parseResource) : [],
  }
}

function parseResource(value: Record<string, unknown>): OpenGovernmentAustraliaResource {
  return {
    id: requiredString(value.id, 'resource.id'),
    name: optionalString(value.name),
    format: optionalString(value.format),
    url: optionalString(value.url),
    datastoreActive: value.datastore_active === true,
  }
}

function parseDatastoreRecords(value: unknown, fallbackResourceId: string): OpenGovernmentAustraliaDatastoreRecords {
  if (!isRecord(value) || !Array.isArray(value.records)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Government Australia datastore_search response had an unexpected schema.')
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
  if (isRecord(value.error)) {
    return optionalString(value.error.message) ?? optionalString(value.error.__type)
  }
  return optionalString(value.error) ?? optionalString(value.message)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Open Government Australia response missing ${field}.`)
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
