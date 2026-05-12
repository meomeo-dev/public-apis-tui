import {
  normalizeOpenMeteoForecastInput,
  normalizeOpenMeteoGeocodingInput,
  OpenMeteoClient,
  OPEN_METEO_MAX_COUNT,
  OPEN_METEO_MAX_FORECAST_DAYS,
  type OpenMeteoForecast,
  type OpenMeteoForecastInput,
  type OpenMeteoGeocodingInput,
  type OpenMeteoLocation,
} from '../../infrastructure/openApis/openMeteoClient.js'

export type OpenMeteoForecastResult = {
  kind: 'openmeteo.forecast'
  api: OpenMeteoApiMeta
  query: ReturnType<typeof normalizeOpenMeteoForecastInput>
  location: {
    latitude: number
    longitude: number
    elevation?: number | undefined
    timezone?: string | undefined
    timezoneAbbreviation?: string | undefined
    utcOffsetSeconds?: number | undefined
  }
  current: Record<string, unknown>
  currentUnits: Record<string, string>
  daily: Record<string, unknown[]>
  dailyUnits: Record<string, string>
  pagination: {
    forecastDays: number
    maxForecastDays: number
    dailyRows: number
  }
}

export type OpenMeteoGeocodingResult = {
  kind: 'openmeteo.geocoding'
  api: OpenMeteoApiMeta
  query: ReturnType<typeof normalizeOpenMeteoGeocodingInput>
  pagination: {
    returned: number
    count: number
    maxCount: number
  }
  locations: OpenMeteoLocation[]
}

type OpenMeteoApiMeta = {
  provider: 'openmeteo'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  licence: string
}

const commonApiMeta = {
  provider: 'openmeteo',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  licence: 'Open-Meteo free non-commercial usage; commercial/customer APIs use separate server/API key.',
} satisfies Omit<OpenMeteoApiMeta, 'endpoint' | 'docsUrl'>

export async function getOpenMeteoForecast(input: OpenMeteoForecastInput = {}): Promise<OpenMeteoForecastResult> {
  const query = normalizeOpenMeteoForecastInput(input)
  const client = new OpenMeteoClient()
  const forecast = await client.getForecast(query)
  return projectForecast(query, forecast)
}

export async function searchOpenMeteoLocations(input: OpenMeteoGeocodingInput = {}): Promise<OpenMeteoGeocodingResult> {
  const query = normalizeOpenMeteoGeocodingInput(input)
  const client = new OpenMeteoClient()
  const locations = await client.searchLocations(query)
  return {
    kind: 'openmeteo.geocoding',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /v1/search',
      docsUrl: 'https://open-meteo.com/en/docs/geocoding-api',
    },
    query,
    pagination: {
      returned: locations.length,
      count: query.count,
      maxCount: OPEN_METEO_MAX_COUNT,
    },
    locations,
  }
}

function projectForecast(query: ReturnType<typeof normalizeOpenMeteoForecastInput>, forecast: OpenMeteoForecast): OpenMeteoForecastResult {
  return {
    kind: 'openmeteo.forecast',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /v1/forecast',
      docsUrl: 'https://open-meteo.com/en/docs',
    },
    query,
    location: {
      latitude: forecast.latitude,
      longitude: forecast.longitude,
      ...(forecast.elevation !== undefined ? { elevation: forecast.elevation } : {}),
      ...(forecast.timezone !== undefined ? { timezone: forecast.timezone } : {}),
      ...(forecast.timezoneAbbreviation !== undefined ? { timezoneAbbreviation: forecast.timezoneAbbreviation } : {}),
      ...(forecast.utcOffsetSeconds !== undefined ? { utcOffsetSeconds: forecast.utcOffsetSeconds } : {}),
    },
    current: forecast.current,
    currentUnits: forecast.currentUnits,
    daily: forecast.daily,
    dailyUnits: forecast.dailyUnits,
    pagination: {
      forecastDays: query.forecastDays,
      maxForecastDays: OPEN_METEO_MAX_FORECAST_DAYS,
      dailyRows: Array.isArray(forecast.daily.time) ? forecast.daily.time.length : 0,
    },
  }
}
