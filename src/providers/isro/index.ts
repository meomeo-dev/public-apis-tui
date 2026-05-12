import { z } from 'zod'
import {
  ISRO_DEFAULT_LIMIT,
  ISRO_DEFAULT_RESOURCE,
  ISRO_MAX_LIMIT,
  ISRO_MAX_OFFSET,
  listIsroCatalog,
  normalizeIsroCatalogInput,
  type IsroCatalogInput,
} from '../../application/usecases/isro.js'
import { ISRO_RESOURCES } from '../../infrastructure/openApis/isroClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const catalogParamsSchema = z.object({
  resource: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<IsroCatalogInput>

const catalogOperation: PublicApiOperationDefinition<IsroCatalogInput> = {
  id: 'isro.catalog',
  providerId: 'isro',
  name: 'ISRO catalog',
  commandPath: ['isro', 'catalog'],
  rpcMethod: 'isro.catalog',
  description: 'List bounded ISRO spacecraft, launcher, customer satellite, or centre records.',
  category: 'science',
  options: [
    {
      name: 'resource',
      flag: '--resource <name>',
      description: [
        `Resource: ${ISRO_RESOURCES.join(', ')},`,
        `default ${ISRO_DEFAULT_RESOURCE}`,
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: [
        'The official README exposes several independent read-only JSON',
        'resources; users choose one stable resource at a time.',
      ].join(' '),
      valueType: 'string',
      defaultValue: ISRO_DEFAULT_RESOURCE,
    },
    {
      name: 'search',
      flag: '--search <text>',
      description: 'Local case-insensitive search across returned resource fields.',
      exposure: 'primary',
      group: 'filters',
      reason: [
        'The upstream API returns whole arrays without documented query',
        'filters, so search is local and bounded by output pagination.',
      ].join(' '),
      valueType: 'string',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to show, 1-${ISRO_MAX_LIMIT}, default ${ISRO_DEFAULT_LIMIT}.`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Caps terminal output and persisted cache payloads.',
      valueType: 'integer',
      defaultValue: String(ISRO_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: `Rows to skip, 0-${ISRO_MAX_OFFSET}, default 0.`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Supports repeatable pagination over locally filtered results.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: catalogParamsSchema,
  execute: params => listIsroCatalog(params),
  normalizeParams: params => catalogParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIsroCatalogInput(params),
  resultKind: 'isro.catalog',
  defaultFormat: 'text',
}

export const isroProvider: PublicApiProviderModule = {
  manifest: {
    id: 'isro',
    name: 'ISRO',
    description: [
      'No-auth HTTPS JSON catalog for Indian Space Research Organisation',
      'spacecraft, launchers, customer satellites, and centres.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://isro.vercel.app',
    docsUrl: 'https://github.com/isro/api',
    auth: {
      mode: 'none',
      notes: [
        [
          'Selected Vercel JSON endpoints return public read-only catalog',
          'data without API key, OAuth, cookies, account setup, or browser',
          'session requirements.',
        ].join(' '),
      ],
    },
    tags: ['science', 'space', 'isro', 'india', 'spacecraft', 'no-auth', 'json'],
    freePlanNotes: [
      'No public rate limit is documented for the small read-only catalog endpoints.',
      [
        'The README-listed spacecraft_missions endpoint currently returns HTTP',
        '404 text/plain and is not exposed.',
      ].join(' '),
      'The CLI performs only local filtering and pagination over JSON arrays.',
    ],
  },
  operations: [catalogOperation],
  endpoints: [
    {
      id: 'isro-catalog-resource',
      method: 'GET',
      urlPattern: [
        'regex:^https://isro\\.vercel\\.app/api/',
        '(spacecrafts|launchers|customer_satellites|centres)$',
      ].join(''),
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'ISRO documented read-only JSON catalog resource endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/isro/api',
        'https://isro.vercel.app/api/spacecrafts',
        'https://isro.vercel.app/api/launchers',
        'https://isro.vercel.app/api/customer_satellites',
        'https://isro.vercel.app/api/centres',
      ],
      consumedBy: ['public-apis apis run isro.catalog'],
      notes: [
        'No authentication required for selected read-only JSON endpoints.',
        'The spacecraft_missions endpoint was documented but returned 404 in live probes.',
        'CLI excludes mutating behavior, binary payloads, browser scraping, and guessed routes.',
      ],
    },
  ],
}

export type { IsroCatalogInput } from '../../application/usecases/isro.js'
