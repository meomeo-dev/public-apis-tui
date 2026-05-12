import { z } from 'zod'
import {
  MINOR_PLANET_CENTER_DEFAULT_LIMIT,
  MINOR_PLANET_CENTER_DEFAULT_QUERY,
  MINOR_PLANET_CENTER_MAX_LIMIT,
  normalizeMinorPlanetCenterSearchInput,
  searchMinorPlanetCenter,
  type MinorPlanetCenterSearchInput,
} from '../../application/usecases/minorPlanetCenter.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  maxEccentricity: z.union([z.number(), z.string()]).optional(),
  maxInclination: z.union([z.number(), z.string()]).optional(),
  maxSemiMajorAxis: z.union([z.number(), z.string()]).optional(),
  minObservations: z.union([z.number(), z.string()]).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<MinorPlanetCenterSearchInput>

const searchOperation: PublicApiOperationDefinition<MinorPlanetCenterSearchInput> = {
  id: 'minorplanetcenter.search',
  providerId: 'minorplanetcenter',
  name: 'MPC asteroid search',
  commandPath: ['minorplanetcenter', 'search'],
  rpcMethod: 'minorplanetcenter.search',
  description: 'Search Asterank Minor Planet Center MPCORB asteroid records.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Designation text, default ${MINOR_PLANET_CENTER_DEFAULT_QUERY}.`,
      exposure: 'primary',
      group: 'query',
      reason: [
        'Maps to a generated readable_des regular-expression filter without',
        'exposing arbitrary MongoDB query JSON.',
      ].join(' '),
      valueType: 'string',
      defaultValue: MINOR_PLANET_CENTER_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Asteroids to request, 1-${MINOR_PLANET_CENTER_MAX_LIMIT},`,
        `default ${MINOR_PLANET_CENTER_DEFAULT_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Caps terminal output and avoids unbounded MPCORB result dumps.',
      valueType: 'integer',
      defaultValue: String(MINOR_PLANET_CENTER_DEFAULT_LIMIT),
    },
    {
      name: 'maxEccentricity',
      flag: '--max-eccentricity <number>',
      description: 'Maximum orbital eccentricity, 0-2.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Generates a curated numeric e < value filter.',
      valueType: 'string',
    },
    {
      name: 'maxInclination',
      flag: '--max-inclination <degrees>',
      description: 'Maximum orbital inclination in degrees, 0-180.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Generates a curated numeric i < value filter.',
      valueType: 'string',
    },
    {
      name: 'maxSemiMajorAxis',
      flag: '--max-semi-major-axis <au>',
      description: 'Maximum semi-major axis in astronomical units, 0-200.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Generates a curated numeric a < value filter.',
      valueType: 'string',
    },
    {
      name: 'minObservations',
      flag: '--min-observations <count>',
      description: 'Minimum MPC observation count, 0-1000000.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Generates a curated numeric num_obs >= value filter.',
      valueType: 'integer',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchMinorPlanetCenter(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeMinorPlanetCenterSearchInput(params),
  resultKind: 'minorplanetcenter.search',
  defaultFormat: 'text',
}

export const minorPlanetCenterProvider: PublicApiProviderModule = {
  manifest: {
    id: 'minorplanetcenter',
    name: 'Minor Planet Center',
    description: [
      'No-auth HTTPS JSON search for Minor Planet Center MPCORB asteroid',
      'records through the documented Asterank API.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://www.asterank.com/mpc',
    docsUrl: 'https://www.asterank.com/mpc',
    auth: {
      mode: 'none',
      notes: [
        [
          'Live probes returned JSON records without API key, OAuth, account',
          'setup, cookies, or browser session requirements.',
        ].join(' '),
      ],
    },
    tags: ['science', 'astronomy', 'asteroids', 'mpc', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs describe nightly updates from MPCORB.DAT.',
      [
        'Upstream supports MongoDB-style query JSON, but the CLI exposes only',
        'bounded designation and numeric orbit filters.',
      ].join(' '),
      'No public quota is documented; CLI caps live requests to 50 records.',
    ],
  },
  operations: [searchOperation],
  endpoints: [
    {
      id: 'minorplanetcenter-mpc-search',
      method: 'GET',
      urlPattern: 'https://www.asterank.com/api/mpc*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'Asterank Minor Planet Center MPCORB JSON search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.asterank.com/mpc',
        'https://www.asterank.com/api/mpc?limit=2',
      ],
      consumedBy: ['public-apis apis run minorplanetcenter.search'],
      notes: [
        'No authentication required in live probes.',
        [
          'CLI does not expose arbitrary MongoDB query JSON, HTML pages,',
          'bulk MPCORB downloads, browser scraping, or binary payloads.',
        ].join(' '),
      ],
    },
  ],
}

export type {
  MinorPlanetCenterSearchInput,
} from '../../application/usecases/minorPlanetCenter.js'
