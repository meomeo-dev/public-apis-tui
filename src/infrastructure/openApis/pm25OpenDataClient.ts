import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const PM25_OPEN_DATA_DEFAULT_BASE_URL = 'https://pm25.lass-net.org/data'
export const PM25_OPEN_DATA_AIRBOX_DEFAULT_LIMIT = 506
export const PM25_OPEN_DATA_AIRBOX_MAX_LIMIT = 506
export const PM25_OPEN_DATA_LASS_DEFAULT_LIMIT = 10
export const PM25_OPEN_DATA_LASS_MAX_LIMIT = 10

export type Pm25OpenDataFeedInput = {
  limit?: number | undefined
}

export type NormalizedPm25OpenDataAirboxInput = {
  limit: number
}

export type NormalizedPm25OpenDataLassInput = {
  limit: number
}

export type Pm25OpenDataFeed = {
  deviceId?: string | undefined
  app?: string | undefined
  area?: string | undefined
  siteName?: string | undefined
  name?: string | undefined
  date?: string | undefined
  time?: string | undefined
  timestamp?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  pm25?: number | undefined
  pm10?: number | undefined
  temperature?: number | undefined
  humidity?: number | undefined
}

export type Pm25OpenDataFeedResponse = {
  source?: string | undefined
  cD0Source?: string | undefined
  numOfRecords?: number | undefined
  version?: string | undefined
  feeds: Pm25OpenDataFeed[]
}

export class Pm25OpenDataClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listAirbox(input: NormalizedPm25OpenDataAirboxInput): Promise<Pm25OpenDataFeedResponse> {
    const response = await this.fetchFeed('last-all-airbox.json')
    return { ...response, feeds: response.feeds.slice(0, input.limit) }
  }

  async listLass(input: NormalizedPm25OpenDataLassInput): Promise<Pm25OpenDataFeedResponse> {
    const response = await this.fetchFeed('last-all-lass.json')
    return { ...response, feeds: response.feeds.slice(0, input.limit) }
  }

  private async fetchFeed(filename: string): Promise<Pm25OpenDataFeedResponse> {
    const url = new URL(`${this.options.baseUrl ?? PM25_OPEN_DATA_DEFAULT_BASE_URL}/${filename}`)
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PM2.5 Open Data request failed: ${String(error)}`, {
        provider: 'pm25opendata',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PM2.5 Open Data returned a non-JSON response: ${String(error)}`, {
        provider: 'pm25opendata',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `PM2.5 Open Data request failed with HTTP ${response.status}.`, {
        provider: 'pm25opendata',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parseFeedResponse(parsed)
  }
}

export function normalizePm25OpenDataAirboxInput(input: Pm25OpenDataFeedInput = {}): NormalizedPm25OpenDataAirboxInput {
  return { limit: normalizeLimit(input.limit, PM25_OPEN_DATA_AIRBOX_DEFAULT_LIMIT, PM25_OPEN_DATA_AIRBOX_MAX_LIMIT) }
}

export function normalizePm25OpenDataLassInput(input: Pm25OpenDataFeedInput = {}): NormalizedPm25OpenDataLassInput {
  return { limit: normalizeLimit(input.limit, PM25_OPEN_DATA_LASS_DEFAULT_LIMIT, PM25_OPEN_DATA_LASS_MAX_LIMIT) }
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const limit = value ?? fallback
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${max}.`)
  }
  return limit
}

function parseFeedResponse(value: unknown): Pm25OpenDataFeedResponse {
  if (!isRecord(value) || !Array.isArray(value.feeds)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PM2.5 Open Data response had an unexpected schema.')
  }
  return {
    source: optionalString(value.source),
    cD0Source: optionalString(value.c_d0_source),
    numOfRecords: optionalNumber(value.num_of_records),
    version: optionalString(value.version),
    feeds: value.feeds.filter(isRecord).map(parseFeed),
  }
}

function parseFeed(value: Record<string, unknown>): Pm25OpenDataFeed {
  return {
    deviceId: optionalString(value.device_id),
    app: optionalString(value.app),
    area: optionalString(value.area),
    siteName: optionalString(value.SiteName),
    name: optionalString(value.name),
    date: optionalString(value.date),
    time: optionalString(value.time),
    timestamp: optionalString(value.timestamp),
    latitude: optionalNumber(value.gps_lat),
    longitude: optionalNumber(value.gps_lon),
    pm25: optionalNumber(value.s_d0),
    pm10: optionalNumber(value.s_d1),
    temperature: optionalNumber(value.s_t0),
    humidity: optionalNumber(value.s_h0),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.error)
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
