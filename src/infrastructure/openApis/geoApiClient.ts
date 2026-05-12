import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GEO_API_BASE_URL = 'https://geo.api.gouv.fr'
export const GEO_API_DEFAULT_COMMUNE_QUERY = 'Paris'
export const GEO_API_DEFAULT_LIMIT = 10
export const GEO_API_MAX_LIMIT = 50
export const GEO_API_COMMUNE_FIELDS = 'nom,code,codesPostaux,departement,region,population'
export const GEO_API_COMMUNE_GEOMETRY_FIELDS = 'nom,code,codesPostaux,centre,departement,region,population'
export const GEO_API_DEPARTMENT_FIELDS = 'nom,code,region'
export const GEO_API_REGION_FIELDS = 'nom,code'

export type GeoApiCommunesInput = {
  query?: string | undefined
  postalCode?: string | undefined
  departmentCode?: string | undefined
  regionCode?: string | undefined
  limit?: number | undefined
  includeGeometry?: boolean | undefined
}

export type NormalizedGeoApiCommunesInput = {
  query?: string | undefined
  postalCode?: string | undefined
  departmentCode?: string | undefined
  regionCode?: string | undefined
  limit: number
  includeGeometry: boolean
}

export type GeoApiDepartmentsInput = {
  regionCode?: string | undefined
  limit?: number | undefined
}

export type NormalizedGeoApiDepartmentsInput = {
  regionCode?: string | undefined
  limit: number
}

export type GeoApiRegionsInput = {
  limit?: number | undefined
}

export type NormalizedGeoApiRegionsInput = {
  limit: number
}

export type GeoApiCommune = {
  name: string
  code: string
  postalCodes: string[]
  population?: number | undefined
  score?: number | undefined
  department?: GeoApiCodeName | undefined
  region?: GeoApiCodeName | undefined
  longitude?: number | undefined
  latitude?: number | undefined
}

export type GeoApiDepartment = GeoApiCodeName & {
  region?: GeoApiCodeName | undefined
}

export type GeoApiRegion = GeoApiCodeName

type GeoApiCodeName = {
  code: string
  name: string
}

export class GeoApiClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listCommunes(input: NormalizedGeoApiCommunesInput): Promise<GeoApiCommune[]> {
    const url = new URL('/communes', this.options.baseUrl ?? GEO_API_BASE_URL)
    if (input.query !== undefined) {
      url.searchParams.set('nom', input.query)
      url.searchParams.set('boost', 'population')
    }
    if (input.postalCode !== undefined) url.searchParams.set('codePostal', input.postalCode)
    if (input.departmentCode !== undefined) url.searchParams.set('codeDepartement', input.departmentCode)
    if (input.regionCode !== undefined) url.searchParams.set('codeRegion', input.regionCode)
    url.searchParams.set('fields', input.includeGeometry ? GEO_API_COMMUNE_GEOMETRY_FIELDS : GEO_API_COMMUNE_FIELDS)
    url.searchParams.set('format', 'json')
    if (input.includeGeometry) {
      url.searchParams.set('geometry', 'centre')
    }
    url.searchParams.set('limit', String(input.limit))
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Geo API communes response had an unexpected schema.', { response: parsed })
    }
    return parsed.filter(isRecord).map(value => parseCommune(value, input.includeGeometry)).filter((commune): commune is GeoApiCommune => commune !== undefined)
  }

  async listDepartments(input: NormalizedGeoApiDepartmentsInput): Promise<GeoApiDepartment[]> {
    const path = input.regionCode === undefined ? '/departements' : `/regions/${encodeURIComponent(input.regionCode)}/departements`
    const url = new URL(path, this.options.baseUrl ?? GEO_API_BASE_URL)
    url.searchParams.set('fields', GEO_API_DEPARTMENT_FIELDS)
    url.searchParams.set('format', 'json')
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Geo API departments response had an unexpected schema.', { response: parsed })
    }
    return parsed.filter(isRecord).map(parseDepartment).filter((department): department is GeoApiDepartment => department !== undefined).slice(0, input.limit)
  }

  async listRegions(input: NormalizedGeoApiRegionsInput): Promise<GeoApiRegion[]> {
    const url = new URL('/regions', this.options.baseUrl ?? GEO_API_BASE_URL)
    url.searchParams.set('fields', GEO_API_REGION_FIELDS)
    url.searchParams.set('format', 'json')
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Geo API regions response had an unexpected schema.', { response: parsed })
    }
    return parsed.filter(isRecord).map(parseCodeName).filter((region): region is GeoApiRegion => region !== undefined).slice(0, input.limit)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Geo API request failed: ${String(error)}`, {
        provider: 'geoapi',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Geo API response body could not be read: ${String(error)}`, {
        provider: 'geoapi',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Geo API is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'geoapi',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Geo API returned a non-JSON response: ${String(error)}`, {
        provider: 'geoapi',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isErrorResponse(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Geo API request failed with HTTP ${response.status}.`, {
        provider: 'geoapi',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeGeoApiCommunesInput(input: GeoApiCommunesInput = {}): NormalizedGeoApiCommunesInput {
  const query = normalizeSearchText(input.query, '--query')
  const postalCode = normalizeCode(input.postalCode, '--postal-code', /^\d{5}$/u, 'a five-digit French postal code such as 75001')
  const departmentCode = normalizeCode(input.departmentCode, '--department-code', /^[0-9A-Z]{2,3}$/u, 'a French department code such as 75, 2A, or 971')
  const regionCode = normalizeRegionCode(input.regionCode)
  const filterCount = [query, postalCode, departmentCode, regionCode].filter(value => value !== undefined).length
  if (filterCount === 0) {
    return { query: GEO_API_DEFAULT_COMMUNE_QUERY, limit: normalizeLimit(input.limit), includeGeometry: input.includeGeometry === true }
  }
  if (filterCount > 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Use only one commune filter at a time: --query, --postal-code, --department-code, or --region-code.')
  }
  return {
    ...(query !== undefined ? { query } : {}),
    ...(postalCode !== undefined ? { postalCode } : {}),
    ...(departmentCode !== undefined ? { departmentCode } : {}),
    ...(regionCode !== undefined ? { regionCode } : {}),
    limit: normalizeLimit(input.limit),
    includeGeometry: input.includeGeometry === true,
  }
}

export function normalizeGeoApiDepartmentsInput(input: GeoApiDepartmentsInput = {}): NormalizedGeoApiDepartmentsInput {
  const regionCode = normalizeRegionCode(input.regionCode)
  return {
    ...(regionCode !== undefined ? { regionCode } : {}),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeGeoApiRegionsInput(input: GeoApiRegionsInput = {}): NormalizedGeoApiRegionsInput {
  return { limit: normalizeLimit(input.limit) }
}

function parseCommune(value: Record<string, unknown>, includeGeometry: boolean): GeoApiCommune | undefined {
  const codeName = parseCodeName(value)
  if (codeName === undefined) return undefined
  const coordinates = includeGeometry ? parsePoint(value.centre) : undefined
  return {
    ...codeName,
    postalCodes: Array.isArray(value.codesPostaux) ? value.codesPostaux.filter((entry): entry is string => typeof entry === 'string') : [],
    population: optionalNumber(value.population),
    score: optionalNumber(value._score),
    department: isRecord(value.departement) ? parseCodeName(value.departement) : undefined,
    region: isRecord(value.region) ? parseCodeName(value.region) : undefined,
    ...(coordinates !== undefined ? coordinates : {}),
  }
}

function parseDepartment(value: Record<string, unknown>): GeoApiDepartment | undefined {
  const codeName = parseCodeName(value)
  if (codeName === undefined) return undefined
  return {
    ...codeName,
    region: isRecord(value.region) ? parseCodeName(value.region) : undefined,
  }
}

function parseCodeName(value: Record<string, unknown>): GeoApiCodeName | undefined {
  if (typeof value.nom !== 'string' || typeof value.code !== 'string') return undefined
  return { name: value.nom, code: value.code }
}

function parsePoint(value: unknown): { longitude: number; latitude: number } | undefined {
  if (!isRecord(value) || !Array.isArray(value.coordinates) || value.coordinates.length < 2) return undefined
  const [longitude, latitude] = value.coordinates
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return undefined
  return { longitude, latitude }
}

function normalizeSearchText(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined
  const text = value.trim()
  if (text.length === 0) return undefined
  if (text.length > 80) throw new RuntimeFailure('INVALID_ARGUMENT', `${flag} must be 80 characters or fewer.`)
  if (!/^[\p{L}\p{N} .,'’()-]+$/u.test(text)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${flag} contains unsupported characters.`)
  }
  return text
}

function normalizeCode(value: string | undefined, flag: string, pattern: RegExp, expectation: string): string | undefined {
  if (value === undefined) return undefined
  const code = value.trim().toUpperCase()
  if (!pattern.test(code)) throw new RuntimeFailure('INVALID_ARGUMENT', `${flag} must be ${expectation}.`)
  return code
}

function normalizeRegionCode(value: string | undefined): string | undefined {
  const code = normalizeCode(value, '--region-code', /^\d{2}$/u, 'a current two-digit French region code such as 11 or 84')
  if (code !== undefined && !GEO_API_REGION_CODES.has(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--region-code must be one of the current French region codes: 01, 02, 03, 04, 06, 11, 24, 27, 28, 32, 44, 52, 53, 75, 76, 84, 93, or 94.')
  }
  return code
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) return GEO_API_DEFAULT_LIMIT
  if (!Number.isInteger(value) || value < 1 || value > GEO_API_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${GEO_API_MAX_LIMIT}.`)
  }
  return value
}

function isErrorResponse(value: unknown): boolean {
  return isRecord(value) && (typeof value.message === 'string' || typeof value.error === 'string')
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return typeof value.message === 'string' ? value.message : typeof value.error === 'string' ? value.error : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const GEO_API_REGION_CODES = new Set(['01', '02', '03', '04', '06', '11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94'])
