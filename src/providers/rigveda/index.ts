import { z } from 'zod'
import {
  RIG_VEDA_DEFAULT_FIELD,
  RIG_VEDA_DEFAULT_LIMIT,
  RIG_VEDA_DEFAULT_MANDAL,
  RIG_VEDA_DEFAULT_POET,
  RIG_VEDA_DEFAULT_POET_CATEGORY,
  RIG_VEDA_DEFAULT_SEARCH_MANDAL,
  RIG_VEDA_DEFAULT_VALUE,
  RIG_VEDA_GOD_CATEGORIES,
  RIG_VEDA_MAX_LIMIT,
  RIG_VEDA_POET_CATEGORIES,
  RIG_VEDA_SEARCH_FIELDS,
  getRigVedaBook,
  normalizeRigVedaBookInput,
  normalizeRigVedaSearchInput,
  searchRigVeda,
  type RigVedaBookInput,
  type RigVedaSearchInput,
} from '../../application/usecases/rigVeda.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const bookParamsSchema = z.object({
  mandal: z.number().int().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<RigVedaBookInput>

const searchParamsSchema = z.object({
  field: z.string().optional(),
  value: z.string().optional(),
  mandal: z.number().int().optional(),
  poet: z.string().optional(),
  poetCategory: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<RigVedaSearchInput>

const bookOperation: PublicApiOperationDefinition<RigVedaBookInput> = {
  id: 'rigveda.book',
  providerId: 'rigveda',
  name: 'Rig Veda book metadata',
  commandPath: ['rigveda', 'book'],
  rpcMethod: 'rigveda.book',
  description: 'List Rig Veda verse metadata for one mandal/book.',
  category: 'books',
  options: [
    {
      name: 'mandal',
      flag: '--mandal <1-10>',
      description: `Rig Veda book number, default ${RIG_VEDA_DEFAULT_MANDAL}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented /book/{mandal} endpoint is mandal-addressed.',
      valueType: 'integer',
      defaultValue: String(RIG_VEDA_DEFAULT_MANDAL),
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Verse records to show, default ${RIG_VEDA_DEFAULT_LIMIT},`,
        `cap ${RIG_VEDA_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Upstream arrays are unpaginated; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(RIG_VEDA_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Local result offset, default 0.',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Provides page navigation without inventing upstream pagination.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: bookParamsSchema,
  execute: params => getRigVedaBook(params),
  normalizeParams: params => bookParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRigVedaBookInput(params),
  resultKind: 'rigveda.book',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<RigVedaSearchInput> = {
  id: 'rigveda.search',
  providerId: 'rigveda',
  name: 'Rig Veda metadata search',
  commandPath: ['rigveda', 'search'],
  rpcMethod: 'rigveda.search',
  description: 'Search Rig Veda metadata by god, poet, meter, or category.',
  category: 'books',
  options: [
    {
      name: 'field',
      flag: '--field <field>',
      description: [
        `Search field, default ${RIG_VEDA_DEFAULT_FIELD}; one of`,
        RIG_VEDA_SEARCH_FIELDS.join(', '),
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: 'Maps curated CLI intents to documented path endpoints.',
      defaultValue: RIG_VEDA_DEFAULT_FIELD,
    },
    {
      name: 'value',
      flag: '--value <text>',
      description: `Search text or category, default ${RIG_VEDA_DEFAULT_VALUE}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Represents the documented path parameter for the selected field.',
      defaultValue: RIG_VEDA_DEFAULT_VALUE,
    },
    {
      name: 'mandal',
      flag: '--mandal <1-10>',
      description: [
        'Book number for field god-in-book, default',
        `${RIG_VEDA_DEFAULT_SEARCH_MANDAL}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Only used by the documented /god/{sungfor}/{mandal} endpoint.',
      valueType: 'integer',
      defaultValue: String(RIG_VEDA_DEFAULT_SEARCH_MANDAL),
    },
    {
      name: 'poet',
      flag: '--poet <text>',
      description: [
        'Poet text for field god-by-poet, default',
        `${RIG_VEDA_DEFAULT_POET}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Only used by the documented /godbypoet endpoint.',
      defaultValue: RIG_VEDA_DEFAULT_POET,
    },
    {
      name: 'poetCategory',
      flag: '--poet-category <category>',
      description: [
        'Poet category for combined category search, default',
        `${RIG_VEDA_DEFAULT_POET_CATEGORY}; one of`,
        RIG_VEDA_POET_CATEGORIES.join(', '),
      ].join(' '),
      exposure: 'advanced',
      group: 'filters',
      reason: 'Locally validates documented poet-category enum values.',
      defaultValue: RIG_VEDA_DEFAULT_POET_CATEGORY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Verse records to show, default ${RIG_VEDA_DEFAULT_LIMIT},`,
        `cap ${RIG_VEDA_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Upstream arrays are unpaginated; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(RIG_VEDA_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Local result offset, default 0.',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Provides page navigation without inventing upstream pagination.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchRigVeda(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRigVedaSearchInput(params),
  resultKind: 'rigveda.search',
  defaultFormat: 'text',
}

export const rigVedaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'rigveda',
    name: 'Rig Veda',
    description: [
      'No-auth HTTPS JSON metadata for Rig Veda verse mandal/sukta, meter,',
      'poet, poet category, god, and god category records.',
    ].join(' '),
    publicApisCategory: 'Books',
    homepageUrl: 'https://aninditabasu.github.io/indica/',
    docsUrl: 'https://aninditabasu.github.io/indica/topics/api_rv.html',
    auth: {
      mode: 'none',
      notes: [
        [
          'Current Indica docs and live probes confirm selected GET endpoints',
          'return JSON without API keys, OAuth, cookies, account setup, or',
          'browser sessions.',
        ].join(' '),
        [
          'The public-apis listed /indica/html/rv.html page now returns 404;',
          'same-project current docs and OpenAPI JSON are used instead.',
        ].join(' '),
      ],
    },
    tags: ['books', 'rig-veda', 'metadata', 'indica', 'no-auth', 'json'],
    freePlanNotes: [
      'No public quota or rate limit is documented for the selected endpoints.',
      [
        'CLI exposes read-only metadata lookups only; arbitrary path proxying',
        'and HTML warning payloads are excluded.',
      ].join(' '),
      [
        'Documented god categories include',
        `${RIG_VEDA_GOD_CATEGORIES.join(', ')}.`,
      ].join(' '),
    ],
  },
  operations: [bookOperation, searchOperation],
  endpoints: [
    createEndpoint(
      'rigveda-book',
      'https://indica-1hwj.onrender.com/rv/v2/meta/book/{mandal}',
      'Rig Veda metadata records for one mandal/book.',
      ['public-apis apis run rigveda.book'],
    ),
    createEndpoint(
      'rigveda-meter',
      'https://indica-1hwj.onrender.com/rv/v2/meta/meter/{meter}',
      'Rig Veda metadata records by poetic meter substring.',
      ['public-apis apis run rigveda.search -- --field meter'],
    ),
    createEndpoint(
      'rigveda-poet',
      'https://indica-1hwj.onrender.com/rv/v2/meta/poet/{sungby}',
      'Rig Veda metadata records by poet substring.',
      ['public-apis apis run rigveda.search -- --field poet'],
    ),
    createEndpoint(
      'rigveda-poetcategory',
      'https://indica-1hwj.onrender.com/rv/v2/meta/poetcategory/{category}',
      'Rig Veda metadata records by documented poet category.',
      ['public-apis apis run rigveda.search -- --field poet-category'],
    ),
    createEndpoint(
      'rigveda-god',
      'https://indica-1hwj.onrender.com/rv/v2/meta/god/{sungfor}',
      'Rig Veda metadata records by venerated being or object substring.',
      ['public-apis apis run rigveda.search -- --field god'],
    ),
    createEndpoint(
      'rigveda-god-in-book',
      'https://indica-1hwj.onrender.com/rv/v2/meta/god/{sungfor}/{mandal}',
      'Rig Veda metadata records by god/object within one mandal.',
      ['public-apis apis run rigveda.search -- --field god-in-book'],
    ),
    createEndpoint(
      'rigveda-god-by-poet',
      'https://indica-1hwj.onrender.com/rv/v2/meta/godbypoet/{god}/{poet}',
      'Rig Veda metadata records by god/object and poet substring.',
      ['public-apis apis run rigveda.search -- --field god-by-poet'],
    ),
    createEndpoint(
      'rigveda-godcategory',
      'https://indica-1hwj.onrender.com/rv/v2/meta/godcategory/{category}',
      'Rig Veda metadata records by documented god category.',
      ['public-apis apis run rigveda.search -- --field god-category'],
    ),
    createEndpoint(
      'rigveda-godcategory-by-poetcategory',
      [
        'https://indica-1hwj.onrender.com/rv/v2/meta/',
        'godcategorybypoetcategory/{godCategory}/{poetCategory}',
      ].join(''),
      'Rig Veda metadata records by god category and poet category.',
      [
        [
          'public-apis apis run rigveda.search -- --field',
          'god-category-by-poet-category',
        ].join(' '),
      ],
    ),
  ],
}

function createEndpoint(
  id: string,
  urlPattern: string,
  description: string,
  consumedBy: string[],
): PublicApiProviderModule['endpoints'][number] {
  return {
    id,
    method: 'GET',
    urlPattern,
    category: 'public-apis:books',
    evidenceStatus: 'confirmed',
    observedOn: '2026-05-11',
    description,
    siteIds: ['public-apis-tui'],
    sampleSources: [
      'https://aninditabasu.github.io/indica/topics/api_rv.html',
      'https://aninditabasu.github.io/indica/assets/openapi_rv.json',
    ],
    consumedBy,
    notes: [
      'No authentication required in live probes.',
      [
        'Client requires application/json and rejects text/html warning',
        'payloads instead of rendering them as data.',
      ].join(' '),
    ],
  }
}

export type {
  RigVedaBookInput,
  RigVedaSearchInput,
} from '../../application/usecases/rigVeda.js'
