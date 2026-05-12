import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const DC_OPEN_DATA_DEFAULT_DATASET_QUERY = 'business'
export const DC_OPEN_DATA_DEFAULT_DATASET_LIMIT = 100
export const DC_OPEN_DATA_MAX_DATASET_LIMIT = 100
export const DC_OPEN_DATA_DEFAULT_LICENSE_STATUS = 'Active'
export const DC_OPEN_DATA_DEFAULT_LICENSE_LIMIT = 1000
export const DC_OPEN_DATA_MAX_LICENSE_LIMIT = 1000

type FetchImpl = typeof fetch

export type DcOpenDataDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedDcOpenDataDatasetsInput = {
  query: string
  limit: number
}

export type DcOpenDataBusinessLicensesInput = {
  status?: string | undefined
  limit?: number | undefined
}

export type NormalizedDcOpenDataBusinessLicensesInput = {
  status?: string | undefined
  limit: number
}

export type DcOpenDataDataset = {
  id: string
  title: string
  type?: string | undefined
  description?: string | undefined
  owner?: string | undefined
  categories: string[]
  tags: string[]
  modifiedAt?: string | undefined
  url?: string | undefined
}

export type DcOpenDataBusinessLicense = {
  objectId: number
  entityName?: string | undefined
  licenseCategory?: string | undefined
  licenseStatus?: string | undefined
  licenseStartDate?: string | undefined
  licenseEndDate?: string | undefined
  siteAddress?: string | undefined
  city?: string | undefined
  state?: string | undefined
  zip?: string | undefined
  ward?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

export class DcOpenDataClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined } = {}) {}

  async listDatasets(input: NormalizedDcOpenDataDatasetsInput): Promise<{ total: number; datasets: DcOpenDataDataset[]; rateLimit: DcOpenDataRateLimit }> {
    const url = new URL('/api/search/v1/collections/dataset/items', 'https://opendata.dc.gov')
    url.searchParams.set('q', input.query)
    url.searchParams.set('limit', String(input.limit))
    const response = await this.fetchJson(url)
    const datasets = parseCatalogDatasets(response.parsed)
    const total = isRecord(response.parsed) ? parseNumber(response.parsed.numberMatched) : undefined
    return {
      total: total ?? datasets.length,
      datasets,
      rateLimit: response.rateLimit,
    }
  }

  async listBusinessLicenses(input: NormalizedDcOpenDataBusinessLicensesInput): Promise<DcOpenDataBusinessLicense[]> {
    const url = new URL('/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0/query', 'https://maps2.dcgis.dc.gov')
    url.searchParams.set('where', input.status === undefined ? '1=1' : `LICENSESTATUS='${escapeArcgisSqlString(input.status)}'`)
    url.searchParams.set('outFields', [
      'OBJECTID',
      'ENTITY_NAME',
      'LICENSE_CATEGORY_TEXT',
      'LICENSESTATUS',
      'LICENSE_START_DATE',
      'LICENSE_END_DATE',
      'SITE_ADDRESS',
      'CITY',
      'STATE',
      'ZIP',
      'WARD',
      'LATITUDE',
      'LONGITUDE',
    ].join(','))
    url.searchParams.set('orderByFields', 'DCS_LAST_MOD_DTTM DESC')
    url.searchParams.set('returnGeometry', 'false')
    url.searchParams.set('resultRecordCount', String(input.limit))
    url.searchParams.set('f', 'pjson')
    const response = await this.fetchJson(url)
    return parseBusinessLicenses(response.parsed)
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: DcOpenDataRateLimit }> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'District of Columbia Open Data returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `District of Columbia Open Data request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return {
      parsed,
      rateLimit: readRateLimit(response.headers),
    }
  }
}

export type DcOpenDataRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export function normalizeDcOpenDataDatasetsInput(input: DcOpenDataDatasetsInput = {}): NormalizedDcOpenDataDatasetsInput {
  const query = input.query?.trim() || DC_OPEN_DATA_DEFAULT_DATASET_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 120 characters or fewer.')
  }
  return {
    query,
    limit: normalizeInteger(input.limit, '--limit', DC_OPEN_DATA_DEFAULT_DATASET_LIMIT, 1, DC_OPEN_DATA_MAX_DATASET_LIMIT),
  }
}

export function normalizeDcOpenDataBusinessLicensesInput(input: DcOpenDataBusinessLicensesInput = {}): NormalizedDcOpenDataBusinessLicensesInput {
  const status = input.status?.trim() || DC_OPEN_DATA_DEFAULT_LICENSE_STATUS
  if (status.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--status must be 80 characters or fewer.')
  }
  return {
    status,
    limit: normalizeInteger(input.limit, '--limit', DC_OPEN_DATA_DEFAULT_LICENSE_LIMIT, 1, DC_OPEN_DATA_MAX_LICENSE_LIMIT),
  }
}

function parseCatalogDatasets(value: unknown): DcOpenDataDataset[] {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'District of Columbia Open Data catalog response had an unexpected schema.')
  }
  return value.features.map(parseDataset).filter((entry): entry is DcOpenDataDataset => entry !== undefined)
}

function parseDataset(value: unknown): DcOpenDataDataset | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readString(value.id)
  const properties = isRecord(value.properties) ? value.properties : undefined
  const title = readString(properties?.title)
  if (id === undefined || title === undefined) {
    return undefined
  }
  return {
    id,
    title,
    type: readString(properties?.type),
    description: cleanHtml(readString(properties?.snippet) ?? readString(properties?.description)),
    owner: readString(properties?.owner) ?? readString(properties?.accessInformation),
    categories: readStringArray(properties?.categories),
    tags: readStringArray(properties?.tags),
    modifiedAt: parseEpochMillis(properties?.modified),
    url: readString(properties?.url),
  }
}

function parseBusinessLicenses(value: unknown): DcOpenDataBusinessLicense[] {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'District of Columbia business license response had an unexpected schema.')
  }
  return value.features.map(parseBusinessLicense).filter((entry): entry is DcOpenDataBusinessLicense => entry !== undefined)
}

function parseBusinessLicense(value: unknown): DcOpenDataBusinessLicense | undefined {
  if (!isRecord(value) || !isRecord(value.attributes)) {
    return undefined
  }
  const attributes = value.attributes
  const objectId = parseNumber(attributes.OBJECTID)
  if (objectId === undefined) {
    return undefined
  }
  return {
    objectId,
    entityName: readString(attributes.ENTITY_NAME),
    licenseCategory: readString(attributes.LICENSE_CATEGORY_TEXT),
    licenseStatus: readString(attributes.LICENSESTATUS),
    licenseStartDate: parseEpochMillis(attributes.LICENSE_START_DATE),
    licenseEndDate: parseEpochMillis(attributes.LICENSE_END_DATE),
    siteAddress: readString(attributes.SITE_ADDRESS),
    city: readString(attributes.CITY),
    state: readString(attributes.STATE),
    zip: readString(attributes.ZIP),
    ward: readString(attributes.WARD),
    latitude: parseNumber(attributes.LATITUDE),
    longitude: parseNumber(attributes.LONGITUDE),
  }
}

function normalizeInteger(value: number | undefined, name: string, defaultValue: number, min: number, max: number): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${name} must be an integer from ${min} to ${max}.`)
  }
  return normalized
}

function readRateLimit(headers: Headers): DcOpenDataRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit-portal_search_throttler') ?? headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining-portal_search_throttler') ?? headers.get('x-ratelimit-remaining') ?? undefined,
    reset: headers.get('x-ratelimit-reset-portal_search_throttler') ?? headers.get('x-ratelimit-reset') ?? undefined,
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '').map(entry => entry.trim()) : []
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseEpochMillis(value: unknown): string | undefined {
  const millis = parseNumber(value)
  return millis === undefined ? undefined : new Date(millis).toISOString()
}

function cleanHtml(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return value.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function escapeArcgisSqlString(value: string): string {
  return value.replace(/'/gu, "''")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
