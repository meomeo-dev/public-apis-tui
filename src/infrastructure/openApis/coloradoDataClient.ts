import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const COLORADO_DATA_DEFAULT_DATASET_QUERY = 'business'
export const COLORADO_DATA_DEFAULT_DATASET_LIMIT = 100
export const COLORADO_DATA_MAX_DATASET_LIMIT = 100
export const COLORADO_DATA_DEFAULT_ENTITY_STATUS = 'Good Standing'
export const COLORADO_DATA_DEFAULT_ENTITY_LIMIT = 1000
export const COLORADO_DATA_MAX_ENTITY_LIMIT = 1000

type FetchImpl = typeof fetch

export type ColoradoDataDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedColoradoDataDatasetsInput = {
  query: string
  limit: number
}

export type ColoradoDataBusinessEntitiesInput = {
  status?: string | undefined
  limit?: number | undefined
}

export type NormalizedColoradoDataBusinessEntitiesInput = {
  status?: string | undefined
  limit: number
}

export type ColoradoDataDataset = {
  id: string
  name: string
  description?: string | undefined
  attribution?: string | undefined
  category?: string | undefined
  updatedAt?: string | undefined
  link?: string | undefined
}

export type ColoradoBusinessEntity = {
  entityId: string
  entityName?: string | undefined
  entityStatus?: string | undefined
  entityType?: string | undefined
  jurisdiction?: string | undefined
  formationDate?: string | undefined
  city?: string | undefined
  state?: string | undefined
  zip?: string | undefined
  agentName?: string | undefined
}

export class ColoradoDataClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined } = {}) {}

  async listDatasets(input: NormalizedColoradoDataDatasetsInput): Promise<{ total: number; datasets: ColoradoDataDataset[] }> {
    const url = new URL('/api/catalog/v1', 'https://api.us.socrata.com')
    url.searchParams.set('domains', 'data.colorado.gov')
    url.searchParams.set('only', 'datasets')
    url.searchParams.set('limit', '100')
    const parsed = await this.fetchJson(url)
    const datasets = parseCatalogDatasets(parsed)
    const query = input.query.toLowerCase()
    const filtered = datasets.filter(dataset =>
      [dataset.id, dataset.name, dataset.description, dataset.attribution, dataset.category]
        .some(value => value?.toLowerCase().includes(query)),
    )
    return { total: filtered.length, datasets: filtered.slice(0, input.limit) }
  }

  async listBusinessEntities(input: NormalizedColoradoDataBusinessEntitiesInput): Promise<ColoradoBusinessEntity[]> {
    const url = new URL('/resource/4ykn-tg5h.json', 'https://data.colorado.gov')
    url.searchParams.set('$select', 'entityid,entityname,entitystatus,entitytype,jurisdictonofformation,entityformdate,principalcity,principalstate,principalzipcode,agentfirstname,agentlastname')
    url.searchParams.set('$order', 'entityformdate DESC')
    url.searchParams.set('$limit', String(input.limit))
    if (input.status !== undefined) {
      url.searchParams.set('entitystatus', input.status)
    }
    const parsed = await this.fetchJson(url)
    return parseBusinessEntities(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Colorado Information Marketplace returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Colorado Information Marketplace request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeColoradoDataDatasetsInput(input: ColoradoDataDatasetsInput = {}): NormalizedColoradoDataDatasetsInput {
  const query = input.query?.trim() || COLORADO_DATA_DEFAULT_DATASET_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 120 characters or fewer.')
  }
  return {
    query,
    limit: normalizeInteger(input.limit, '--limit', COLORADO_DATA_DEFAULT_DATASET_LIMIT, 1, COLORADO_DATA_MAX_DATASET_LIMIT),
  }
}

export function normalizeColoradoDataBusinessEntitiesInput(input: ColoradoDataBusinessEntitiesInput = {}): NormalizedColoradoDataBusinessEntitiesInput {
  const status = input.status?.trim() || COLORADO_DATA_DEFAULT_ENTITY_STATUS
  if (status.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--status must be 80 characters or fewer.')
  }
  return {
    status,
    limit: normalizeInteger(input.limit, '--limit', COLORADO_DATA_DEFAULT_ENTITY_LIMIT, 1, COLORADO_DATA_MAX_ENTITY_LIMIT),
  }
}

function parseCatalogDatasets(value: unknown): ColoradoDataDataset[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colorado catalog response had an unexpected schema.')
  }
  return value.results.map(parseCatalogDataset).filter((entry): entry is ColoradoDataDataset => entry !== undefined)
}

function parseCatalogDataset(value: unknown): ColoradoDataDataset | undefined {
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
    link: `https://data.colorado.gov/d/${id}`,
  }
}

function parseBusinessEntities(value: unknown): ColoradoBusinessEntity[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Colorado business entity response had an unexpected schema.')
  }
  return value.map(parseBusinessEntity).filter((entry): entry is ColoradoBusinessEntity => entry !== undefined)
}

function parseBusinessEntity(value: unknown): ColoradoBusinessEntity | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const entityId = readString(value.entityid)
  if (entityId === undefined) {
    return undefined
  }
  const agentName = [readString(value.agentfirstname), readString(value.agentlastname)].filter((entry): entry is string => entry !== undefined).join(' ')
  return {
    entityId,
    entityName: readString(value.entityname),
    entityStatus: readString(value.entitystatus),
    entityType: readString(value.entitytype),
    jurisdiction: readString(value.jurisdictonofformation),
    formationDate: readString(value.entityformdate),
    city: readString(value.principalcity),
    state: readString(value.principalstate),
    zip: readString(value.principalzipcode),
    agentName: agentName === '' ? undefined : agentName,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
