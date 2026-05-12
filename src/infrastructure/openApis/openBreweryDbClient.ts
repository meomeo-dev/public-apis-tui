import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_BREWERY_DB_DEFAULT_BASE_URL = 'https://api.openbrewerydb.org/v1'
export const OPEN_BREWERY_DB_DEFAULT_PER_PAGE = 200
export const OPEN_BREWERY_DB_MAX_PER_PAGE = 200
export const OPEN_BREWERY_DB_DEFAULT_PAGE = 1
export const OPEN_BREWERY_DB_DEFAULT_SEARCH_QUERY = 'dogfish'

export type OpenBreweryDbListInput = {
  city?: string | undefined
  state?: string | undefined
  country?: string | undefined
  type?: string | undefined
  postal?: string | undefined
  perPage?: number | undefined
  page?: number | undefined
  sort?: string | undefined
}

export type NormalizedOpenBreweryDbListInput = {
  perPage: number
  page: number
  city?: string | undefined
  state?: string | undefined
  country?: string | undefined
  type?: string | undefined
  postal?: string | undefined
  sort?: string | undefined
}

export type OpenBreweryDbSearchInput = {
  query?: string | undefined
  perPage?: number | undefined
  page?: number | undefined
}

export type NormalizedOpenBreweryDbSearchInput = {
  query: string
  perPage: number
  page: number
}

export type OpenBreweryDbMetaInput = Omit<OpenBreweryDbListInput, 'perPage' | 'page' | 'sort'>
export type NormalizedOpenBreweryDbMetaInput = Omit<NormalizedOpenBreweryDbListInput, 'perPage' | 'page' | 'sort'>

export type OpenBreweryDbRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
}

export type OpenBreweryDbBrewery = {
  id: string
  name: string
  breweryType?: string | undefined
  address1?: string | undefined
  address2?: string | undefined
  address3?: string | undefined
  city?: string | undefined
  stateProvince?: string | undefined
  postalCode?: string | undefined
  country?: string | undefined
  longitude?: number | undefined
  latitude?: number | undefined
  phone?: string | undefined
  websiteUrl?: string | undefined
  state?: string | undefined
  street?: string | undefined
}

export type OpenBreweryDbMeta = {
  total: number
  page: number
  perPage: number
  byState: Record<string, number>
  byType: Record<string, number>
}

export class OpenBreweryDbClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listBreweries(input: NormalizedOpenBreweryDbListInput): Promise<{ breweries: OpenBreweryDbBrewery[]; rateLimit: OpenBreweryDbRateLimit }> {
    const url = this.createUrl('/breweries')
    appendListParams(url, input)
    const { parsed, rateLimit } = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Open Brewery DB breweries response must be an array.')
    }
    return { breweries: parsed.map(parseBrewery), rateLimit }
  }

  async searchBreweries(input: NormalizedOpenBreweryDbSearchInput): Promise<{ breweries: OpenBreweryDbBrewery[]; rateLimit: OpenBreweryDbRateLimit }> {
    const url = this.createUrl('/breweries/search')
    url.searchParams.set('query', input.query)
    url.searchParams.set('per_page', String(input.perPage))
    url.searchParams.set('page', String(input.page))
    const { parsed, rateLimit } = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Open Brewery DB search response must be an array.')
    }
    return { breweries: parsed.map(parseBrewery), rateLimit }
  }

  async getMeta(input: NormalizedOpenBreweryDbMetaInput): Promise<{ meta: OpenBreweryDbMeta; rateLimit: OpenBreweryDbRateLimit }> {
    const url = this.createUrl('/breweries/meta')
    appendFilterParams(url, input)
    const { parsed, rateLimit } = await this.fetchJson(url)
    return { meta: parseMeta(parsed), rateLimit }
  }

  private createUrl(path: string): URL {
    return new URL(path.replace(/^\/+/u, ''), normalizeBaseUrl(this.options.baseUrl ?? OPEN_BREWERY_DB_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: OpenBreweryDbRateLimit }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Brewery DB request failed: ${String(error)}`, {
        provider: 'openbrewerydb',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Brewery DB returned a non-JSON response: ${String(error)}`, {
        provider: 'openbrewerydb',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Brewery DB request failed with HTTP ${response.status}.`, {
        provider: 'openbrewerydb',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeOpenBreweryDbListInput(input: OpenBreweryDbListInput = {}): NormalizedOpenBreweryDbListInput {
  return {
    perPage: normalizePerPage(input.perPage),
    page: normalizePage(input.page),
    ...(input.city !== undefined ? { city: normalizeText(input.city, '--city') } : {}),
    ...(input.state !== undefined ? { state: normalizeText(input.state, '--state') } : {}),
    ...(input.country !== undefined ? { country: normalizeText(input.country, '--country') } : {}),
    ...(input.type !== undefined ? { type: normalizeText(input.type, '--type') } : {}),
    ...(input.postal !== undefined ? { postal: normalizeText(input.postal, '--postal') } : {}),
    ...(input.sort !== undefined ? { sort: normalizeText(input.sort, '--sort') } : {}),
  }
}

export function normalizeOpenBreweryDbSearchInput(input: OpenBreweryDbSearchInput = {}): NormalizedOpenBreweryDbSearchInput {
  return {
    query: normalizeText(input.query ?? OPEN_BREWERY_DB_DEFAULT_SEARCH_QUERY, '--query'),
    perPage: normalizePerPage(input.perPage),
    page: normalizePage(input.page),
  }
}

export function normalizeOpenBreweryDbMetaInput(input: OpenBreweryDbMetaInput = {}): NormalizedOpenBreweryDbMetaInput {
  return {
    ...(input.city !== undefined ? { city: normalizeText(input.city, '--city') } : {}),
    ...(input.state !== undefined ? { state: normalizeText(input.state, '--state') } : {}),
    ...(input.country !== undefined ? { country: normalizeText(input.country, '--country') } : {}),
    ...(input.type !== undefined ? { type: normalizeText(input.type, '--type') } : {}),
    ...(input.postal !== undefined ? { postal: normalizeText(input.postal, '--postal') } : {}),
  }
}

function appendListParams(url: URL, input: NormalizedOpenBreweryDbListInput): void {
  appendFilterParams(url, input)
  url.searchParams.set('per_page', String(input.perPage))
  url.searchParams.set('page', String(input.page))
  if (input.sort !== undefined) {
    url.searchParams.set('sort', input.sort)
  }
}

function appendFilterParams(url: URL, input: NormalizedOpenBreweryDbMetaInput): void {
  if (input.city !== undefined) url.searchParams.set('by_city', input.city)
  if (input.state !== undefined) url.searchParams.set('by_state', input.state)
  if (input.country !== undefined) url.searchParams.set('by_country', input.country)
  if (input.type !== undefined) url.searchParams.set('by_type', input.type)
  if (input.postal !== undefined) url.searchParams.set('by_postal', input.postal)
}

function normalizePerPage(value: number | undefined): number {
  const perPage = value ?? OPEN_BREWERY_DB_DEFAULT_PER_PAGE
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > OPEN_BREWERY_DB_MAX_PER_PAGE) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--per-page must be an integer from 1 to ${OPEN_BREWERY_DB_MAX_PER_PAGE}.`)
  }
  return perPage
}

function normalizePage(value: number | undefined): number {
  const page = value ?? OPEN_BREWERY_DB_DEFAULT_PAGE
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--page must be a positive integer.')
  }
  return page
}

function normalizeText(value: string, label: string): string {
  const text = value.trim()
  if (text.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return text
}

function parseBrewery(value: unknown): OpenBreweryDbBrewery {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Brewery DB brewery item had an unexpected schema.')
  }
  return {
    id: value.id,
    name: value.name,
    breweryType: optionalString(value.brewery_type),
    address1: optionalString(value.address_1),
    address2: optionalString(value.address_2),
    address3: optionalString(value.address_3),
    city: optionalString(value.city),
    stateProvince: optionalString(value.state_province),
    postalCode: optionalString(value.postal_code),
    country: optionalString(value.country),
    longitude: optionalNumber(value.longitude),
    latitude: optionalNumber(value.latitude),
    phone: optionalString(value.phone),
    websiteUrl: optionalString(value.website_url),
    state: optionalString(value.state),
    street: optionalString(value.street),
  }
}

function parseMeta(value: unknown): OpenBreweryDbMeta {
  if (!isRecord(value) || typeof value.total !== 'number' || typeof value.page !== 'number' || typeof value.per_page !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Brewery DB meta response had an unexpected schema.')
  }
  return {
    total: value.total,
    page: value.page,
    perPage: value.per_page,
    byState: parseNumberMap(value.by_state),
    byType: parseNumberMap(value.by_type),
  }
}

function parseNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }
  const output: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'number') {
      output[key] = entry
    }
  }
  return output
}

function readRateLimit(headers: Headers): OpenBreweryDbRateLimit {
  return {
    ...(headers.get('x-ratelimit-limit') !== null ? { limit: String(headers.get('x-ratelimit-limit')) } : {}),
    ...(headers.get('x-ratelimit-remaining') !== null ? { remaining: String(headers.get('x-ratelimit-remaining')) } : {}),
  }
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
