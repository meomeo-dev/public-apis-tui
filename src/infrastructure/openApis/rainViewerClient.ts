import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RAINVIEWER_DEFAULT_BASE_URL = 'https://api.rainviewer.com'
export const RAINVIEWER_DEFAULT_LIMIT = 13
export const RAINVIEWER_MAX_LIMIT = 13
export const RAINVIEWER_DEFAULT_SIZE = 512
export const RAINVIEWER_DEFAULT_ZOOM = 5
export const RAINVIEWER_DEFAULT_LATITUDE = 37.7749
export const RAINVIEWER_DEFAULT_LONGITUDE = -122.4194
export const RAINVIEWER_DEFAULT_COLOR = 2

export type RainViewerMapsInput = {
  limit?: number | undefined
  size?: number | undefined
  zoom?: number | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  color?: number | undefined
  smooth?: boolean | undefined
  snow?: boolean | undefined
}

export type NormalizedRainViewerMapsInput = {
  limit: number
  size: 256 | 512
  zoom: number
  latitude: number
  longitude: number
  color: number
  smooth: boolean
  snow: boolean
}

export type RainViewerFrame = {
  time: number
  path: string
  tileUrl: string
}

export type RainViewerMaps = {
  version?: string | undefined
  generated?: number | undefined
  host: string
  radarPast: RainViewerFrame[]
  radarNowcast: RainViewerFrame[]
  satelliteInfrared: RainViewerFrame[]
}

export class RainViewerClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async maps(input: NormalizedRainViewerMapsInput): Promise<RainViewerMaps> {
    const url = new URL('/public/weather-maps.json', this.options.baseUrl ?? RAINVIEWER_DEFAULT_BASE_URL)
    const parsed = await this.fetchJson(url)
    return parseMaps(parsed, input)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `RainViewer request failed: ${String(error)}`, { provider: 'rainviewer', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `RainViewer returned a non-JSON response: ${String(error)}`, {
        provider: 'rainviewer',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `RainViewer request failed with HTTP ${response.status}.`, {
        provider: 'rainviewer',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeRainViewerMapsInput(input: RainViewerMapsInput = {}): NormalizedRainViewerMapsInput {
  return {
    limit: normalizeInteger(input.limit ?? RAINVIEWER_DEFAULT_LIMIT, '--limit', 1, RAINVIEWER_MAX_LIMIT),
    size: normalizeSize(input.size ?? RAINVIEWER_DEFAULT_SIZE),
    zoom: normalizeInteger(input.zoom ?? RAINVIEWER_DEFAULT_ZOOM, '--zoom', 0, 7),
    latitude: normalizeLatitude(input.latitude ?? RAINVIEWER_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(input.longitude ?? RAINVIEWER_DEFAULT_LONGITUDE),
    color: normalizeInteger(input.color ?? RAINVIEWER_DEFAULT_COLOR, '--color', 0, 8),
    smooth: input.smooth !== false,
    snow: input.snow === true,
  }
}

function parseMaps(value: unknown, input: NormalizedRainViewerMapsInput): RainViewerMaps {
  const record = requireRecord(value, 'RainViewer weather maps response')
  const host = readString(record.host) ?? ''
  const radar = isRecord(record.radar) ? record.radar : {}
  const satellite = isRecord(record.satellite) ? record.satellite : {}
  return {
    version: readString(record.version),
    generated: readNumber(record.generated),
    host,
    radarPast: parseFrames(radar.past, host, input).slice(-input.limit),
    radarNowcast: parseFrames(radar.nowcast, host, input).slice(0, input.limit),
    satelliteInfrared: parseFrames(satellite.infrared, host, input).slice(-input.limit),
  }
}

function parseFrames(value: unknown, host: string, input: NormalizedRainViewerMapsInput): RainViewerFrame[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).flatMap(frame => {
    const time = readNumber(frame.time)
    const path = readString(frame.path)
    if (time === undefined || path === undefined) {
      return []
    }
    return [{
      time,
      path,
      tileUrl: buildTileUrl(host, path, input),
    }]
  })
}

function buildTileUrl(host: string, path: string, input: NormalizedRainViewerMapsInput): string {
  return `${host}${path}/${input.size}/${input.zoom}/${formatCoordinate(input.latitude)}/${formatCoordinate(input.longitude)}/${input.color}/${input.smooth ? 1 : 0}_${input.snow ? 1 : 0}.png`
}

function formatCoordinate(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value)
}

function normalizeSize(value: number): 256 | 512 {
  if (value === 256 || value === 512) {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--size must be 256 or 512.', { value })
}

function normalizeLatitude(value: number): number {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--latitude must be between -90 and 90.', { value })
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--longitude must be between -180 and 180.', { value })
  }
  return value
}

function normalizeInteger(value: number, optionName: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be an integer between ${min} and ${max}.`, { min, max, value })
  }
  return value
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} must be a JSON object.`, { provider: 'rainviewer' })
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readString(value.message) ?? readString(value.error)
}
