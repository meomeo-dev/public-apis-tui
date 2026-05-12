import { z } from 'zod'
import {
  SHARE_DEFAULT_DESCRIPTION_LENGTH,
  SHARE_DEFAULT_LIMIT,
  SHARE_DEFAULT_QUERY,
  SHARE_MAX_LIMIT,
  SHARE_MAX_OFFSET,
  SHARE_WORK_TYPES,
  listShareSources,
  normalizeShareSearchInput,
  normalizeShareSourcesInput,
  searchShareWorks,
  type ShareSearchInput,
  type ShareSourcesInput,
} from '../../application/usecases/share.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  type: z.string().optional(),
  source: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  sort: z.string().optional(),
  descriptionLength: z.number().int().optional(),
}) satisfies z.ZodType<ShareSearchInput>

const sourcesParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<ShareSourcesInput>

const searchOperation: PublicApiOperationDefinition<ShareSearchInput> = {
  id: 'share.search',
  providerId: 'share',
  name: 'Search creative works',
  commandPath: ['share', 'search'],
  rpcMethod: 'share.search',
  description: 'Search SHARE normalized creative work metadata with curated filters.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search text, default ${SHARE_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Official docs show query_string search over normalized data.',
      defaultValue: SHARE_DEFAULT_QUERY,
    },
    {
      name: 'type',
      flag: '--type <type>',
      description: `Optional work type; one of ${SHARE_WORK_TYPES.join(', ')}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'SHARE indexes a normalized type field for creative works.',
    },
    {
      name: 'source',
      flag: '--source <name>',
      description: 'Optional source filter such as OSF',
      exposure: 'advanced',
      group: 'filters',
      reason: 'SHARE indexes source names and source filtering is useful.',
    },
    {
      name: 'sort',
      flag: '--sort <relevance|date>',
      description: 'Sort by relevance or newest date, default relevance',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Date sort is useful but must stay curated, not raw DSL.',
      defaultValue: 'relevance',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Results to request/show, default ${SHARE_DEFAULT_LIMIT},`,
        `cap ${SHARE_MAX_LIMIT}`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Elasticsearch result pages and terminal output are bounded.',
      valueType: 'integer',
      defaultValue: String(SHARE_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: `Zero-based result offset, cap ${SHARE_MAX_OFFSET}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset maps to Elasticsearch from without raw URL proxying.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'descriptionLength',
      flag: '--description-length <count>',
      description: [
        `Description characters, default ${SHARE_DEFAULT_DESCRIPTION_LENGTH},`,
        '0 hides descriptions.',
      ].join(' '),
      exposure: 'advanced',
      group: 'presentation',
      reason: 'SHARE descriptions can be long; output and cache stay bounded.',
      valueType: 'integer',
      defaultValue: String(SHARE_DEFAULT_DESCRIPTION_LENGTH),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchShareWorks(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeShareSearchInput(params),
  resultKind: 'share.search',
  defaultFormat: 'text',
}

const sourcesOperation: PublicApiOperationDefinition<ShareSourcesInput> = {
  id: 'share.sources',
  providerId: 'share',
  name: 'Sources',
  commandPath: ['share', 'sources'],
  rpcMethod: 'share.sources',
  description: 'List SHARE source metadata from the public source directory.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Optional local source name/title filter',
      exposure: 'primary',
      group: 'query',
      reason: 'The source directory is small; local text filtering is useful.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Sources to show, default ${SHARE_DEFAULT_LIMIT},`,
        `cap ${SHARE_MAX_LIMIT}`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Terminal output is bounded while the first public page is shown.',
      valueType: 'integer',
      defaultValue: String(SHARE_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: `Zero-based local offset, cap ${SHARE_MAX_OFFSET}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Supports local navigation over the returned source page.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: sourcesParamsSchema,
  execute: params => listShareSources(params),
  normalizeParams: params => sourcesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeShareSourcesInput(params),
  resultKind: 'share.sources',
  defaultFormat: 'text',
}

export const shareProvider: PublicApiProviderModule = {
  manifest: {
    id: 'share',
    name: 'SHARE',
    description: [
      'No-auth HTTPS JSON provider for SHARE normalized research and',
      'scholarly activity metadata.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://share.osf.io/',
    docsUrl: 'https://share-api-and-curation.readthedocs.io/',
    auth: {
      mode: 'none',
      notes: [
        [
          'Root, status, sources, feeds, and creativeworks search probes',
          'returned without credentials.',
        ].join(' '),
      ],
    },
    tags: [
      'science',
      'open-science',
      'research',
      'scholarly-works',
      'metadata',
      'elasticsearch',
      'json',
      'no-auth',
    ],
    freePlanNotes: [
      'No public quota was found for selected read-only metadata endpoints.',
      [
        'CLI exposes curated metadata search and source listing only;',
        'raw Elasticsearch DSL, aggregations, account routes, source push',
        'workflows, RSS/Atom bulk dumps, and browser scraping are excluded.',
      ].join(' '),
    ],
  },
  operations: [searchOperation, sourcesOperation],
  endpoints: [
    {
      id: 'share-creativeworks-search',
      method: 'POST',
      urlPattern: 'https://share.osf.io/api/v2/search/creativeworks/_search',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'SHARE creative works Elasticsearch search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://share-api-and-curation.readthedocs.io/en/latest/elasticsearch.html',
        [
          'https://share.osf.io/api/v2/search/creativeworks/_search',
          '?q=title:reproducibility',
        ].join(''),
      ],
      consumedBy: ['public-apis apis run share.search'],
      notes: [
        [
          'No authentication required for curated read-only search probes.',
          'CLI constructs safe simple_query_string bodies instead of exposing',
          'raw Elasticsearch DSL or aggregations.',
        ].join(' '),
      ],
    },
    {
      id: 'share-sources-list',
      method: 'GET',
      urlPattern: 'https://share.osf.io/api/v2/sources/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'SHARE public source directory JSON:API endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://share.osf.io/api/v2/',
        'https://share.osf.io/api/v2/sources/',
      ],
      consumedBy: ['public-apis apis run share.sources'],
      notes: [
        [
          'No authentication required for source directory probes.',
          'The CLI reads the public page and applies local filtering/paging.',
        ].join(' '),
      ],
    },
  ],
}

export type {
  ShareSearchInput,
  ShareSourcesInput,
} from '../../application/usecases/share.js'
