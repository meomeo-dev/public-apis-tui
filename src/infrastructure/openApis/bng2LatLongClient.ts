import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BNG2LATLONG_BASE_URL = 'https://api.getthedata.com'
export const BNG2LATLONG_DEFAULT_EASTING = 319421
export const BNG2LATLONG_DEFAULT_NORTHING = 174588
export const BNG2LATLONG_MIN_COORDINATE = 0
export const BNG2LATLONG_MAX_EASTING = 999_999
export const BNG2LATLONG_MAX_NORTHING = 9_999_999

export type Bng2LatLongInput = {
  easting?: number | undefined
  northing?: number | undefined
}

export type NormalizedBng2LatLongInput = {
  easting: number
  northing: number
}

export type Bng2LatLongConversion = {
  status: 'ok'
  easting: number
  northing: number
  latitude: number
  longitude: number
}

export class Bng2LatLongClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async convert(input: NormalizedBng2LatLongInput): Promise<Bng2LatLongConversion> {
    const url = new URL(`/bng2latlong/${String(input.easting)}/${String(input.northing)}/json`, this.options.baseUrl ?? BNG2LATLONG_BASE_URL)
    const parsed = await this.fetchJson(url)
    return parseConversion(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `bng2latlong request failed: ${String(error)}`, {
        provider: 'bng2latlong',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `bng2latlong response body could not be read: ${String(error)}`, {
        provider: 'bng2latlong',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'bng2latlong is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'bng2latlong',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `bng2latlong returned a non-JSON response: ${String(error)}`, {
        provider: 'bng2latlong',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isErrorResponse(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `bng2latlong request failed with HTTP ${response.status}.`, {
        provider: 'bng2latlong',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeBng2LatLongInput(input: Bng2LatLongInput = {}): NormalizedBng2LatLongInput {
  return {
    easting: normalizeCoordinate(input.easting ?? BNG2LATLONG_DEFAULT_EASTING, '--easting', BNG2LATLONG_MAX_EASTING),
    northing: normalizeCoordinate(input.northing ?? BNG2LATLONG_DEFAULT_NORTHING, '--northing', BNG2LATLONG_MAX_NORTHING),
  }
}

function parseConversion(value: unknown): Bng2LatLongConversion {
  if (!isRecord(value) || value.status !== 'ok' || typeof value.easting !== 'number' || typeof value.northing !== 'number' || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'bng2latlong response had an unexpected conversion schema.', { response: value })
  }
  return {
    status: 'ok',
    easting: value.easting,
    northing: value.northing,
    latitude: value.latitude,
    longitude: value.longitude,
  }
}

function normalizeCoordinate(value: number, label: string, maxCoordinate: number): number {
  if (!Number.isInteger(value) || value <= BNG2LATLONG_MIN_COORDINATE || value > maxCoordinate) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a positive integer from 1 to ${String(maxCoordinate)}.`)
  }
  return value
}

function isErrorResponse(value: unknown): boolean {
  return isRecord(value) && value.status === 'error'
}

function readErrorMessage(value: unknown): string | undefined {
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
