import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HONG_KONG_GEODATA_BASE_URL = 'https://www.map.gov.hk'
export const HONG_KONG_GEODATA_DEFAULT_QUERY = 'cultural centre'
export const HONG_KONG_GEODATA_DEFAULT_LIMIT = 10
export const HONG_KONG_GEODATA_MAX_LIMIT = 50

export type HongKongGeoDataSearchInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedHongKongGeoDataSearchInput = {
  query: string
  limit: number
}

export type HongKongGeoDataLocation = {
  nameEnglish: string
  nameChinese?: string | undefined
  addressEnglish?: string | undefined
  addressChinese?: string | undefined
  districtEnglish?: string | undefined
  districtChinese?: string | undefined
  x: number
  y: number
}

export class HongKongGeoDataClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async searchLocations(input: NormalizedHongKongGeoDataSearchInput): Promise<{ locations: HongKongGeoDataLocation[]; totalReturned: number }> {
    const url = new URL('/gs/api/v1.0.0/locationSearch', this.options.baseUrl ?? HONG_KONG_GEODATA_BASE_URL)
    url.searchParams.set('q', input.query)
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Hong Kong GeoData Store locationSearch response had an unexpected schema.', { response: parsed })
    }
    const locations = parsed.filter(isRecord).map(parseLocation).filter((location): location is HongKongGeoDataLocation => location !== undefined)
    return {
      locations: locations.slice(0, input.limit),
      totalReturned: locations.length,
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hong Kong GeoData Store request failed: ${String(error)}`, {
        provider: 'hongkonggeodata',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hong Kong GeoData Store response body could not be read: ${String(error)}`, {
        provider: 'hongkonggeodata',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Hong Kong GeoData Store is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'hongkonggeodata',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hong Kong GeoData Store returned a non-JSON response: ${String(error)}`, {
        provider: 'hongkonggeodata',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      if (response.status === 500 && isRecord(parsed) && parsed.status === 500 && parsed.error === 'Internal Server Error') {
        throw new RuntimeFailure('OPEN_API_FAILED', 'Hong Kong GeoData Store returned upstream HTTP 500 JSON for this search text; try a more specific Hong Kong address, building, place, or facility query, or use cached/offline data.', {
          provider: 'hongkonggeodata',
          status: response.status,
          endpoint: url.href,
          response: parsed,
        })
      }
      throw new RuntimeFailure('OPEN_API_FAILED', `Hong Kong GeoData Store request failed with HTTP ${response.status}.`, {
        provider: 'hongkonggeodata',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeHongKongGeoDataSearchInput(input: HongKongGeoDataSearchInput = {}): NormalizedHongKongGeoDataSearchInput {
  const query = (input.query ?? HONG_KONG_GEODATA_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return {
    query,
    limit: normalizeLimit(input.limit ?? HONG_KONG_GEODATA_DEFAULT_LIMIT),
  }
}

function parseLocation(value: Record<string, unknown>): HongKongGeoDataLocation | undefined {
  const x = parseNumber(value.x)
  const y = parseNumber(value.y)
  const nameEnglish = optionalString(value.nameEN)
  if (x === undefined || y === undefined || nameEnglish === undefined) return undefined
  return {
    nameEnglish,
    nameChinese: optionalString(value.nameZH),
    addressEnglish: optionalString(value.addressEN),
    addressChinese: optionalString(value.addressZH),
    districtEnglish: optionalString(value.districtEN),
    districtChinese: optionalString(value.districtZH),
    x,
    y,
  }
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > HONG_KONG_GEODATA_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${String(HONG_KONG_GEODATA_MAX_LIMIT)}.`)
  }
  return value
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
