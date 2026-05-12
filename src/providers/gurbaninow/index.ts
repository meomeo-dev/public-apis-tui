import { z } from 'zod'
import {
  getGurbaniNowBani,
  listGurbaniNowBanis,
  normalizeGurbaniNowBaniInput,
  normalizeGurbaniNowBanisInput,
  normalizeGurbaniNowSearchInput,
  searchGurbaniNow,
  type GurbaniNowBaniInput,
  type GurbaniNowBanisInput,
  type GurbaniNowSearchInput,
} from '../../application/usecases/gurbaninow.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().min(1).optional(),
  source: z.number().int().optional(),
  searchType: z.number().int().optional(),
  writer: z.number().int().optional(),
  raag: z.number().int().optional(),
  ang: z.number().int().optional(),
  results: z.number().int().optional(),
  skip: z.number().int().optional(),
}) satisfies z.ZodType<GurbaniNowSearchInput>

const banisParamsSchema = z.object({
  limit: z.number().int().optional(),
}) satisfies z.ZodType<GurbaniNowBanisInput>

const baniParamsSchema = z.object({
  id: z.number().int().optional(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<GurbaniNowBaniInput>

const searchOperation: PublicApiOperationDefinition<GurbaniNowSearchInput> = {
  id: 'gurbaninow.search',
  providerId: 'gurbaninow',
  name: 'Search',
  commandPath: ['gurbaninow', 'search'],
  rpcMethod: 'gurbaninow.search',
  description: 'Search GurbaniNow shabad records with bounded JSON output.',
  category: 'books',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Gurbani search text, default DDrgj',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented search route is addressed by user query text.',
      defaultValue: 'DDrgj',
    },
    {
      name: 'source',
      flag: '--source <id>',
      description: 'Source id, default 1 for Sri Guru Granth Sahib Ji',
      exposure: 'primary',
      group: 'filters',
      reason: 'Source scoping is documented and keeps results focused.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'searchType',
      flag: '--search-type <type>',
      description: 'Search type 0, 1, 2, 4, or 6; default 1',
      exposure: 'primary',
      group: 'filters',
      reason: 'Search type is required to choose first-letter or word search.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'writer',
      flag: '--writer <id>',
      description: 'Optional writer id',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Writer filtering is documented but secondary to query/source.',
      valueType: 'integer',
    },
    {
      name: 'raag',
      flag: '--raag <id>',
      description: 'Optional source subsection or raag id',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Raag filtering is documented but more specialized.',
      valueType: 'integer',
    },
    {
      name: 'ang',
      flag: '--ang <page>',
      description: 'Optional ang/page number',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Ang filtering is useful after choosing a source.',
      valueType: 'integer',
    },
    {
      name: 'results',
      flag: '--results <count>',
      description: 'Results to request/show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Docs cap results at 100; CLI uses a smaller terminal-safe cap.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'skip',
      flag: '--skip <count>',
      description: 'Records to skip for paging, CLI cap 10000',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Skip enables documented paging and offline replay.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchGurbaniNow(params),
  normalizeParams: params => normalizeGurbaniNowSearchInput(
    searchParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeGurbaniNowSearchInput(params),
  resultKind: 'gurbaninow.search',
  defaultFormat: 'text',
}

const banisOperation: PublicApiOperationDefinition<GurbaniNowBanisInput> = {
  id: 'gurbaninow.banis',
  providerId: 'gurbaninow',
  name: 'Banis',
  commandPath: ['gurbaninow', 'banis'],
  rpcMethod: 'gurbaninow.banis',
  description: 'List documented GurbaniNow Bani records.',
  category: 'books',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Banis to show/cache, default 40, CLI cap 120',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The list endpoint is not paginated; a local cap bounds output.',
      valueType: 'integer',
      defaultValue: '40',
    },
  ],
  paramsSchema: banisParamsSchema,
  execute: params => listGurbaniNowBanis(params),
  normalizeParams: params => normalizeGurbaniNowBanisInput(
    banisParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeGurbaniNowBanisInput(params),
  resultKind: 'gurbaninow.banis',
  defaultFormat: 'text',
}

const baniOperation: PublicApiOperationDefinition<GurbaniNowBaniInput> = {
  id: 'gurbaninow.bani',
  providerId: 'gurbaninow',
  name: 'Bani',
  commandPath: ['gurbaninow', 'bani'],
  rpcMethod: 'gurbaninow.bani',
  description: 'Read a bounded page from one GurbaniNow Bani.',
  category: 'books',
  options: [
    {
      name: 'id',
      flag: '--id <id>',
      description: 'Bani id, default 1 for Jap Ji Sahib',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented Bani endpoint is id-addressed.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'offset',
      flag: '--offset <line>',
      description: 'Zero-based line offset inside the Bani, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Bani payloads can be large; offset enables bounded reading.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'limit',
      flag: '--limit <lines>',
      description: 'Lines to show/cache, default 40, CLI cap 120',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounded line pages preserve terminal UX and persistence size.',
      valueType: 'integer',
      defaultValue: '40',
    },
  ],
  paramsSchema: baniParamsSchema,
  execute: params => getGurbaniNowBani(params),
  normalizeParams: params => normalizeGurbaniNowBaniInput(
    baniParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeGurbaniNowBaniInput(params),
  resultKind: 'gurbaninow.bani',
  defaultFormat: 'text',
}

export const gurbaniNowProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gurbaninow',
    name: 'GurbaniNow',
    description: [
      'Deprecated but live no-auth HTTPS JSON API for Gurbani and Shabad',
      'search, Bani lists, and bounded Bani reading.',
    ].join(' '),
    publicApisCategory: 'Books',
    homepageUrl: 'https://github.com/gurbaninow/api-public',
    docsUrl: 'https://github.com/gurbaninow/api-public/wiki/API-Documentation',
    auth: {
      mode: 'none',
      notes: [
        'Official wiki documents public v2 GET JSON endpoints without keys.',
        'README says the API is deprecated and unsupported.',
      ],
    },
    tags: ['books', 'gurbani', 'sikh', 'shabad', 'json', 'no-auth'],
    freePlanNotes: [
      'Repository is deprecated; runtime audit must watch for stale service risk.',
      'Only read-only documented JSON endpoints are exposed.',
      'Deprecated converter and random redirect endpoints are intentionally hidden.',
    ],
  },
  operations: [searchOperation, banisOperation, baniOperation],
  endpoints: [
    {
      id: 'gurbaninow-search',
      method: 'GET',
      urlPattern: 'https://api.gurbaninow.com/v2/search/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-10',
      description: 'GurbaniNow documented shabad search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/gurbaninow/api-public/wiki/API-Documentation',
        'https://api.gurbaninow.com/v2/search/DDrgj/?source=1&searchtype=1',
      ],
      consumedBy: ['public-apis apis run gurbaninow.search'],
      notes: [
        'No authentication required for documented GET search.',
        'CLI caps results below the documented 100 maximum for terminal UX.',
      ],
    },
    {
      id: 'gurbaninow-banis',
      method: 'GET',
      urlPattern: 'https://api.gurbaninow.com/v2/banis',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-10',
      description: 'GurbaniNow documented Bani list endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/gurbaninow/api-public/wiki/API-Documentation',
        'https://api.gurbaninow.com/v2/banis',
      ],
      consumedBy: ['public-apis apis run gurbaninow.banis'],
      notes: ['No authentication required; local limit bounds list output.'],
    },
    {
      id: 'gurbaninow-bani',
      method: 'GET',
      urlPattern: 'https://api.gurbaninow.com/v2/banis/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-10',
      description: 'GurbaniNow documented Bani detail endpoint by id.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/gurbaninow/api-public/wiki/API-Documentation',
        'https://api.gurbaninow.com/v2/banis/1',
      ],
      consumedBy: ['public-apis apis run gurbaninow.bani'],
      notes: [
        'No authentication required.',
        'CLI exposes bounded line pages rather than raw full Bani dumps.',
      ],
    },
  ],
}

export type {
  GurbaniNowBaniInput,
  GurbaniNowBanisInput,
  GurbaniNowSearchInput,
} from '../../application/usecases/gurbaninow.js'
