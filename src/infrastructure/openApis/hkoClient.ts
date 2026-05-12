import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HKO_DEFAULT_BASE_URL = 'https://data.weather.gov.hk'
export const HKO_DEFAULT_LANGUAGE = 'en'
export const HKO_SUPPORTED_LANGUAGES = ['en', 'tc', 'sc'] as const
export const HKO_CURRENT_DEFAULT_LIMIT = 100
export const HKO_CURRENT_MAX_LIMIT = 100
export const HKO_FORECAST_DEFAULT_LIMIT = 9
export const HKO_FORECAST_MAX_LIMIT = 9

export type HkoLanguage = typeof HKO_SUPPORTED_LANGUAGES[number]

export type HkoCurrentInput = {
  lang?: string | undefined
  station?: string | undefined
  limit?: number | undefined
}

export type NormalizedHkoCurrentInput = {
  lang: HkoLanguage
  limit: number
  station?: string | undefined
}

export type HkoForecastInput = {
  lang?: string | undefined
  limit?: number | undefined
}

export type NormalizedHkoForecastInput = {
  lang: HkoLanguage
  limit: number
}

export type HkoValueUnit = {
  value?: number | string | undefined
  unit?: string | undefined
}

export type HkoObservation = HkoValueUnit & {
  place: string
}

export type HkoRainfallObservation = {
  place: string
  unit?: string | undefined
  min?: number | string | undefined
  max?: number | string | undefined
  main?: boolean | undefined
}

export type HkoUvIndex = {
  recordTime?: string | undefined
  data: HkoObservation[]
}

export type HkoCurrentReport = {
  updateTime?: string | undefined
  icons: Array<number | string>
  iconUpdateTime?: string | undefined
  warningMessage?: string | undefined
  tcMessage?: string | undefined
  temperature: {
    recordTime?: string | undefined
    data: HkoObservation[]
  }
  humidity: {
    recordTime?: string | undefined
    data: HkoObservation[]
  }
  rainfall: {
    startTime?: string | undefined
    endTime?: string | undefined
    data: HkoRainfallObservation[]
  }
  uvIndex?: HkoUvIndex | undefined
}

export type HkoForecastEntry = {
  forecastDate: string
  week?: string | undefined
  forecastWind?: string | undefined
  forecastWeather?: string | undefined
  forecastMaxTemp?: HkoValueUnit | undefined
  forecastMinTemp?: HkoValueUnit | undefined
  forecastMaxRh?: HkoValueUnit | undefined
  forecastMinRh?: HkoValueUnit | undefined
  forecastIcon?: number | string | undefined
  psr?: string | undefined
}

export type HkoForecastReport = {
  generalSituation?: string | undefined
  updateTime?: string | undefined
  seaTemp?: HkoValueUnit | undefined
  soilTemp?: HkoValueUnit | undefined
  forecasts: HkoForecastEntry[]
}

export class HkoClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getCurrent(input: NormalizedHkoCurrentInput): Promise<HkoCurrentReport> {
    const parsed = await this.fetchWeatherJson('rhrread', input.lang)
    return parseCurrentReport(parsed)
  }

  async getForecast(input: NormalizedHkoForecastInput): Promise<HkoForecastReport> {
    const parsed = await this.fetchWeatherJson('fnd', input.lang)
    return parseForecastReport(parsed)
  }

  private async fetchWeatherJson(dataType: string, lang: HkoLanguage): Promise<unknown> {
    const url = new URL('/weatherAPI/opendata/weather.php', this.options.baseUrl ?? HKO_DEFAULT_BASE_URL)
    url.searchParams.set('dataType', dataType)
    url.searchParams.set('lang', lang)
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `HKO request failed: ${String(error)}`, {
        provider: 'hko',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `HKO returned a non-JSON response: ${String(error)}`, {
        provider: 'hko',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `HKO request failed with HTTP ${response.status}.`, {
        provider: 'hko',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeHkoCurrentInput(input: HkoCurrentInput = {}): NormalizedHkoCurrentInput {
  return {
    lang: normalizeLanguage(input.lang ?? HKO_DEFAULT_LANGUAGE),
    limit: normalizeInteger(input.limit ?? HKO_CURRENT_DEFAULT_LIMIT, '--limit', 1, HKO_CURRENT_MAX_LIMIT),
    ...(input.station !== undefined ? { station: normalizeText(input.station, '--station') } : {}),
  }
}

export function normalizeHkoForecastInput(input: HkoForecastInput = {}): NormalizedHkoForecastInput {
  return {
    lang: normalizeLanguage(input.lang ?? HKO_DEFAULT_LANGUAGE),
    limit: normalizeInteger(input.limit ?? HKO_FORECAST_DEFAULT_LIMIT, '--limit', 1, HKO_FORECAST_MAX_LIMIT),
  }
}

export function filterHkoObservationsByStation<TEntry extends { place: string }>(
  entries: TEntry[],
  station: string | undefined,
  limit: number,
): TEntry[] {
  const normalizedStation = station?.toLowerCase()
  const filtered = normalizedStation === undefined
    ? entries
    : entries.filter(entry => entry.place.toLowerCase().includes(normalizedStation))
  return filtered.slice(0, limit)
}

function parseCurrentReport(value: unknown): HkoCurrentReport {
  const record = requireRecord(value, 'HKO current weather response')
  const temperature = isRecord(record.temperature) ? record.temperature : {}
  const humidity = isRecord(record.humidity) ? record.humidity : {}
  const rainfall = isRecord(record.rainfall) ? record.rainfall : {}
  return {
    updateTime: readString(record.updateTime),
    icons: Array.isArray(record.icon) ? record.icon.filter(entry => typeof entry === 'number' || typeof entry === 'string') : [],
    iconUpdateTime: readString(record.iconUpdateTime),
    warningMessage: readString(record.warningMessage),
    tcMessage: readString(record.tcmessage),
    temperature: {
      recordTime: readString(temperature.recordTime),
      data: parseObservations(temperature.data),
    },
    humidity: {
      recordTime: readString(humidity.recordTime),
      data: parseObservations(humidity.data),
    },
    rainfall: {
      startTime: readString(rainfall.startTime),
      endTime: readString(rainfall.endTime),
      data: parseRainfallObservations(rainfall.data),
    },
    uvIndex: parseUvIndex(record.uvindex),
  }
}

function parseForecastReport(value: unknown): HkoForecastReport {
  const record = requireRecord(value, 'HKO 9-day forecast response')
  return {
    generalSituation: readString(record.generalSituation),
    updateTime: readString(record.updateTime),
    seaTemp: parseValueUnit(record.seaTemp),
    soilTemp: parseValueUnit(record.soilTemp),
    forecasts: Array.isArray(record.weatherForecast)
      ? record.weatherForecast.filter(isRecord).map(parseForecastEntry)
      : [],
  }
}

function parseForecastEntry(record: Record<string, unknown>): HkoForecastEntry {
  return {
    forecastDate: readString(record.forecastDate) ?? '',
    week: readString(record.week),
    forecastWind: readString(record.forecastWind),
    forecastWeather: readString(record.forecastWeather),
    forecastMaxTemp: parseValueUnit(record.forecastMaxtemp),
    forecastMinTemp: parseValueUnit(record.forecastMintemp),
    forecastMaxRh: parseValueUnit(record.forecastMaxrh),
    forecastMinRh: parseValueUnit(record.forecastMinrh),
    forecastIcon: readNumberOrString(record.ForecastIcon),
    psr: readString(record.PSR),
  }
}

function parseObservations(value: unknown): HkoObservation[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).flatMap(record => {
    const place = readString(record.place)
    if (place === undefined) {
      return []
    }
    return [{
      place,
      value: readNumberOrString(record.value),
      unit: readString(record.unit),
    }]
  })
}

function parseRainfallObservations(value: unknown): HkoRainfallObservation[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).flatMap(record => {
    const place = readString(record.place)
    if (place === undefined) {
      return []
    }
    return [{
      place,
      unit: readString(record.unit),
      min: readNumberOrString(record.min),
      max: readNumberOrString(record.max),
      main: readBooleanLike(record.main),
    }]
  })
}

function parseUvIndex(value: unknown): HkoUvIndex | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    recordTime: readString(value.recordTime),
    data: parseObservations(value.data),
  }
}

function parseValueUnit(value: unknown): HkoValueUnit | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const parsed: HkoValueUnit = {
    value: readNumberOrString(value.value),
    unit: readString(value.unit),
  }
  return parsed.value === undefined && parsed.unit === undefined ? undefined : parsed
}

function normalizeLanguage(value: string): HkoLanguage {
  const normalized = value.trim().toLowerCase()
  if (HKO_SUPPORTED_LANGUAGES.includes(normalized as HkoLanguage)) {
    return normalized as HkoLanguage
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported HKO language: ${value}`, {
    supported: [...HKO_SUPPORTED_LANGUAGES],
  })
}

function normalizeText(value: string, optionName: string): string {
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must not be empty.`)
  }
  if (normalized.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be 120 characters or fewer.`)
  }
  return normalized
}

function normalizeInteger(value: number, optionName: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be an integer between ${min} and ${max}.`, {
      min,
      max,
      value,
    })
  }
  return value
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} must be a JSON object.`, { provider: 'hko' })
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumberOrString(value: unknown): number | string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }
  return undefined
}

function readBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readString(value.message) ?? readString(value.error)
}
