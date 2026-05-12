import {
  AVIATION_WEATHER_MAX_LIMIT,
  AviationWeatherClient,
  normalizeAviationWeatherMetarInput,
  normalizeAviationWeatherTafInput,
  type AviationWeatherCachePolicy,
  type AviationWeatherMetar,
  type AviationWeatherReportInput,
  type AviationWeatherTaf,
  type AviationWeatherTafInput,
} from '../../infrastructure/openApis/aviationWeatherClient.js'

const docsUrl = 'https://aviationweather.gov/data/api/'

type AviationWeatherApiMeta = {
  provider: 'aviationweather'
  endpoint: string
  authentication: 'none'
  usesBrowserClickstream: false
  docsUrl: string
  limitPolicy: string
}

export type AviationWeatherMetarResult = {
  kind: 'aviationweather.metar'
  api: AviationWeatherApiMeta
  query: ReturnType<typeof normalizeAviationWeatherMetarInput>
  reports: AviationWeatherMetar[]
  count: number
  cachePolicy: AviationWeatherCachePolicy
}

export type AviationWeatherTafResult = {
  kind: 'aviationweather.taf'
  api: AviationWeatherApiMeta
  query: ReturnType<typeof normalizeAviationWeatherTafInput>
  reports: AviationWeatherTaf[]
  count: number
  cachePolicy: AviationWeatherCachePolicy
}

export async function getAviationWeatherMetar(input: AviationWeatherReportInput = {}): Promise<AviationWeatherMetarResult> {
  const query = normalizeAviationWeatherMetarInput(input)
  const response = await new AviationWeatherClient().metar(query)
  return {
    kind: 'aviationweather.metar',
    api: createApiMeta('GET https://aviationweather.gov/api/data/metar?ids={ids}&format=json'),
    query,
    reports: response.reports,
    count: response.reports.length,
    cachePolicy: response.cachePolicy,
  }
}

export async function getAviationWeatherTaf(input: AviationWeatherTafInput = {}): Promise<AviationWeatherTafResult> {
  const query = normalizeAviationWeatherTafInput(input)
  const response = await new AviationWeatherClient().taf(query)
  return {
    kind: 'aviationweather.taf',
    api: createApiMeta('GET https://aviationweather.gov/api/data/taf?ids={ids}&format=json'),
    query,
    reports: response.reports,
    count: response.reports.length,
    cachePolicy: response.cachePolicy,
  }
}

function createApiMeta(endpoint: string): AviationWeatherApiMeta {
  return {
    provider: 'aviationweather',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docsUrl,
    limitPolicy: `Data API returns station arrays; CLI caps terminal output at ${AVIATION_WEATHER_MAX_LIMIT}.`,
  }
}

export type { AviationWeatherReportInput, AviationWeatherTafInput }
