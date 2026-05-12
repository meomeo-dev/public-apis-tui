import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const US_WEATHER_DEFAULT_BASE_URL = 'https://api.weather.gov'
export const US_WEATHER_DEFAULT_LATITUDE = 38.8894
export const US_WEATHER_DEFAULT_LONGITUDE = -77.0352
export const US_WEATHER_DEFAULT_OFFICE = 'LWX'
export const US_WEATHER_DEFAULT_GRID_X = 97
export const US_WEATHER_DEFAULT_GRID_Y = 71
export const US_WEATHER_DEFAULT_LIMIT = 14
export const US_WEATHER_MAX_LIMIT = 14
export const US_WEATHER_USER_AGENT = 'public-apis-tui/0.5.0 (https://github.com/meomeo-dev/public-apis-tui)'

export type UsWeatherPointsInput = {
  latitude?: number | undefined
  longitude?: number | undefined
}

export type NormalizedUsWeatherPointsInput = {
  latitude: number
  longitude: number
}

export type UsWeatherForecastInput = {
  office?: string | undefined
  gridX?: number | undefined
  gridY?: number | undefined
  limit?: number | undefined
}

export type NormalizedUsWeatherForecastInput = {
  office: string
  gridX: number
  gridY: number
  limit: number
}

export type UsWeatherRelativeLocation = {
  city?: string | undefined
  state?: string | undefined
}

export type UsWeatherPoint = {
  id?: string | undefined
  office: string
  gridX: number
  gridY: number
  forecast?: string | undefined
  forecastHourly?: string | undefined
  forecastGridData?: string | undefined
  observationStations?: string | undefined
  timezone?: string | undefined
  radarStation?: string | undefined
  relativeLocation: UsWeatherRelativeLocation
}

export type UsWeatherForecastPeriod = {
  number: number
  name: string
  startTime?: string | undefined
  endTime?: string | undefined
  isDaytime?: boolean | undefined
  temperature?: number | undefined
  temperatureUnit?: string | undefined
  probabilityOfPrecipitation?: number | undefined
  windSpeed?: string | undefined
  windDirection?: string | undefined
  icon?: string | undefined
  shortForecast?: string | undefined
  detailedForecast?: string | undefined
}

export type UsWeatherForecast = {
  updated?: string | undefined
  units?: string | undefined
  generatedAt?: string | undefined
  periods: UsWeatherForecastPeriod[]
}

export class UsWeatherClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getPoint(input: NormalizedUsWeatherPointsInput): Promise<UsWeatherPoint> {
    const url = new URL(`/points/${input.latitude},${input.longitude}`, this.options.baseUrl ?? US_WEATHER_DEFAULT_BASE_URL)
    const parsed = await this.fetchJson(url)
    return parsePoint(parsed)
  }

  async getForecast(input: NormalizedUsWeatherForecastInput): Promise<UsWeatherForecast> {
    const url = new URL(`/gridpoints/${encodeURIComponent(input.office)}/${input.gridX},${input.gridY}/forecast`, this.options.baseUrl ?? US_WEATHER_DEFAULT_BASE_URL)
    const parsed = await this.fetchJson(url)
    const forecast = parseForecast(parsed)
    return { ...forecast, periods: forecast.periods.slice(0, input.limit) }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/geo+json',
          'user-agent': US_WEATHER_USER_AGENT,
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `US Weather request failed: ${String(error)}`, {
        provider: 'usweather',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `US Weather returned a non-JSON response: ${String(error)}`, {
        provider: 'usweather',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorTitle(parsed) ?? `US Weather request failed with HTTP ${response.status}.`, {
        provider: 'usweather',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeUsWeatherPointsInput(input: UsWeatherPointsInput = {}): NormalizedUsWeatherPointsInput {
  return {
    latitude: normalizeLatitude(input.latitude ?? US_WEATHER_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(input.longitude ?? US_WEATHER_DEFAULT_LONGITUDE),
  }
}

export function normalizeUsWeatherForecastInput(input: UsWeatherForecastInput = {}): NormalizedUsWeatherForecastInput {
  return {
    office: normalizeOffice(input.office ?? US_WEATHER_DEFAULT_OFFICE),
    gridX: normalizeGrid(input.gridX ?? US_WEATHER_DEFAULT_GRID_X, '--grid-x'),
    gridY: normalizeGrid(input.gridY ?? US_WEATHER_DEFAULT_GRID_Y, '--grid-y'),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeLatitude(value: number): number {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--latitude must be a number from -90 to 90.')
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--longitude must be a number from -180 to 180.')
  }
  return value
}

function normalizeOffice(value: string): string {
  const office = value.trim().toUpperCase()
  if (!/^[A-Z0-9]{3,4}$/u.test(office)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--office must be a 3-4 character NWS office/grid id such as LWX.')
  }
  return office
}

function normalizeGrid(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a non-negative integer.`)
  }
  return value
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? US_WEATHER_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > US_WEATHER_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${US_WEATHER_MAX_LIMIT}.`)
  }
  return limit
}

function parsePoint(value: unknown): UsWeatherPoint {
  const properties = readProperties(value, 'US Weather point')
  if (typeof properties.gridId !== 'string' || typeof properties.gridX !== 'number' || typeof properties.gridY !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'US Weather point response had an unexpected schema.')
  }
  const relativeLocationProperties = isRecord(properties.relativeLocation) && isRecord(properties.relativeLocation.properties) ? properties.relativeLocation.properties : {}
  return {
    id: isRecord(value) ? optionalString(value.id) : undefined,
    office: properties.gridId,
    gridX: properties.gridX,
    gridY: properties.gridY,
    forecast: optionalString(properties.forecast),
    forecastHourly: optionalString(properties.forecastHourly),
    forecastGridData: optionalString(properties.forecastGridData),
    observationStations: optionalString(properties.observationStations),
    timezone: optionalString(properties.timeZone),
    radarStation: optionalString(properties.radarStation),
    relativeLocation: {
      city: optionalString(relativeLocationProperties.city),
      state: optionalString(relativeLocationProperties.state),
    },
  }
}

function parseForecast(value: unknown): UsWeatherForecast {
  const properties = readProperties(value, 'US Weather forecast')
  if (!Array.isArray(properties.periods)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'US Weather forecast periods must be an array.')
  }
  return {
    updated: optionalString(properties.updated),
    units: optionalString(properties.units),
    generatedAt: optionalString(properties.generatedAt),
    periods: properties.periods.map(parseForecastPeriod),
  }
}

function parseForecastPeriod(value: unknown): UsWeatherForecastPeriod {
  if (!isRecord(value) || typeof value.number !== 'number' || typeof value.name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'US Weather forecast period had an unexpected schema.')
  }
  const precipitation = isRecord(value.probabilityOfPrecipitation) ? value.probabilityOfPrecipitation : {}
  return {
    number: value.number,
    name: value.name,
    startTime: optionalString(value.startTime),
    endTime: optionalString(value.endTime),
    isDaytime: typeof value.isDaytime === 'boolean' ? value.isDaytime : undefined,
    temperature: optionalNumber(value.temperature),
    temperatureUnit: optionalString(value.temperatureUnit),
    probabilityOfPrecipitation: optionalNumber(precipitation.value),
    windSpeed: optionalString(value.windSpeed),
    windDirection: optionalString(value.windDirection),
    icon: optionalString(value.icon),
    shortForecast: optionalString(value.shortForecast),
    detailedForecast: optionalString(value.detailedForecast),
  }
}

function readProperties(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.properties)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} response had an unexpected schema.`)
  }
  return value.properties
}

function readErrorTitle(value: unknown): string | undefined {
  return isRecord(value) && typeof value.title === 'string' ? value.title : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
