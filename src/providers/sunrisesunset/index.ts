import { z } from 'zod'
import {
  SUNRISE_SUNSET_DEFAULT_DATE,
  SUNRISE_SUNSET_DEFAULT_LATITUDE,
  SUNRISE_SUNSET_DEFAULT_LONGITUDE,
  SUNRISE_SUNSET_DEFAULT_TZID,
  getSunriseSunsetTimes,
  normalizeSunriseSunsetInput,
} from '../../application/usecases/sunriseSunset.js'
import type {
  SunriseSunsetInput,
} from '../../infrastructure/openApis/sunriseSunsetClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const timesParamsSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  date: z.string().optional(),
  tzid: z.string().optional(),
}) satisfies z.ZodType<SunriseSunsetInput>

const timesOperation: PublicApiOperationDefinition<SunriseSunsetInput> = {
  id: 'sunrisesunset.times',
  providerId: 'sunrisesunset',
  name: 'Times',
  commandPath: ['sunrisesunset', 'times'],
  rpcMethod: 'sunrisesunset.times',
  description: 'Show sunrise, sunset, solar noon, and twilight times.',
  category: 'science',
  options: [
    {
      name: 'latitude',
      flag: '--latitude <number>',
      description: `Latitude, default ${SUNRISE_SUNSET_DEFAULT_LATITUDE}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Latitude is required by the documented JSON endpoint.',
      valueType: 'string',
      defaultValue: String(SUNRISE_SUNSET_DEFAULT_LATITUDE),
    },
    {
      name: 'longitude',
      flag: '--longitude <number>',
      description: `Longitude, default ${SUNRISE_SUNSET_DEFAULT_LONGITUDE}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Longitude is required by the documented JSON endpoint.',
      valueType: 'string',
      defaultValue: String(SUNRISE_SUNSET_DEFAULT_LONGITUDE),
    },
    {
      name: 'date',
      flag: '--date <YYYY-MM-DD>',
      description: `Gregorian date, default ${SUNRISE_SUNSET_DEFAULT_DATE}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'A fixed ISO date keeps cache keys and offline replay reproducible.',
      valueType: 'string',
      defaultValue: SUNRISE_SUNSET_DEFAULT_DATE,
    },
    {
      name: 'tzid',
      flag: '--tzid <timezone>',
      description: `Timezone id, default ${SUNRISE_SUNSET_DEFAULT_TZID}.`,
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Timezone is documented and controls returned timestamp offsets.',
      valueType: 'string',
      defaultValue: SUNRISE_SUNSET_DEFAULT_TZID,
    },
  ],
  paramsSchema: timesParamsSchema,
  execute: params => getSunriseSunsetTimes(params),
  normalizeParams: params => normalizeSunriseSunsetInput(
    timesParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeSunriseSunsetInput(params),
  resultKind: 'sunrisesunset.times',
  defaultFormat: 'text',
}

export const sunriseSunsetProvider: PublicApiProviderModule = {
  manifest: {
    id: 'sunrisesunset',
    name: 'Sunrise and Sunset',
    description: [
      'No-auth HTTPS JSON provider for sunrise, sunset, solar noon, and',
      'twilight times by latitude, longitude, date, and timezone.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://sunrise-sunset.org/api',
    docsUrl: 'https://sunrise-sunset.org/api',
    auth: {
      mode: 'none',
      notes: [
        [
          'Official docs state no signup or API key is needed, and live probes',
          'returned JSON without OAuth, cookies, account setup, or browser flow.',
        ].join(' '),
      ],
    },
    tags: ['science', 'sunrise', 'sunset', 'solar', 'time', 'json', 'no-auth'],
    freePlanNotes: [
      'Attribution with a link to Sunrise-Sunset.org is required by the docs.',
      'The docs prohibit excessive or abusive request volume.',
      'JSONP callback and relative date passthrough are not exposed.',
    ],
  },
  operations: [timesOperation],
  endpoints: [
    {
      id: 'sunrisesunset-json',
      method: 'GET',
      urlPattern: 'https://api.sunrise-sunset.org/json?*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'Sunrise-Sunset JSON endpoint for solar event times.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://sunrise-sunset.org/api',
        [
          'https://api.sunrise-sunset.org/json?',
          'lat=36.7201600&lng=-4.4203400&date=2026-05-11&formatted=0',
        ].join(''),
      ],
      consumedBy: ['sunrisesunset.times'],
      notes: [
        'No authentication required.',
        'CLI forces formatted=0 and excludes JSONP callback.',
      ],
    },
  ],
}
