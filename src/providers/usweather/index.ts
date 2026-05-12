import { z } from 'zod'
import { getUsWeatherForecast, getUsWeatherPoint } from '../../application/usecases/usWeather.js'
import {
  normalizeUsWeatherForecastInput,
  normalizeUsWeatherPointsInput,
  US_WEATHER_DEFAULT_GRID_X,
  US_WEATHER_DEFAULT_GRID_Y,
  US_WEATHER_DEFAULT_LATITUDE,
  US_WEATHER_DEFAULT_LIMIT,
  US_WEATHER_DEFAULT_LONGITUDE,
  US_WEATHER_DEFAULT_OFFICE,
  US_WEATHER_MAX_LIMIT,
  type UsWeatherForecastInput,
  type UsWeatherPointsInput,
} from '../../infrastructure/openApis/usWeatherClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const pointParamsSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
}) satisfies z.ZodType<UsWeatherPointsInput>

const forecastParamsSchema = z.object({
  office: z.string().min(1).optional(),
  gridX: z.coerce.number().optional(),
  gridY: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<UsWeatherForecastInput>

const pointOperation: PublicApiOperationDefinition<UsWeatherPointsInput> = {
  id: 'usweather.point',
  providerId: 'usweather',
  name: 'Point Metadata',
  commandPath: ['usweather', 'point'],
  rpcMethod: 'usweather.point',
  description: 'Resolve latitude/longitude to NWS gridpoint metadata.',
  category: 'weather',
  options: [
    {
      name: 'latitude',
      flag: '--latitude <number>',
      description: `Latitude, default ${US_WEATHER_DEFAULT_LATITUDE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented points endpoint requires latitude and longitude before forecast lookup.',
      valueType: 'string',
      defaultValue: String(US_WEATHER_DEFAULT_LATITUDE),
    },
    {
      name: 'longitude',
      flag: '--longitude <number>',
      description: `Longitude, default ${US_WEATHER_DEFAULT_LONGITUDE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented points endpoint requires latitude and longitude before forecast lookup.',
      valueType: 'string',
      defaultValue: String(US_WEATHER_DEFAULT_LONGITUDE),
    },
  ],
  paramsSchema: pointParamsSchema,
  execute: params => getUsWeatherPoint(params),
  normalizeParams: params => pointParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsWeatherPointsInput(params),
  resultKind: 'usweather.point',
  defaultFormat: 'text',
}

const forecastOperation: PublicApiOperationDefinition<UsWeatherForecastInput> = {
  id: 'usweather.forecast',
  providerId: 'usweather',
  name: 'Grid Forecast',
  commandPath: ['usweather', 'forecast'],
  rpcMethod: 'usweather.forecast',
  description: 'Read NWS 12-hour forecast periods for a gridpoint.',
  category: 'weather',
  options: [
    {
      name: 'office',
      flag: '--office <id>',
      description: `NWS grid office id, default ${US_WEATHER_DEFAULT_OFFICE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Forecast endpoint is keyed by office/grid coordinates returned from the points endpoint.',
      defaultValue: US_WEATHER_DEFAULT_OFFICE,
    },
    {
      name: 'gridX',
      flag: '--grid-x <number>',
      description: `Grid X coordinate, default ${US_WEATHER_DEFAULT_GRID_X}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Forecast endpoint is keyed by office/grid coordinates returned from the points endpoint.',
      valueType: 'integer',
      defaultValue: String(US_WEATHER_DEFAULT_GRID_X),
    },
    {
      name: 'gridY',
      flag: '--grid-y <number>',
      description: `Grid Y coordinate, default ${US_WEATHER_DEFAULT_GRID_Y}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Forecast endpoint is keyed by office/grid coordinates returned from the points endpoint.',
      valueType: 'integer',
      defaultValue: String(US_WEATHER_DEFAULT_GRID_Y),
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Forecast periods to show, default/cap ${US_WEATHER_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'NWS 12-hour forecast returns about 14 periods; defaulting to 14 captures the full response in one request.',
      valueType: 'integer',
      defaultValue: String(US_WEATHER_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: forecastParamsSchema,
  execute: params => getUsWeatherForecast(params),
  normalizeParams: params => forecastParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsWeatherForecastInput(params),
  resultKind: 'usweather.forecast',
  defaultFormat: 'text',
}

export const usWeatherProvider: PublicApiProviderModule = {
  manifest: {
    id: 'usweather',
    name: 'US Weather',
    description: 'No-auth National Weather Service GeoJSON/JSON forecast APIs.',
    publicApisCategory: 'Weather',
    homepageUrl: 'https://www.weather.gov/documentation/services-web-api',
    docsUrl: 'https://www.weather.gov/documentation/services-web-api',
    auth: {
      mode: 'none',
      notes: ['NWS requires a unique User-Agent but no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['weather', 'government', 'forecast', 'nws', 'no-auth', 'geojson'],
    freePlanNotes: [
      'NWS docs state open data is free to use for any purpose and rate limits are not public but generous for typical use.',
      'CLI uses documented points and grid forecast endpoints only; radar display data is explicitly not provided by api.weather.gov.',
      `Forecast default/cap ${US_WEATHER_MAX_LIMIT} covers the normal 12-hour period response.`,
    ],
  },
  operations: [pointOperation, forecastOperation],
  endpoints: [
    {
      id: 'usweather-points',
      method: 'GET',
      urlPattern: 'https://api.weather.gov/points/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NWS points endpoint resolving latitude/longitude to forecast grid metadata.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.weather.gov/documentation/services-web-api', 'https://api.weather.gov/points/38.8894,-77.0352'],
      consumedBy: ['usweather point'],
      notes: ['No API key required.', 'Unique User-Agent required by NWS docs.'],
    },
    {
      id: 'usweather-grid-forecast',
      method: 'GET',
      urlPattern: 'https://api.weather.gov/gridpoints/*/forecast*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NWS gridpoint 12-hour forecast endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.weather.gov/documentation/services-web-api', 'https://api.weather.gov/gridpoints/LWX/97,71/forecast'],
      consumedBy: ['usweather forecast'],
      notes: ['No API key required.', 'Unique User-Agent required by NWS docs.'],
    },
  ],
}
