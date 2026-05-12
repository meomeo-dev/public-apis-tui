import { z } from 'zod'
import {
  NOCTUA_DEFAULT_SOURCE_NAME,
  NOCTUA_MAX_SOURCE_NAME_LENGTH,
  getNoctuaSource,
  getNoctuaStats,
  normalizeNoctuaSourceInput,
  type NoctuaSourceInput,
  type NoctuaStatsInput,
} from '../../application/usecases/noctua.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const statsParamsSchema = z.object({}) satisfies z.ZodType<NoctuaStatsInput>

const sourceParamsSchema = z.object({
  name: z.string().optional(),
}) satisfies z.ZodType<NoctuaSourceInput>

const statsOperation: PublicApiOperationDefinition<NoctuaStatsInput> = {
  id: 'noctua.stats',
  providerId: 'noctua',
  name: 'Noctua skysource stats',
  commandPath: ['noctua', 'stats'],
  rpcMethod: 'noctua.stats',
  description: 'Show NoctuaSky sky source database totals by source type.',
  category: 'science',
  options: [],
  paramsSchema: statsParamsSchema,
  execute: () => getNoctuaStats(),
  normalizeParams: () => ({}),
  createCacheKeyParams: () => ({}),
  resultKind: 'noctua.stats',
  defaultFormat: 'text',
}

const sourceOperation: PublicApiOperationDefinition<NoctuaSourceInput> = {
  id: 'noctua.source',
  providerId: 'noctua',
  name: 'Noctua sky source by name',
  commandPath: ['noctua', 'source'],
  rpcMethod: 'noctua.source',
  description: 'Get one NoctuaSky source by exact name match.',
  category: 'science',
  options: [
    {
      name: 'name',
      flag: '--name <text>',
      description: [
        `Sky source name, default ${NOCTUA_DEFAULT_SOURCE_NAME}, max`,
        `${NOCTUA_MAX_SOURCE_NAME_LENGTH} characters.`,
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: [
        'Maps to the documented exact-name skysource path while rejecting',
        'slash and URL control characters locally.',
      ].join(' '),
      valueType: 'string',
      defaultValue: NOCTUA_DEFAULT_SOURCE_NAME,
    },
  ],
  paramsSchema: sourceParamsSchema,
  execute: params => getNoctuaSource(params),
  normalizeParams: params => sourceParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNoctuaSourceInput(params),
  resultKind: 'noctua.source',
  defaultFormat: 'text',
}

export const noctuaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'noctua',
    name: 'Noctua',
    description: [
      'No-auth HTTPS JSON access to NoctuaSky read-only skysource statistics',
      'and exact-name sky source records.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://api.noctuasky.com/api/v1/swaggerdoc/',
    docsUrl: 'https://api.noctuasky.com/api/v1/swaggerdoc/',
    auth: {
      mode: 'none',
      notes: [
        [
          'Swagger/OpenAPI and live probes confirm selected skysources GET',
          'routes return JSON without API keys, OAuth, cookies, account setup,',
          'or browser session requirements.',
        ].join(' '),
        [
          'Locations, observations, and user routes require Authorization or',
          'mutate account data and are excluded.',
        ].join(' '),
      ],
    },
    tags: ['science', 'astronomy', 'skysources', 'no-auth', 'json'],
    freePlanNotes: [
      'No public rate limit is documented for the selected read-only endpoints.',
      [
        'The documented list query currently returned empty arrays in live',
        'probes and is not exposed as a primary CLI operation.',
      ].join(' '),
    ],
  },
  operations: [statsOperation, sourceOperation],
  endpoints: [
    {
      id: 'noctua-skysource-stats',
      method: 'GET',
      urlPattern: 'https://api.noctuasky.com/api/v1/skysources/stats/',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'NoctuaSky sky source database statistics endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://api.noctuasky.com/api/v1/swaggerdoc/',
        'https://api.noctuasky.com/api/v1/openapi.json',
        'https://api.noctuasky.com/api/v1/skysources/stats/',
      ],
      consumedBy: ['public-apis apis run noctua.stats'],
      notes: [
        'No authentication required in live probes.',
        'Returns bounded source type counts and total sky source count.',
      ],
    },
    {
      id: 'noctua-skysource-name',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.noctuasky\\.com/api/v1/skysources/name/[^/?]+$',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'NoctuaSky exact-name sky source lookup endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://api.noctuasky.com/api/v1/swaggerdoc/',
        'https://api.noctuasky.com/api/v1/openapi.json',
        'https://api.noctuasky.com/api/v1/skysources/name/Mars',
      ],
      consumedBy: ['public-apis apis run noctua.source'],
      notes: [
        'No authentication required in live probes.',
        [
          'CLI exposes exact-name lookup only and projects selected model_data',
          'fields instead of dumping long raw orbital strings.',
        ].join(' '),
      ],
    },
  ],
}

export type {
  NoctuaSourceInput,
  NoctuaStatsInput,
} from '../../application/usecases/noctua.js'
