import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_METEO_FORECAST_BASE_URL = 'https://api.open-meteo.com'
export const OPEN_METEO_GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com'
export const OPEN_METEO_DEFAULT_LATITUDE = 52.52
export const OPEN_METEO_DEFAULT_LONGITUDE = 13.41
export const OPEN_METEO_DEFAULT_FORECAST_DAYS = 16
export const OPEN_METEO_MAX_FORECAST_DAYS = 16
export const OPEN_METEO_DEFAULT_LOCATION = 'Berlin'
export const OPEN_METEO_DEFAULT_COUNT = 100
export const OPEN_METEO_MAX_COUNT = 100
export const OPEN_METEO_DEFAULT_LANGUAGE = 'en'

const CURRENT_VARIABLES = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m'
const DAILY_VARIABLES = 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max'

export type OpenMeteoForecastInput = {
  latitude?: number | undefined
  longitude?: number | undefined
  forecastDays?: number | undefined
  timezone?: string | undefined
}

export type NormalizedOpenMeteoForecastInput = {
  latitude: number
  longitude: number
  forecastDays: number
  timezone: string
}

export type OpenMeteoGeocodingInput = {
  name?: string | undefined
  count?: number | undefined
  language?: string | undefined
  countryCode?: string | undefined
}

export type NormalizedOpenMeteoGeocodingInput = {
  name: string
  count: number
  language: string
  countryCode?: string | undefined
}

export type OpenMeteoForecast = {
  latitude: number
  longitude: number
  timezone?: string | undefined
  timezoneAbbreviation?: string | undefined
  utcOffsetSeconds?: number | undefined
  elevation?: number | undefined
  current: Record<string, unknown>
  currentUnits: Record<string, string>
  daily: Record<string, unknown[]>
  dailyUnits: Record<string, string>
}

export type OpenMeteoLocation = {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number | undefined
  featureCode?: string | undefined
  countryCode?: string | undefined
  timezone?: string | undefined
  population?: number | undefined
  country?: string | undefined
  admin1?: string | undefined
  admin2?: string | undefined
  admin3?: string | undefined
  admin4?: string | undefined
  postcodes: string[]
}

export class OpenMeteoClient {
  constructor(private readonly options: { forecastBaseUrl?: string | undefined; geocodingBaseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getForecast(input: NormalizedOpenMeteoForecastInput): Promise<OpenMeteoForecast> {
    const url = new URL('/v1/forecast', this.options.forecastBaseUrl ?? OPEN_METEO_FORECAST_BASE_URL)
    url.searchParams.set('latitude', String(input.latitude))
    url.searchParams.set('longitude', String(input.longitude))
    url.searchParams.set('current', CURRENT_VARIABLES)
    url.searchParams.set('daily', DAILY_VARIABLES)
    url.searchParams.set('forecast_days', String(input.forecastDays))
    url.searchParams.set('timezone', input.timezone)
    const parsed = await this.fetchJson(url)
    return parseForecast(parsed)
  }

  async searchLocations(input: NormalizedOpenMeteoGeocodingInput): Promise<OpenMeteoLocation[]> {
    const url = new URL('/v1/search', this.options.geocodingBaseUrl ?? OPEN_METEO_GEOCODING_BASE_URL)
    url.searchParams.set('name', input.name)
    url.searchParams.set('count', String(input.count))
    url.searchParams.set('language', input.language)
    url.searchParams.set('format', 'json')
    if (input.countryCode !== undefined) {
      url.searchParams.set('countryCode', input.countryCode)
    }
    const parsed = await this.fetchJson(url)
    return parseGeocodingResults(parsed).slice(0, input.count)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open-Meteo request failed: ${String(error)}`, {
        provider: 'openmeteo',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open-Meteo returned a non-JSON response: ${String(error)}`, {
        provider: 'openmeteo',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok || isErrorResponse(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorReason(parsed) ?? `Open-Meteo request failed with HTTP ${response.status}.`, {
        provider: 'openmeteo',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeOpenMeteoForecastInput(input: OpenMeteoForecastInput = {}): NormalizedOpenMeteoForecastInput {
  return {
    latitude: normalizeLatitude(input.latitude ?? OPEN_METEO_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(input.longitude ?? OPEN_METEO_DEFAULT_LONGITUDE),
    forecastDays: normalizeForecastDays(input.forecastDays),
    timezone: normalizeText(input.timezone ?? 'auto', '--timezone'),
  }
}

export function normalizeOpenMeteoGeocodingInput(input: OpenMeteoGeocodingInput = {}): NormalizedOpenMeteoGeocodingInput {
  return {
    name: normalizeText(input.name ?? OPEN_METEO_DEFAULT_LOCATION, '--name'),
    count: normalizeCount(input.count),
    language: normalizeText(input.language ?? OPEN_METEO_DEFAULT_LANGUAGE, '--language').toLowerCase(),
    ...(input.countryCode !== undefined ? { countryCode: normalizeCountryCode(input.countryCode) } : {}),
  }
}

function normalizeLatitude(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -90 || value > 90) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--latitude must be a number from -90 to 90.')
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -180 || value > 180) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--longitude must be a number from -180 to 180.')
  }
  return value
}

function normalizeForecastDays(value: number | undefined): number {
  const days = value ?? OPEN_METEO_DEFAULT_FORECAST_DAYS
  if (!Number.isInteger(days) || days < 1 || days > OPEN_METEO_MAX_FORECAST_DAYS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--forecast-days must be an integer from 1 to ${OPEN_METEO_MAX_FORECAST_DAYS}.`)
  }
  return days
}

function normalizeCount(value: number | undefined): number {
  const count = value ?? OPEN_METEO_DEFAULT_COUNT
  if (!Number.isInteger(count) || count < 1 || count > OPEN_METEO_MAX_COUNT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--count must be an integer from 1 to ${OPEN_METEO_MAX_COUNT}.`)
  }
  return count
}

function normalizeCountryCode(value: string): string {
  const countryCode = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(countryCode)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--country-code must be an ISO-3166 alpha-2 code such as DE or US.')
  }
  return countryCode
}

function normalizeText(value: string, label: string): string {
  const text = value.trim()
  if (text.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return text
}

function parseForecast(value: unknown): OpenMeteoForecast {
  if (!isRecord(value) || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open-Meteo forecast response had an unexpected schema.')
  }
  return {
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: optionalString(value.timezone),
    timezoneAbbreviation: optionalString(value.timezone_abbreviation),
    utcOffsetSeconds: optionalNumber(value.utc_offset_seconds),
    elevation: optionalNumber(value.elevation),
    current: isRecord(value.current) ? value.current : {},
    currentUnits: parseStringMap(value.current_units),
    daily: parseArrayMap(value.daily),
    dailyUnits: parseStringMap(value.daily_units),
  }
}

function parseGeocodingResults(value: unknown): OpenMeteoLocation[] {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open-Meteo geocoding response had an unexpected schema.')
  }
  if (value.results === undefined) {
    return []
  }
  if (!Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open-Meteo geocoding results must be an array.')
  }
  return value.results.map(parseLocation)
}

function parseLocation(value: unknown): OpenMeteoLocation {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.name !== 'string' || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open-Meteo geocoding location had an unexpected schema.')
  }
  return {
    id: value.id,
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    elevation: optionalNumber(value.elevation),
    featureCode: optionalString(value.feature_code),
    countryCode: optionalString(value.country_code),
    timezone: optionalString(value.timezone),
    population: optionalNumber(value.population),
    country: optionalString(value.country),
    admin1: optionalString(value.admin1),
    admin2: optionalString(value.admin2),
    admin3: optionalString(value.admin3),
    admin4: optionalString(value.admin4),
    postcodes: Array.isArray(value.postcodes) ? value.postcodes.filter((entry): entry is string => typeof entry === 'string') : [],
  }
}

function parseStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  const output: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') output[key] = entry
  }
  return output
}

function parseArrayMap(value: unknown): Record<string, unknown[]> {
  if (!isRecord(value)) return {}
  const output: Record<string, unknown[]> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) output[key] = entry
  }
  return output
}

function isErrorResponse(value: unknown): boolean {
  return isRecord(value) && value.error === true
}

function readErrorReason(value: unknown): string | undefined {
  return isRecord(value) && typeof value.reason === 'string' ? value.reason : undefined
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
