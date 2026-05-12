import { z } from 'zod'
import {
  TLE_DEFAULT_SATELLITE_ID,
  TLE_MAX_PAGE,
  getTleSatellite,
  normalizeTleSatelliteInput,
  normalizeTleSearchInput,
  searchTle,
  type TleSatelliteInput,
  type TleSearchInput,
} from '../../application/usecases/tle.js'
import {
  TLE_DEFAULT_PAGE,
  TLE_DEFAULT_SEARCH,
} from '../../infrastructure/openApis/tleClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().optional(),
}) satisfies z.ZodType<TleSearchInput>

const satelliteParamsSchema = z.object({
  satelliteId: z.number().int().optional(),
}) satisfies z.ZodType<TleSatelliteInput>

const searchOperation: PublicApiOperationDefinition<TleSearchInput> = {
  id: 'tle.search',
  providerId: 'tle',
  name: 'Search',
  commandPath: ['tle', 'search'],
  rpcMethod: 'tle.search',
  description: 'Search current Earth-orbit satellite TLE records.',
  category: 'science',
  options: [
    {
      name: 'search',
      flag: '--search <text>',
      description: `Satellite name search, default ${TLE_DEFAULT_SEARCH}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented TLE API search query parameter.',
      valueType: 'string',
      defaultValue: TLE_DEFAULT_SEARCH,
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: `Result page, 1-${TLE_MAX_PAGE}, default ${TLE_DEFAULT_PAGE}.`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Maps to the documented Hydra collection page parameter.',
      valueType: 'integer',
      defaultValue: String(TLE_DEFAULT_PAGE),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchTle(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeTleSearchInput(params),
  resultKind: 'tle.search',
  defaultFormat: 'text',
}

const satelliteOperation: PublicApiOperationDefinition<TleSatelliteInput> = {
  id: 'tle.satellite',
  providerId: 'tle',
  name: 'Satellite',
  commandPath: ['tle', 'satellite'],
  rpcMethod: 'tle.satellite',
  description: 'Show one satellite TLE record by NORAD satellite id.',
  category: 'science',
  options: [
    {
      name: 'satelliteId',
      flag: '--satellite-id <number>',
      description: `NORAD satellite id, default ${TLE_DEFAULT_SATELLITE_ID}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented /api/tle/{satelliteId} JSON route.',
      valueType: 'integer',
      defaultValue: String(TLE_DEFAULT_SATELLITE_ID),
    },
  ],
  paramsSchema: satelliteParamsSchema,
  execute: params => getTleSatellite(params),
  normalizeParams: params => satelliteParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeTleSatelliteInput(params),
  resultKind: 'tle.satellite',
  defaultFormat: 'text',
}

export const tleProvider: PublicApiProviderModule = {
  manifest: {
    id: 'tle',
    name: 'TLE',
    description: [
      'No-auth HTTPS JSON access to current NORAD Two-Line Element records',
      'for Earth-orbiting satellites.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://tle.ivanstanojevic.me/',
    docsUrl: 'https://tle.ivanstanojevic.me/#/docs',
    auth: {
      mode: 'none',
      notes: [
        [
          'Official SPA and live probes confirmed selected JSON endpoints',
          'return data without API key, OAuth, cookies, account setup, or',
          'browser session requirements.',
        ].join(' '),
      ],
    },
    tags: ['science', 'space', 'satellites', 'tle', 'norad', 'json', 'no-auth'],
    freePlanNotes: [
      'The site describes CelesTrak-sourced TLE data in JSON format.',
      'The API returned CORS-enabled JSON without credentials in live probes.',
      'Google Maps UI and browser routes are not exposed by the CLI.',
    ],
  },
  operations: [searchOperation, satelliteOperation],
  endpoints: [
    {
      id: 'tle-search',
      method: 'GET',
      urlPattern: 'https://tle.ivanstanojevic.me/api/tle/*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'TLE API Hydra collection endpoint for satellite records.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://tle.ivanstanojevic.me/#/docs',
        'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=1',
      ],
      consumedBy: ['tle.search'],
      notes: [
        'No authentication required.',
        'CLI exposes search and page only, not browser map UI or bulk downloads.',
      ],
    },
    {
      id: 'tle-satellite',
      method: 'GET',
      urlPattern: String.raw`regex:^https://tle\.ivanstanojevic\.me/api/tle/[0-9]+$`,
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'TLE API JSON endpoint for one NORAD satellite id.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://tle.ivanstanojevic.me/#/docs',
        'https://tle.ivanstanojevic.me/api/tle/25544',
      ],
      consumedBy: ['tle.satellite'],
      notes: [
        'No authentication required.',
        'Returns satellite id, name, epoch date, and raw TLE line1/line2.',
      ],
    },
  ],
}
