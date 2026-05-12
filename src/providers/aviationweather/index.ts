import { z } from 'zod'
import { getAviationWeatherMetar, getAviationWeatherTaf, type AviationWeatherMetarResult, type AviationWeatherTafResult } from '../../application/usecases/aviationWeather.js'
import {
  AVIATION_WEATHER_DEFAULT_IDS,
  AVIATION_WEATHER_DEFAULT_LIMIT,
  AVIATION_WEATHER_MAX_LIMIT,
  normalizeAviationWeatherMetarInput,
  normalizeAviationWeatherTafInput,
  type AviationWeatherReportInput,
  type AviationWeatherTafInput,
} from '../../infrastructure/openApis/aviationWeatherClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const metarParamsSchema = z.object({
  ids: z.string().min(1).optional(),
  hours: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<AviationWeatherReportInput>

const tafParamsSchema = z.object({
  ids: z.string().min(1).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<AviationWeatherTafInput>

const metarOperation: PublicApiOperationDefinition<AviationWeatherReportInput> = {
  id: 'aviationweather.metar',
  providerId: 'aviationweather',
  name: 'METAR',
  commandPath: ['aviationweather', 'metar'],
  rpcMethod: 'aviationweather.metar',
  description: 'Read NOAA AviationWeather METAR observations as JSON.',
  category: 'weather',
  options: [
    { name: 'ids', flag: '--ids <ICAO[,ICAO]>', description: `Station ids, default ${AVIATION_WEATHER_DEFAULT_IDS}`, exposure: 'primary', group: 'query', reason: 'Station ids are the main documented METAR lookup key.', defaultValue: AVIATION_WEATHER_DEFAULT_IDS },
    { name: 'hours', flag: '--hours <count>', description: 'Optional observation lookback hours, 1-48', exposure: 'advanced', group: 'filters', reason: 'Lookback is useful for analysis but latest observation is the common first-run view.', valueType: 'integer' },
    { name: 'limit', flag: '--limit <count>', description: `Reports to show, default ${AVIATION_WEATHER_DEFAULT_LIMIT}, cap ${AVIATION_WEATHER_MAX_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output for multi-station/history requests.', valueType: 'integer', defaultValue: String(AVIATION_WEATHER_DEFAULT_LIMIT) },
  ],
  paramsSchema: metarParamsSchema,
  execute: params => getAviationWeatherMetar(params),
  normalizeParams: params => metarParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeAviationWeatherMetarInput(params),
  resultKind: 'aviationweather.metar',
  defaultFormat: 'text',
}

const tafOperation: PublicApiOperationDefinition<AviationWeatherTafInput> = {
  id: 'aviationweather.taf',
  providerId: 'aviationweather',
  name: 'TAF',
  commandPath: ['aviationweather', 'taf'],
  rpcMethod: 'aviationweather.taf',
  description: 'Read NOAA AviationWeather TAF forecasts as JSON.',
  category: 'weather',
  options: [
    { name: 'ids', flag: '--ids <ICAO[,ICAO]>', description: `Station ids, default ${AVIATION_WEATHER_DEFAULT_IDS}`, exposure: 'primary', group: 'query', reason: 'Station ids are the main documented TAF lookup key.', defaultValue: AVIATION_WEATHER_DEFAULT_IDS },
    { name: 'limit', flag: '--limit <count>', description: `Reports to show, default ${AVIATION_WEATHER_DEFAULT_LIMIT}, cap ${AVIATION_WEATHER_MAX_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Bounds terminal output for multi-station forecast requests.', valueType: 'integer', defaultValue: String(AVIATION_WEATHER_DEFAULT_LIMIT) },
  ],
  paramsSchema: tafParamsSchema,
  execute: params => getAviationWeatherTaf(params),
  normalizeParams: params => tafParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeAviationWeatherTafInput(params),
  resultKind: 'aviationweather.taf',
  defaultFormat: 'text',
}

export const aviationWeatherProvider: PublicApiProviderModule = {
  manifest: {
    id: 'aviationweather',
    name: 'AviationWeather',
    description: 'NOAA AviationWeather METAR observations and TAF forecasts via the public Data API.',
    publicApisCategory: 'Weather',
    homepageUrl: 'https://aviationweather.gov/',
    docsUrl: 'https://aviationweather.gov/data/api/',
    auth: { mode: 'none', notes: ['Selected Data API JSON endpoints require no API key, OAuth, cookies, account, or browser session.'] },
    tags: ['weather', 'aviation', 'noaa', 'metar', 'taf', 'no-auth'],
    freePlanNotes: ['Responses include HTTP cache-control headers; use --persist and --offline to avoid repeated live fetches.'],
  },
  operations: [metarOperation, tafOperation],
  endpoints: [
    { id: 'aviationweather-metar-json', method: 'GET', urlPattern: 'https://aviationweather.gov/api/data/metar', category: 'public-api:weather', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://aviationweather.gov/data/api/'], consumedBy: ['aviationweather.metar'], description: 'NOAA AviationWeather METAR Data API JSON endpoint.', notes: ['No API key/OAuth required.', 'Uses format=json.'] },
    { id: 'aviationweather-taf-json', method: 'GET', urlPattern: 'https://aviationweather.gov/api/data/taf', category: 'public-api:weather', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://aviationweather.gov/data/api/'], consumedBy: ['aviationweather.taf'], description: 'NOAA AviationWeather TAF Data API JSON endpoint.', notes: ['No API key/OAuth required.', 'Uses format=json.'] },
  ],
}

export type { AviationWeatherMetarResult, AviationWeatherTafResult }
