import { z } from 'zod'
import {
  VEDIC_SOCIETY_CATEGORIES,
  VEDIC_SOCIETY_DEFAULT_CATEGORY,
  VEDIC_SOCIETY_DEFAULT_DESCRIPTION,
  VEDIC_SOCIETY_DEFAULT_LIMIT,
  VEDIC_SOCIETY_DEFAULT_WORD,
  VEDIC_SOCIETY_MAX_LIMIT,
  getVedicSocietyCategory,
  normalizeVedicSocietyCategoryInput,
  normalizeVedicSocietyDescriptionsInput,
  normalizeVedicSocietyWordsInput,
  searchVedicSocietyDescriptions,
  searchVedicSocietyWords,
  type VedicSocietyCategoryInput,
  type VedicSocietyDescriptionsInput,
  type VedicSocietyWordsInput,
} from '../../application/usecases/vedicSociety.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const wordsParamsSchema = z.object({
  word: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<VedicSocietyWordsInput>

const descriptionsParamsSchema = z.object({
  description: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<VedicSocietyDescriptionsInput>

const categoryParamsSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<VedicSocietyCategoryInput>

const wordsOperation: PublicApiOperationDefinition<VedicSocietyWordsInput> = {
  id: 'vedicsociety.words',
  providerId: 'vedicsociety',
  name: 'Vedic Society word lookup',
  commandPath: ['vedicsociety', 'words'],
  rpcMethod: 'vedicsociety.words',
  description: 'Find Vedic Society noun records containing a word fragment.',
  category: 'books',
  options: [
    {
      name: 'word',
      flag: '--word <text>',
      description: `Word fragment to search, default ${VEDIC_SOCIETY_DEFAULT_WORD}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented /words/{word} path parameter.',
      defaultValue: VEDIC_SOCIETY_DEFAULT_WORD,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Records to show, default ${VEDIC_SOCIETY_DEFAULT_LIMIT},`,
        `cap ${VEDIC_SOCIETY_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Upstream arrays are unpaginated; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(VEDIC_SOCIETY_DEFAULT_LIMIT),
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
  paramsSchema: wordsParamsSchema,
  execute: params => searchVedicSocietyWords(params),
  normalizeParams: params => wordsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVedicSocietyWordsInput(params),
  resultKind: 'vedicsociety.words',
  defaultFormat: 'text',
}

const descriptionsOperation: PublicApiOperationDefinition<
  VedicSocietyDescriptionsInput
> = {
  id: 'vedicsociety.descriptions',
  providerId: 'vedicsociety',
  name: 'Vedic Society description search',
  commandPath: ['vedicsociety', 'descriptions'],
  rpcMethod: 'vedicsociety.descriptions',
  description: 'Find Vedic Society noun records by description text.',
  category: 'books',
  options: [
    {
      name: 'description',
      flag: '--description <text>',
      description: [
        'Description text fragment to search, default',
        `${VEDIC_SOCIETY_DEFAULT_DESCRIPTION}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented /descriptions/{description} path.',
      defaultValue: VEDIC_SOCIETY_DEFAULT_DESCRIPTION,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Records to show, default ${VEDIC_SOCIETY_DEFAULT_LIMIT},`,
        `cap ${VEDIC_SOCIETY_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Upstream arrays are unpaginated; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(VEDIC_SOCIETY_DEFAULT_LIMIT),
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
  paramsSchema: descriptionsParamsSchema,
  execute: params => searchVedicSocietyDescriptions(params),
  normalizeParams: params => descriptionsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVedicSocietyDescriptionsInput(params),
  resultKind: 'vedicsociety.descriptions',
  defaultFormat: 'text',
}

const categoryOperation: PublicApiOperationDefinition<VedicSocietyCategoryInput> = {
  id: 'vedicsociety.category',
  providerId: 'vedicsociety',
  name: 'Vedic Society category browser',
  commandPath: ['vedicsociety', 'category'],
  rpcMethod: 'vedicsociety.category',
  description: 'Browse Vedic Society noun records in a documented category.',
  category: 'books',
  options: [
    {
      name: 'category',
      flag: '--category <category>',
      description: [
        `Documented category, default ${VEDIC_SOCIETY_DEFAULT_CATEGORY}; one of`,
        VEDIC_SOCIETY_CATEGORIES.join(', '),
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: 'Locally validates the documented /categories/{category} enum.',
      defaultValue: VEDIC_SOCIETY_DEFAULT_CATEGORY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Records to show, default ${VEDIC_SOCIETY_DEFAULT_LIMIT},`,
        `cap ${VEDIC_SOCIETY_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Upstream arrays are unpaginated; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(VEDIC_SOCIETY_DEFAULT_LIMIT),
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
  paramsSchema: categoryParamsSchema,
  execute: params => getVedicSocietyCategory(params),
  normalizeParams: params => categoryParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVedicSocietyCategoryInput(params),
  resultKind: 'vedicsociety.category',
  defaultFormat: 'text',
}

export const vedicSocietyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'vedicsociety',
    name: 'Vedic Society',
    description: [
      'No-auth HTTPS JSON noun metadata from Vedic literature, including',
      'romanized words, Nagari spellings, descriptions, and categories.',
    ].join(' '),
    publicApisCategory: 'Books',
    homepageUrl: 'https://aninditabasu.github.io/indica/',
    docsUrl: 'https://aninditabasu.github.io/indica/topics/api_vs.html',
    auth: {
      mode: 'none',
      notes: [
        [
          'Current Indica docs, OpenAPI JSON, and live probes confirm selected',
          'GET endpoints return JSON without API keys, OAuth, cookies,',
          'account setup, or browser sessions.',
        ].join(' '),
        [
          'The public-apis listed /indica/html/vs.html page now returns 404;',
          'same-project current docs and OpenAPI JSON are used instead.',
        ].join(' '),
      ],
    },
    tags: ['books', 'vedic-literature', 'metadata', 'indica', 'no-auth', 'json'],
    freePlanNotes: [
      'No public quota or rate limit is documented for the selected endpoints.',
      [
        'CLI exposes read-only noun metadata lookups only; arbitrary path',
        'proxying and HTML warning payloads are excluded.',
      ].join(' '),
      [
        'Documented categories include',
        `${VEDIC_SOCIETY_CATEGORIES.join(', ')}.`,
      ].join(' '),
    ],
  },
  operations: [wordsOperation, descriptionsOperation, categoryOperation],
  endpoints: [
    createEndpoint(
      'vedicsociety-words',
      'https://indica-1hwj.onrender.com/vs/v2/words/{word}',
      'Vedic Society noun records matching a romanized word fragment.',
      ['public-apis apis run vedicsociety.words'],
    ),
    createEndpoint(
      'vedicsociety-descriptions',
      'https://indica-1hwj.onrender.com/vs/v2/descriptions/{description}',
      'Vedic Society noun records matching description text.',
      ['public-apis apis run vedicsociety.descriptions'],
    ),
    createEndpoint(
      'vedicsociety-categories',
      'https://indica-1hwj.onrender.com/vs/v2/categories/{category}',
      'Vedic Society noun records by documented category.',
      ['public-apis apis run vedicsociety.category'],
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
      'https://aninditabasu.github.io/indica/topics/api_vs.html',
      'https://aninditabasu.github.io/indica/assets/openapi_vs.json',
    ],
    consumedBy,
    notes: [
      'No authentication required in live probes.',
      [
        'Client requires application/json except known not-found text, and',
        'rejects text/html warning payloads instead of rendering them as data.',
      ].join(' '),
    ],
  }
}

export type {
  VedicSocietyCategoryInput,
  VedicSocietyDescriptionsInput,
  VedicSocietyWordsInput,
} from '../../application/usecases/vedicSociety.js'
