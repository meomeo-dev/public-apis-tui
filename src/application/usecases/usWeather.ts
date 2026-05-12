import {
  normalizeUsWeatherForecastInput,
  normalizeUsWeatherPointsInput,
  UsWeatherClient,
  US_WEATHER_MAX_LIMIT,
  US_WEATHER_USER_AGENT,
  type UsWeatherForecastInput,
  type UsWeatherForecastPeriod,
  type UsWeatherPointsInput,
} from '../../infrastructure/openApis/usWeatherClient.js'

export type UsWeatherPointResult = {
  kind: 'usweather.point'
  api: UsWeatherApiMeta
  query: ReturnType<typeof normalizeUsWeatherPointsInput>
  point: {
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
    relativeLocation: Record<string, unknown>
  }
}

export type UsWeatherForecastResult = {
  kind: 'usweather.forecast'
  api: UsWeatherApiMeta
  query: ReturnType<typeof normalizeUsWeatherForecastInput>
  forecast: {
    updated?: string | undefined
    generatedAt?: string | undefined
    units?: string | undefined
    periods: UsWeatherForecastPeriod[]
  }
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

type UsWeatherApiMeta = {
  provider: 'usweather'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS GeoJSON/JSON REST'
  userAgent: string
  rateLimit: string
}

const commonApiMeta = {
  provider: 'usweather',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://www.weather.gov/documentation/services-web-api',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS GeoJSON/JSON REST',
  userAgent: US_WEATHER_USER_AGENT,
  rateLimit: 'NWS requires a unique User-Agent; rate limits are generous but not publicly specified.',
} satisfies Omit<UsWeatherApiMeta, 'endpoint'>

export async function getUsWeatherPoint(input: UsWeatherPointsInput = {}): Promise<UsWeatherPointResult> {
  const query = normalizeUsWeatherPointsInput(input)
  const client = new UsWeatherClient()
  const point = await client.getPoint(query)
  return {
    kind: 'usweather.point',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /points/{latitude},{longitude}',
    },
    query,
    point: {
      id: point.id,
      office: point.office,
      gridX: point.gridX,
      gridY: point.gridY,
      forecast: point.forecast,
      forecastHourly: point.forecastHourly,
      forecastGridData: point.forecastGridData,
      observationStations: point.observationStations,
      timezone: point.timezone,
      radarStation: point.radarStation,
      relativeLocation: point.relativeLocation,
    },
  }
}

export async function getUsWeatherForecast(input: UsWeatherForecastInput = {}): Promise<UsWeatherForecastResult> {
  const query = normalizeUsWeatherForecastInput(input)
  const client = new UsWeatherClient()
  const forecast = await client.getForecast(query)
  return {
    kind: 'usweather.forecast',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /gridpoints/{office}/{gridX},{gridY}/forecast',
    },
    query,
    forecast,
    pagination: {
      returned: forecast.periods.length,
      limit: query.limit,
      maxLimit: US_WEATHER_MAX_LIMIT,
    },
  }
}
