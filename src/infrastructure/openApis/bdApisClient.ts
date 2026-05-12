import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BD_APIS_BASE_URL = 'https://bdapis.com'
export const BD_APIS_VERSION = 'v1.2'
export const BD_APIS_DEFAULT_LIMIT = 64
export const BD_APIS_MAX_LIMIT = 64
export const BD_APIS_DEFAULT_DIVISION = 'dhaka'
export const BD_APIS_DEFAULT_DISTRICT = 'dhaka'

export type BdApisListInput = {
  limit?: number | undefined
}

export type BdApisDivisionInput = {
  division?: string | undefined
  limit?: number | undefined
}

export type BdApisDistrictInput = {
  district?: string | undefined
}

export type NormalizedBdApisListInput = {
  limit: number
}

export type NormalizedBdApisDivisionInput = {
  division: string
  limit: number
}

export type NormalizedBdApisDistrictInput = {
  district: string
}

export type BdApisDivision = {
  division: string
  divisionbn?: string | undefined
  coordinates?: BdApisCoordinates | undefined
}

export type BdApisDistrict = {
  district: string
  districtbn?: string | undefined
  coordinates?: BdApisCoordinates | undefined
  upazillas: string[]
}

export type BdApisCoordinates = {
  latitude: number
  longitude: number
  raw: string
}

export class BdApisClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listDivisions(input: NormalizedBdApisListInput): Promise<BdApisDivision[]> {
    const parsed = await this.fetchJson(new URL(`/api/${BD_APIS_VERSION}/divisions`, this.options.baseUrl ?? BD_APIS_BASE_URL))
    return parseDivisionArray(parsed).slice(0, input.limit)
  }

  async listDistricts(input: NormalizedBdApisListInput): Promise<BdApisDistrict[]> {
    const parsed = await this.fetchJson(new URL(`/api/${BD_APIS_VERSION}/districts`, this.options.baseUrl ?? BD_APIS_BASE_URL))
    return parseDistrictArray(parsed).slice(0, input.limit)
  }

  async listDivisionDistricts(input: NormalizedBdApisDivisionInput): Promise<BdApisDistrict[]> {
    const parsed = await this.fetchJson(new URL(`/api/${BD_APIS_VERSION}/division/${encodeURIComponent(input.division)}`, this.options.baseUrl ?? BD_APIS_BASE_URL))
    return parseDistrictArray(parsed).slice(0, input.limit)
  }

  async getDistrict(input: NormalizedBdApisDistrictInput): Promise<BdApisDistrict | undefined> {
    const parsed = await this.fetchJson(new URL(`/api/${BD_APIS_VERSION}/district/${encodeURIComponent(input.district)}`, this.options.baseUrl ?? BD_APIS_BASE_URL))
    return parseDistrictArray(parsed)[0]
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `BdAPIs request failed: ${String(error)}`, {
        provider: 'bdapis',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `BdAPIs returned a non-JSON response: ${String(error)}`, {
        provider: 'bdapis',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok || isProviderError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readProviderMessage(parsed) ?? `BdAPIs request failed with HTTP ${response.status}.`, {
        provider: 'bdapis',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeBdApisListInput(input: BdApisListInput = {}): NormalizedBdApisListInput {
  return {
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeBdApisDivisionInput(input: BdApisDivisionInput = {}): NormalizedBdApisDivisionInput {
  return {
    division: normalizeSlug(input.division ?? BD_APIS_DEFAULT_DIVISION, '--division'),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeBdApisDistrictInput(input: BdApisDistrictInput = {}): NormalizedBdApisDistrictInput {
  return {
    district: normalizeSlug(input.district ?? BD_APIS_DEFAULT_DISTRICT, '--district'),
  }
}

function parseDivisionArray(value: unknown): BdApisDivision[] {
  const data = readDataArray(value)
  return data.map(parseDivision).filter((entry): entry is BdApisDivision => entry !== undefined)
}

function parseDistrictArray(value: unknown): BdApisDistrict[] {
  const data = readDataArray(value)
  return data.map(parseDistrict).filter((entry): entry is BdApisDistrict => entry !== undefined)
}

function readDataArray(value: unknown): unknown[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'BdAPIs response did not include a data array.')
  }
  return value.data
}

function parseDivision(value: unknown): BdApisDivision | undefined {
  if (!isRecord(value) || typeof value.division !== 'string') {
    return undefined
  }
  return {
    division: value.division,
    divisionbn: optionalString(value.divisionbn),
    coordinates: parseCoordinates(value.coordinates),
  }
}

function parseDistrict(value: unknown): BdApisDistrict | undefined {
  if (!isRecord(value) || typeof value.district !== 'string') {
    return undefined
  }
  return {
    district: value.district,
    districtbn: optionalString(value.districtbn),
    coordinates: parseCoordinates(value.coordinates),
    upazillas: readUpazillas(value.upazillas ?? value.upazilla),
  }
}

function parseCoordinates(value: unknown): BdApisCoordinates | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const [rawLatitude, rawLongitude] = value.split(',').map(part => part.trim())
  const latitude = Number(rawLatitude)
  const longitude = Number(rawLongitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined
  }
  return { latitude, longitude, raw: value }
}

function readUpazillas(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? BD_APIS_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > BD_APIS_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${BD_APIS_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeSlug(value: string, label: string): string {
  const slug = value.trim().toLowerCase().replace(/\s+/gu, '-')
  if (!/^[a-z][a-z-]{1,60}$/u.test(slug)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a Bangladesh place slug such as dhaka or coxs-bazar.`)
  }
  return slug
}

function isProviderError(value: unknown): boolean {
  return isRecord(value) && isRecord(value.status) && typeof value.status.message === 'string' && value.status.message !== 'ok'
}

function readProviderMessage(value: unknown): string | undefined {
  return isRecord(value) && isRecord(value.status) && typeof value.status.message === 'string' ? value.status.message : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
