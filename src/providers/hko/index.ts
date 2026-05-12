import { z } from 'zod'
import { getHkoCurrent, getHkoForecast, type HkoCurrentResult, type HkoForecastResult } from '../../application/usecases/hko.js'
import {
  HKO_CURRENT_DEFAULT_LIMIT,
  HKO_CURRENT_MAX_LIMIT,
  HKO_DEFAULT_LANGUAGE,
  HKO_FORECAST_DEFAULT_LIMIT,
  HKO_FORECAST_MAX_LIMIT,
  normalizeHkoCurrentInput,
  normalizeHkoForecastInput,
  type HkoCurrentInput,
  type HkoForecastInput,
} from '../../infrastructure/openApis/hkoClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const currentParamsSchema = z.object({
  lang: z.string().min(1).optional(),
  station: z.string().min(1).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<HkoCurrentInput>

const forecastParamsSchema = z.object({
  lang: z.string().min(1).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<HkoForecastInput>

const currentOperation: PublicApiOperationDefinition<HkoCurrentInput> = {
  id: 'hko.current',
  providerId: 'hko',
  name: 'Current Weather',
  commandPath: ['hko', 'current'],
  rpcMethod: 'hko.current',
  description: 'Read Hong Kong Observatory local weather report observations.',
  category: 'weather',
  options: [
    {
      name: 'lang',
      flag: '--lang <en|tc|sc>',
      description: `Response language, default ${HKO_DEFAULT_LANGUAGE}`,
      exposure: 'primary',
      group: 'presentation',
      reason: 'HKO documents English, Traditional Chinese, and Simplified Chinese responses for the same feed.',
      defaultValue: HKO_DEFAULT_LANGUAGE,
    },
    {
      name: 'station',
      flag: '--station <text>',
      description: 'Filter observation places/districts by text',
      exposure: 'primary',
      group: 'filters',
      reason: 'The current feed returns finite place and district arrays; text filtering keeps the TUI focused without extra API calls.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Observation rows to show per collection, default ${HKO_CURRENT_DEFAULT_LIMIT}, cap ${HKO_CURRENT_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The feed has no documented page size; default/cap 100 preserves the full observed snapshot while bounding terminal output.',
      valueType: 'integer',
      defaultValue: String(HKO_CURRENT_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: currentParamsSchema,
  execute: params => getHkoCurrent(params),
  normalizeParams: params => currentParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHkoCurrentInput(params),
  resultKind: 'hko.current',
  defaultFormat: 'text',
}

const forecastOperation: PublicApiOperationDefinition<HkoForecastInput> = {
  id: 'hko.forecast',
  providerId: 'hko',
  name: '9-Day Forecast',
  commandPath: ['hko', 'forecast'],
  rpcMethod: 'hko.forecast',
  description: 'Read Hong Kong Observatory 9-day weather forecast.',
  category: 'weather',
  options: [
    {
      name: 'lang',
      flag: '--lang <en|tc|sc>',
      description: `Response language, default ${HKO_DEFAULT_LANGUAGE}`,
      exposure: 'primary',
      group: 'presentation',
      reason: 'HKO documents English, Traditional Chinese, and Simplified Chinese responses for the same feed.',
      defaultValue: HKO_DEFAULT_LANGUAGE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Forecast days to show, default/cap ${HKO_FORECAST_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The documented feed is a 9-day forecast; defaulting to 9 returns the full feed in one request.',
      valueType: 'integer',
      defaultValue: String(HKO_FORECAST_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: forecastParamsSchema,
  execute: params => getHkoForecast(params),
  normalizeParams: params => forecastParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHkoForecastInput(params),
  resultKind: 'hko.forecast',
  defaultFormat: 'text',
}

export const hkoProvider: PublicApiProviderModule = {
  manifest: {
    id: 'hko',
    name: 'Hong Kong Observatory',
    description: 'Hong Kong Observatory open data weather observations and 9-day forecasts.',
    publicApisCategory: 'Weather',
    homepageUrl: 'https://www.hko.gov.hk/en/abouthko/opendata_intro.htm',
    docsUrl: 'https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf',
    auth: { mode: 'none', notes: ['Weather API open data feeds require no API key, OAuth, cookies, account setup, or browser session.'] },
    tags: ['weather', 'hong-kong', 'government', 'forecast', 'observations', 'no-auth'],
    freePlanNotes: [
      'No request quota is documented for these public weather feeds; use --persist and --offline to avoid repeated live fetches.',
      `Current observations default/cap ${HKO_CURRENT_MAX_LIMIT} keeps the full finite observed snapshot available in one command.`,
      `Forecast default/cap ${HKO_FORECAST_MAX_LIMIT} matches the documented 9-day forecast feed.`,
    ],
  },
  operations: [currentOperation, forecastOperation],
  endpoints: [
    {
      id: 'hko-current-weather-report',
      method: 'GET',
      urlPattern: 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread*',
      category: 'public-api:weather',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-05',
      sampleSources: [
        'https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf',
        'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en',
      ],
      consumedBy: ['hko.current'],
      description: 'HKO local weather report feed with temperature, rainfall, humidity, icon, and warning metadata.',
      notes: ['No API key/OAuth required.', 'Live probe returned HTTP 200 JSON with CORS * from server HKO.'],
    },
    {
      id: 'hko-nine-day-weather-forecast',
      method: 'GET',
      urlPattern: 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd*',
      category: 'public-api:weather',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-05',
      sampleSources: [
        'https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf',
        'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=en',
      ],
      consumedBy: ['hko.forecast'],
      description: 'HKO 9-day weather forecast feed.',
      notes: ['No API key/OAuth required.', 'Live probe returned HTTP 200 JSON with 9 forecast entries.'],
    },
  ],
}

export type { HkoCurrentResult, HkoForecastResult }
