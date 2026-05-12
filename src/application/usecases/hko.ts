import {
  filterHkoObservationsByStation,
  HkoClient,
  HKO_CURRENT_MAX_LIMIT,
  HKO_FORECAST_MAX_LIMIT,
  normalizeHkoCurrentInput,
  normalizeHkoForecastInput,
  type HkoCurrentInput,
  type HkoForecastEntry,
  type HkoForecastInput,
  type HkoObservation,
  type HkoRainfallObservation,
  type HkoUvIndex,
  type HkoValueUnit,
} from '../../infrastructure/openApis/hkoClient.js'

export type HkoCurrentResult = {
  kind: 'hko.current'
  api: HkoApiMeta
  query: ReturnType<typeof normalizeHkoCurrentInput>
  current: {
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
  pagination: {
    limit: number
    maxLimit: number
    totalTemperatures: number
    returnedTemperatures: number
    totalRainfall: number
    returnedRainfall: number
  }
}

export type HkoForecastResult = {
  kind: 'hko.forecast'
  api: HkoApiMeta
  query: ReturnType<typeof normalizeHkoForecastInput>
  generalSituation?: string | undefined
  updateTime?: string | undefined
  seaTemp?: HkoValueUnit | undefined
  soilTemp?: HkoValueUnit | undefined
  forecasts: HkoForecastEntry[]
  pagination: {
    returned: number
    total: number
    limit: number
    maxLimit: number
  }
}

type HkoApiMeta = {
  provider: 'hko'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
}

const commonApiMeta = {
  provider: 'hko',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  rateLimit: 'No public API key or request quota is documented for these HKO open data weather feeds.',
} satisfies Omit<HkoApiMeta, 'endpoint'>

export async function getHkoCurrent(input: HkoCurrentInput = {}): Promise<HkoCurrentResult> {
  const query = normalizeHkoCurrentInput(input)
  const client = new HkoClient()
  const current = await client.getCurrent(query)
  const temperatures = filterHkoObservationsByStation(current.temperature.data, query.station, query.limit)
  const humidity = filterHkoObservationsByStation(current.humidity.data, query.station, query.limit)
  const rainfall = filterHkoObservationsByStation(current.rainfall.data, query.station, query.limit)
  return {
    kind: 'hko.current',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /weatherAPI/opendata/weather.php?dataType=rhrread&lang={lang}',
    },
    query,
    current: {
      updateTime: current.updateTime,
      icons: current.icons,
      iconUpdateTime: current.iconUpdateTime,
      warningMessage: current.warningMessage,
      tcMessage: current.tcMessage,
      temperature: {
        recordTime: current.temperature.recordTime,
        data: temperatures,
      },
      humidity: {
        recordTime: current.humidity.recordTime,
        data: humidity,
      },
      rainfall: {
        startTime: current.rainfall.startTime,
        endTime: current.rainfall.endTime,
        data: rainfall,
      },
      uvIndex: current.uvIndex,
    },
    pagination: {
      limit: query.limit,
      maxLimit: HKO_CURRENT_MAX_LIMIT,
      totalTemperatures: current.temperature.data.length,
      returnedTemperatures: temperatures.length,
      totalRainfall: current.rainfall.data.length,
      returnedRainfall: rainfall.length,
    },
  }
}

export async function getHkoForecast(input: HkoForecastInput = {}): Promise<HkoForecastResult> {
  const query = normalizeHkoForecastInput(input)
  const client = new HkoClient()
  const forecast = await client.getForecast(query)
  const forecasts = forecast.forecasts.slice(0, query.limit)
  return {
    kind: 'hko.forecast',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /weatherAPI/opendata/weather.php?dataType=fnd&lang={lang}',
    },
    query,
    generalSituation: forecast.generalSituation,
    updateTime: forecast.updateTime,
    seaTemp: forecast.seaTemp,
    soilTemp: forecast.soilTemp,
    forecasts,
    pagination: {
      returned: forecasts.length,
      total: forecast.forecasts.length,
      limit: query.limit,
      maxLimit: HKO_FORECAST_MAX_LIMIT,
    },
  }
}
