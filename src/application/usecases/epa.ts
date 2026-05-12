import {
  EPA_MAX_HOURLY_LIMIT,
  EpaClient,
  normalizeEpaUvDailyInput,
  normalizeEpaUvHourlyInput,
  type EpaUvDailyForecast,
  type EpaUvDailyInput,
  type EpaUvHourlyForecast,
  type EpaUvHourlyInput,
} from '../../infrastructure/openApis/epaClient.js'

type EpaApiMeta = {
  provider: 'epa'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  service: 'EPA DMAP-EF RESTful Data Service'
  limitPolicy: string
}

export type EpaUvHourlyResult = {
  kind: 'epa.uvHourly'
  api: EpaApiMeta
  query: ReturnType<typeof normalizeEpaUvHourlyInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  forecasts: EpaUvHourlyForecast[]
}

export type EpaUvDailyResult = {
  kind: 'epa.uvDaily'
  api: EpaApiMeta
  query: ReturnType<typeof normalizeEpaUvDailyInput>
  count: number
  forecasts: EpaUvDailyForecast[]
}

const commonApiMeta = {
  provider: 'epa',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://www.epa.gov/enviro/web-services',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  service: 'EPA DMAP-EF RESTful Data Service',
} satisfies Omit<EpaApiMeta, 'endpoint' | 'limitPolicy'>

const hourlyApiMeta = {
  ...commonApiMeta,
  limitPolicy: 'EPA UV hourly ZIP responses currently return 21 hourly rows; CLI defaults/caps at 21 to use the complete documented forecast response in one call.',
} satisfies Omit<EpaApiMeta, 'endpoint'>

const dailyApiMeta = {
  ...commonApiMeta,
  limitPolicy: 'EPA UV daily ZIP responses return one daily forecast list for a single ZIP Code lookup.',
} satisfies Omit<EpaApiMeta, 'endpoint'>

export async function getEpaUvHourly(input: EpaUvHourlyInput = {}): Promise<EpaUvHourlyResult> {
  const query = normalizeEpaUvHourlyInput(input)
  const client = new EpaClient()
  const forecasts = await client.getUvHourly(query)
  return {
    kind: 'epa.uvHourly',
    api: {
      ...hourlyApiMeta,
      endpoint: 'GET /dmapservice/getEnvirofactsUVHOURLY/ZIP/{zip}/JSON',
    },
    query,
    count: forecasts.length,
    pagination: {
      returned: forecasts.length,
      limit: query.limit,
      maxLimit: EPA_MAX_HOURLY_LIMIT,
    },
    forecasts,
  }
}

export async function getEpaUvDaily(input: EpaUvDailyInput = {}): Promise<EpaUvDailyResult> {
  const query = normalizeEpaUvDailyInput(input)
  const client = new EpaClient()
  const forecasts = await client.getUvDaily(query)
  return {
    kind: 'epa.uvDaily',
    api: {
      ...dailyApiMeta,
      endpoint: 'GET /dmapservice/getEnvirofactsUVDAILY/ZIP/{zip}/JSON',
    },
    query,
    count: forecasts.length,
    forecasts,
  }
}
