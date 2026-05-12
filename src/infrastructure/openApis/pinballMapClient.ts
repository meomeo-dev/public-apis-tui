import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const PINBALL_MAP_BASE_URL = 'https://pinballmap.com'
export const PINBALL_MAP_DOCS_URL = 'https://pinballmap.com/api/v1/docs'
export const PINBALL_MAP_DEFAULT_REGION = 'portland'
export const PINBALL_MAP_DEFAULT_LIMIT = 10
export const PINBALL_MAP_MAX_LIMIT = 50
export const PINBALL_MAP_DEFAULT_QUERY = 'ground'

export type PinballMapRegionsInput = {
  limit?: number | undefined
  query?: string | undefined
}

export type NormalizedPinballMapRegionsInput = {
  limit: number
  query?: string | undefined
}

export type PinballMapLocationsInput = {
  region?: string | undefined
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedPinballMapLocationsInput = {
  region: string
  query?: string | undefined
  limit: number
}

export type PinballMapRegion = {
  id: number
  name: string
  fullName: string
  latitude?: number | undefined
  longitude?: number | undefined
  state?: string | undefined
  effectiveRadius?: number | undefined
  motd?: string | undefined
}

export type PinballMapLocation = {
  id: number
  name: string
  street?: string | undefined
  city?: string | undefined
  state?: string | undefined
  zip?: string | undefined
  country?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  machineCount?: number | undefined
  isSternArmy?: boolean | undefined
  icActive?: boolean | undefined
  lastUpdatedByUsername?: string | undefined
}

type PinballMapClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class PinballMapClient {
  constructor(private readonly options: PinballMapClientOptions = {}) {}

  async listRegions(input: NormalizedPinballMapRegionsInput): Promise<PinballMapRegion[]> {
    const url = new URL('/api/v1/regions.json', this.options.baseUrl ?? PINBALL_MAP_BASE_URL)
    const parsed = await this.fetchJson(url)
    const regions = readArray(parsed, 'regions').map(parseRegion)
    const filtered = input.query === undefined ? regions : regions.filter(region => matchesRegion(region, input.query ?? ''))
    return filtered.slice(0, input.limit)
  }

  async listLocations(input: NormalizedPinballMapLocationsInput): Promise<PinballMapLocation[]> {
    const regions = await this.listRegions({ limit: Number.MAX_SAFE_INTEGER })
    if (!regions.some(region => region.name === input.region)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `--region must match a known Pinball Map region slug. Try 'pinballmap.regions -- --query ${input.region}'.`, {
        provider: 'pinballmap',
        region: input.region,
      })
    }

    const url = new URL('/api/v1/locations.json', this.options.baseUrl ?? PINBALL_MAP_BASE_URL)
    url.searchParams.set('region', input.region)
    url.searchParams.set('no_details', '1')
    if (input.query !== undefined) {
      url.searchParams.set('by_location_name', input.query)
    }
    const parsed = await this.fetchJson(url)
    return readArray(parsed, 'locations').map(parseLocation).slice(0, input.limit)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Pinball Map request failed: ${String(error)}`, {
        provider: 'pinballmap',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Pinball Map response body could not be read: ${String(error)}`, {
        provider: 'pinballmap',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Pinball Map is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'pinballmap',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Pinball Map returned a non-JSON response: ${String(error)}`, {
        provider: 'pinballmap',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isRecord(parsed) && typeof parsed.error === 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', readError(parsed) ?? `Pinball Map request failed with HTTP ${response.status}.`, {
        provider: 'pinballmap',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizePinballMapRegionsInput(input: PinballMapRegionsInput = {}): NormalizedPinballMapRegionsInput {
  const query = normalizeOptionalText(input.query, '--query')
  return {
    limit: normalizeInteger(input.limit, PINBALL_MAP_DEFAULT_LIMIT, 1, PINBALL_MAP_MAX_LIMIT, '--limit'),
    ...(query !== undefined ? { query } : {}),
  }
}

export function normalizePinballMapLocationsInput(input: PinballMapLocationsInput = {}): NormalizedPinballMapLocationsInput {
  const region = normalizeSlug(input.region ?? PINBALL_MAP_DEFAULT_REGION, '--region')
  const query = normalizeOptionalText(input.query, '--query')
  return {
    region,
    limit: normalizeInteger(input.limit, PINBALL_MAP_DEFAULT_LIMIT, 1, PINBALL_MAP_MAX_LIMIT, '--limit'),
    ...(query !== undefined ? { query } : {}),
  }
}

function normalizeSlug(value: string, label: string): string {
  const slug = value.trim().toLowerCase()
  if (!/^[a-z0-9-]{2,80}$/u.test(slug)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a Pinball Map slug such as portland or chicago.`)
  }
  return slug
}

function normalizeOptionalText(value: string | undefined, label: string): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const text = value.trim()
  if (text.length < 2) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must contain at least 2 characters when provided.`)
  }
  if (text.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be 80 characters or fewer.`)
  }
  return text
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function parseRegion(value: unknown): PinballMapRegion {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Pinball Map region had an unexpected schema.', { provider: 'pinballmap', response: value })
  }
  return {
    id: readRequiredNumber(value, 'id'),
    name: readRequiredString(value, 'name'),
    fullName: readRequiredString(value, 'full_name'),
    ...readOptionalNumericStringAs(value, 'lat', 'latitude'),
    ...readOptionalNumericStringAs(value, 'lon', 'longitude'),
    ...readOptionalStringAs(value, 'state', 'state'),
    ...readOptionalNumberAs(value, 'effective_radius', 'effectiveRadius'),
    ...readOptionalStringAs(value, 'motd', 'motd'),
  }
}

function parseLocation(value: unknown): PinballMapLocation {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Pinball Map location had an unexpected schema.', { provider: 'pinballmap', response: value })
  }
  return {
    id: readRequiredNumber(value, 'id'),
    name: readRequiredString(value, 'name'),
    ...readOptionalStringAs(value, 'street', 'street'),
    ...readOptionalStringAs(value, 'city', 'city'),
    ...readOptionalStringAs(value, 'state', 'state'),
    ...readOptionalStringAs(value, 'zip', 'zip'),
    ...readOptionalStringAs(value, 'country', 'country'),
    ...readOptionalNumericStringAs(value, 'lat', 'latitude'),
    ...readOptionalNumericStringAs(value, 'lon', 'longitude'),
    ...readOptionalNumberAs(value, 'machine_count', 'machineCount'),
    ...readOptionalBooleanAs(value, 'is_stern_army', 'isSternArmy'),
    ...readOptionalBooleanAs(value, 'ic_active', 'icActive'),
    ...readOptionalStringAs(value, 'last_updated_by_username', 'lastUpdatedByUsername'),
  }
}

function readArray(record: unknown, key: string): unknown[] {
  if (!isRecord(record) || !Array.isArray(record[key])) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Pinball Map response did not include ${key} array.`, { provider: 'pinballmap', response: record })
  }
  return record[key]
}

function matchesRegion(region: PinballMapRegion, query: string): boolean {
  const lower = query.toLowerCase()
  return region.name.toLowerCase().includes(lower) || region.fullName.toLowerCase().includes(lower) || (region.state ?? '').toLowerCase().includes(lower)
}

function readRequiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Pinball Map response did not include numeric ${key}.`, { provider: 'pinballmap', response: record })
  }
  return value
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Pinball Map response did not include ${key}.`, { provider: 'pinballmap', response: record })
  }
  return value.trim()
}

function readOptionalStringAs(record: Record<string, unknown>, source: string, target: string): Record<string, string> {
  const value = record[source]
  return typeof value === 'string' && value.trim() !== '' ? { [target]: value.trim() } : {}
}

function readOptionalNumberAs(record: Record<string, unknown>, source: string, target: string): Record<string, number> {
  const value = record[source]
  return typeof value === 'number' && Number.isFinite(value) ? { [target]: value } : {}
}

function readOptionalBooleanAs(record: Record<string, unknown>, source: string, target: string): Record<string, boolean> {
  const value = record[source]
  return typeof value === 'boolean' ? { [target]: value } : {}
}

function readOptionalNumericStringAs(record: Record<string, unknown>, source: string, target: string): Record<string, number> {
  const value = record[source]
  if (typeof value !== 'string') {
    return {}
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? { [target]: parsed } : {}
}

function readError(value: unknown): string | undefined {
  return isRecord(value) && typeof value.error === 'string' ? value.error : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
