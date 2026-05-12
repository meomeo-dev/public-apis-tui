import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const AVIATION_WEATHER_DEFAULT_BASE_URL = 'https://aviationweather.gov/api/data'
export const AVIATION_WEATHER_DEFAULT_IDS = 'KSFO'
export const AVIATION_WEATHER_DEFAULT_LIMIT = 10
export const AVIATION_WEATHER_MAX_LIMIT = 100

export type AviationWeatherReportInput = {
  ids?: string | undefined
  hours?: number | undefined
  limit?: number | undefined
}

export type AviationWeatherTafInput = {
  ids?: string | undefined
  limit?: number | undefined
}

export type NormalizedAviationWeatherReportInput = {
  ids: string
  limit: number
  hours?: number | undefined
}

export type NormalizedAviationWeatherTafInput = {
  ids: string
  limit: number
}

export type AviationWeatherMetar = {
  icaoId: string
  receiptTime?: string | undefined
  reportTime?: string | undefined
  obsTime?: number | undefined
  temp?: number | undefined
  dewp?: number | undefined
  wdir?: number | undefined
  wspd?: number | undefined
  visib?: string | undefined
  altim?: number | undefined
  rawOb: string
  name?: string | undefined
  flightCategory?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

export type AviationWeatherTaf = {
  icaoId: string
  issueTime?: string | undefined
  validTimeFrom?: number | undefined
  validTimeTo?: number | undefined
  rawTAF: string
  name?: string | undefined
  forecastCount: number
}

export type AviationWeatherCachePolicy = {
  cacheControl?: string | undefined
  etag?: string | undefined
}

export type AviationWeatherMetarResponse = {
  reports: AviationWeatherMetar[]
  cachePolicy: AviationWeatherCachePolicy
}

export type AviationWeatherTafResponse = {
  reports: AviationWeatherTaf[]
  cachePolicy: AviationWeatherCachePolicy
}

export class AviationWeatherClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async metar(input: NormalizedAviationWeatherReportInput): Promise<AviationWeatherMetarResponse> {
    const url = this.createUrl('metar')
    url.searchParams.set('ids', input.ids)
    url.searchParams.set('format', 'json')
    if (input.hours !== undefined) url.searchParams.set('hours', String(input.hours))
    const { parsed, response } = await this.fetchJson(url)
    return {
      reports: parseMetars(parsed).slice(0, input.limit),
      cachePolicy: readCachePolicy(response),
    }
  }

  async taf(input: NormalizedAviationWeatherTafInput): Promise<AviationWeatherTafResponse> {
    const url = this.createUrl('taf')
    url.searchParams.set('ids', input.ids)
    url.searchParams.set('format', 'json')
    const { parsed, response } = await this.fetchJson(url)
    return {
      reports: parseTafs(parsed).slice(0, input.limit),
      cachePolicy: readCachePolicy(response),
    }
  }

  private createUrl(path: string): URL {
    return new URL(path, normalizeBaseUrl(this.options.baseUrl ?? AVIATION_WEATHER_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; response: Response }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `AviationWeather request failed: ${String(error)}`, { provider: 'aviationweather', endpoint: url.href })
    }

    if (response.status === 204) {
      return { parsed: [], response }
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `AviationWeather returned a non-JSON response: ${String(error)}`, { provider: 'aviationweather', endpoint: url.href, status: response.status })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `AviationWeather request failed with HTTP ${response.status}.`, { provider: 'aviationweather', endpoint: url.href, status: response.status, response: parsed })
    }

    return { parsed, response }
  }
}

export function normalizeAviationWeatherMetarInput(input: AviationWeatherReportInput = {}): NormalizedAviationWeatherReportInput {
  return {
    ids: normalizeIds(input.ids ?? AVIATION_WEATHER_DEFAULT_IDS),
    limit: normalizeInteger(input.limit ?? AVIATION_WEATHER_DEFAULT_LIMIT, '--limit', 1, AVIATION_WEATHER_MAX_LIMIT),
    ...(input.hours !== undefined ? { hours: normalizeInteger(input.hours, '--hours', 1, 48) } : {}),
  }
}

export function normalizeAviationWeatherTafInput(input: AviationWeatherTafInput = {}): NormalizedAviationWeatherTafInput {
  return {
    ids: normalizeIds(input.ids ?? AVIATION_WEATHER_DEFAULT_IDS),
    limit: normalizeInteger(input.limit ?? AVIATION_WEATHER_DEFAULT_LIMIT, '--limit', 1, AVIATION_WEATHER_MAX_LIMIT),
  }
}

function parseMetars(value: unknown): AviationWeatherMetar[] {
  if (!Array.isArray(value)) throw new RuntimeFailure('OPEN_API_FAILED', 'AviationWeather METAR response must be an array.')
  return value.filter(isRecord).map(entry => {
    if (typeof entry.icaoId !== 'string' || typeof entry.rawOb !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'AviationWeather METAR rows must include icaoId and rawOb.')
    }
    return {
      icaoId: entry.icaoId,
      receiptTime: optionalString(entry.receiptTime),
      reportTime: optionalString(entry.reportTime),
      obsTime: optionalNumber(entry.obsTime),
      temp: optionalNumber(entry.temp),
      dewp: optionalNumber(entry.dewp),
      wdir: optionalNumber(entry.wdir),
      wspd: optionalNumber(entry.wspd),
      visib: optionalString(entry.visib),
      altim: optionalNumber(entry.altim),
      rawOb: entry.rawOb,
      name: optionalString(entry.name),
      flightCategory: optionalString(entry.fltCat),
      latitude: optionalNumber(entry.lat),
      longitude: optionalNumber(entry.lon),
    }
  })
}

function parseTafs(value: unknown): AviationWeatherTaf[] {
  if (!Array.isArray(value)) throw new RuntimeFailure('OPEN_API_FAILED', 'AviationWeather TAF response must be an array.')
  return value.filter(isRecord).map(entry => {
    if (typeof entry.icaoId !== 'string' || typeof entry.rawTAF !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'AviationWeather TAF rows must include icaoId and rawTAF.')
    }
    return {
      icaoId: entry.icaoId,
      issueTime: optionalString(entry.issueTime),
      validTimeFrom: optionalNumber(entry.validTimeFrom),
      validTimeTo: optionalNumber(entry.validTimeTo),
      rawTAF: entry.rawTAF,
      name: optionalString(entry.name),
      forecastCount: Array.isArray(entry.fcsts) ? entry.fcsts.length : 0,
    }
  })
}

function normalizeIds(value: string): string {
  const ids = value.split(',').map(entry => entry.trim().toUpperCase()).filter(Boolean)
  if (ids.length === 0 || ids.length > 20 || ids.some(entry => !/^[A-Z0-9]{3,5}$/u.test(entry))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ids must be 1-20 comma-separated station ids such as KSFO,KJFK.')
  }
  return ids.join(',')
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function readCachePolicy(response: Response): AviationWeatherCachePolicy {
  return {
    cacheControl: response.headers.get('cache-control') ?? undefined,
    etag: response.headers.get('etag') ?? undefined,
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
