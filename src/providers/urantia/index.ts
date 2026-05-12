import { z } from 'zod'
import {
  URANTIA_DEFAULT_LIMIT,
  URANTIA_DEFAULT_PAPER_ID,
  URANTIA_DEFAULT_QUERY,
  URANTIA_DEFAULT_REF,
  URANTIA_MAX_LIMIT,
} from '../../application/usecases/urantia.js'
import {
  getUrantiaPaper,
  getUrantiaParagraph,
  getUrantiaToc,
  normalizeUrantiaPaperInput,
  normalizeUrantiaParagraphInput,
  normalizeUrantiaSearchInput,
  normalizeUrantiaTocInput,
  searchUrantia,
  type UrantiaPaperInput,
  type UrantiaParagraphInput,
  type UrantiaSearchInput,
  type UrantiaTocInput,
} from '../../application/usecases/urantia.js'
import {
  URANTIA_BASE_URL,
  URANTIA_DOCS_URL,
  URANTIA_LANGUAGES,
  URANTIA_OPENAPI_URL,
  URANTIA_SEARCH_TYPES,
} from '../../infrastructure/openApis/urantiaClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const tocParamsSchema = z.object({
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<UrantiaTocInput>

const paperParamsSchema = z.object({
  paperId: z.string().optional(),
  lang: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<UrantiaPaperInput>

const paragraphParamsSchema = z.object({
  ref: z.string().optional(),
  lang: z.string().optional(),
}) satisfies z.ZodType<UrantiaParagraphInput>

const searchParamsSchema = z.object({
  query: z.string().optional(),
  type: z.string().optional(),
  limit: z.number().int().optional(),
  page: z.number().int().optional(),
  paperId: z.string().optional(),
  partId: z.string().optional(),
  lang: z.string().optional(),
}) satisfies z.ZodType<UrantiaSearchInput>

const tocOperation: PublicApiOperationDefinition<UrantiaTocInput> = {
  id: 'urantia.toc',
  providerId: 'urantia',
  name: 'Urantia Papers table of contents',
  commandPath: ['urantia', 'toc'],
  rpcMethod: 'urantia.toc',
  description: 'List Urantia Book parts and paper titles from the public TOC.',
  category: 'books',
  options: paginationOptions('part', 5),
  paramsSchema: tocParamsSchema,
  execute: params => getUrantiaToc(params),
  normalizeParams: params => tocParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUrantiaTocInput(params),
  resultKind: 'urantia.toc',
  defaultFormat: 'text',
}

const paperOperation: PublicApiOperationDefinition<UrantiaPaperInput> = {
  id: 'urantia.paper',
  providerId: 'urantia',
  name: 'Urantia Paper reader',
  commandPath: ['urantia', 'paper'],
  rpcMethod: 'urantia.paper',
  description: 'Read one Urantia Paper with locally bounded paragraph output.',
  category: 'books',
  options: [
    {
      name: 'paperId',
      flag: '--paper-id <0-196>',
      description: `Paper ID, default ${URANTIA_DEFAULT_PAPER_ID}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to documented GET /papers/{id}.',
      defaultValue: URANTIA_DEFAULT_PAPER_ID,
    },
    languageOption(),
    ...paginationOptions('paragraph', URANTIA_DEFAULT_LIMIT),
  ],
  paramsSchema: paperParamsSchema,
  execute: params => getUrantiaPaper(params),
  normalizeParams: params => paperParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUrantiaPaperInput(params),
  resultKind: 'urantia.paper',
  defaultFormat: 'text',
}

const paragraphOperation: PublicApiOperationDefinition<UrantiaParagraphInput> = {
  id: 'urantia.paragraph',
  providerId: 'urantia',
  name: 'Urantia paragraph reader',
  commandPath: ['urantia', 'paragraph'],
  rpcMethod: 'urantia.paragraph',
  description: 'Read one Urantia paragraph by documented reference id.',
  category: 'books',
  options: [
    {
      name: 'ref',
      flag: '--ref <reference>',
      description: `Paragraph reference, default ${URANTIA_DEFAULT_REF}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to documented GET /paragraphs/{ref}.',
      defaultValue: URANTIA_DEFAULT_REF,
    },
    languageOption(),
  ],
  paramsSchema: paragraphParamsSchema,
  execute: params => getUrantiaParagraph(params),
  normalizeParams: params => paragraphParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUrantiaParagraphInput(params),
  resultKind: 'urantia.paragraph',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<UrantiaSearchInput> = {
  id: 'urantia.search',
  providerId: 'urantia',
  name: 'Urantia full-text search',
  commandPath: ['urantia', 'search'],
  rpcMethod: 'urantia.search',
  description: 'Search Urantia paragraphs with bounded full-text results.',
  category: 'books',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Full-text query, default ${URANTIA_DEFAULT_QUERY}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to documented q parameter for GET /search.',
      defaultValue: URANTIA_DEFAULT_QUERY,
    },
    {
      name: 'type',
      flag: '--type <and|or|phrase>',
      description: [
        `Search type, default and; one of ${URANTIA_SEARCH_TYPES.join(', ')}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to documented full-text search type parameter.',
      defaultValue: 'and',
    },
    {
      name: 'paperId',
      flag: '--paper-id <0-196>',
      description: 'Optional paper filter.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented paperId filter.',
    },
    {
      name: 'partId',
      flag: '--part-id <0-4>',
      description: 'Optional part filter.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented partId filter.',
    },
    languageOption(),
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Search results to return, default ${URANTIA_DEFAULT_LIMIT},`,
        `cap ${URANTIA_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Maps to documented limit with a tighter terminal cap.',
      valueType: 'integer',
      defaultValue: String(URANTIA_DEFAULT_LIMIT),
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: 'Search result page, zero-based, default 0.',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Maps to documented zero-based search page parameter.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchUrantia(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUrantiaSearchInput(params),
  resultKind: 'urantia.search',
  defaultFormat: 'text',
}

export const urantiaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'urantia',
    name: 'Urantia Papers',
    description: [
      'No-auth HTTPS JSON access to Urantia Book table of contents, papers,',
      'paragraphs, and full-text search.',
    ].join(' '),
    publicApisCategory: 'Books',
    homepageUrl: URANTIA_DOCS_URL,
    docsUrl: URANTIA_DOCS_URL,
    auth: {
      mode: 'none',
      notes: [
        [
          'Official docs, llms.txt, OpenAPI JSON, and live probes confirm',
          'selected read-only JSON endpoints require no API key, OAuth,',
          'cookies, account setup, or browser session.',
        ].join(' '),
      ],
    },
    tags: ['books', 'urantia', 'full-text-search', 'paragraphs', 'no-auth'],
    freePlanNotes: [
      [
        'llms.txt documents 100 requests per minute per IP, while observed',
        'API headers reported x-ratelimit-limit 200.',
      ].join(' '),
      [
        'CLI excludes account/auth routes, MCP, audio, OG images, embeddings,',
        'semantic search, and media URLs from the initial visible contract.',
      ].join(' '),
      [
        'Responses may include upstream audio/video/html fields; the client',
        'projects only text, reference, label, and pagination fields.',
      ].join(' '),
    ],
  },
  operations: [tocOperation, paperOperation, paragraphOperation, searchOperation],
  endpoints: [
    createEndpoint(
      'urantia-toc',
      'GET',
      'https://api.urantia.dev/toc',
      'Full table of contents with parts and paper titles.',
      ['public-apis apis run urantia.toc'],
    ),
    createEndpoint(
      'urantia-paper',
      'GET',
      'https://api.urantia.dev/papers/{id}',
      'One paper with paragraph records; CLI omits media/html fields.',
      ['public-apis apis run urantia.paper'],
    ),
    createEndpoint(
      'urantia-paragraph',
      'GET',
      'https://api.urantia.dev/paragraphs/{ref}',
      'One paragraph by documented Urantia reference format.',
      ['public-apis apis run urantia.paragraph'],
    ),
    createEndpoint(
      'urantia-search',
      'GET',
      'https://api.urantia.dev/search?q=*&type=*&limit=*&page=*',
      'Full-text paragraph search with optional paper and part filters.',
      ['public-apis apis run urantia.search'],
    ),
  ],
}

function languageOption() {
  return {
    name: 'lang',
    flag: '--lang <eng|es|fr|pt|de|ko>',
    description: [
      `Translation language, default eng; one of ${URANTIA_LANGUAGES.join(', ')}.`,
    ].join(' '),
    exposure: 'advanced' as const,
    group: 'content' as const,
    reason: 'Maps to documented language parameter for translated content.',
    defaultValue: 'eng',
  }
}

function paginationOptions(scope: string, defaultLimit: number) {
  return [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `${scope} rows to show, default ${defaultLimit},`,
        `cap ${URANTIA_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary' as const,
      group: 'pagination' as const,
      reason: 'Applies bounded terminal pagination and cache sizing.',
      valueType: 'integer' as const,
      defaultValue: String(defaultLimit),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Local result offset, default 0.',
      exposure: 'advanced' as const,
      group: 'pagination' as const,
      reason: 'Provides page navigation without exposing raw upstream payloads.',
      valueType: 'integer' as const,
      defaultValue: '0',
    },
  ]
}

function createEndpoint(
  id: string,
  method: 'GET',
  urlPattern: string,
  description: string,
  consumedBy: string[],
): PublicApiProviderModule['endpoints'][number] {
  return {
    id,
    method,
    urlPattern,
    category: 'public-apis:books',
    evidenceStatus: 'confirmed',
    observedOn: '2026-05-11',
    description,
    siteIds: ['public-apis-tui'],
    sampleSources: [
      URANTIA_DOCS_URL,
      URANTIA_OPENAPI_URL,
      URANTIA_BASE_URL,
    ],
    consumedBy,
    notes: [
      'No authentication required in official docs and live probes.',
      [
        'Client requires JSON responses and does not render audio, video,',
        'htmlText, embeddings, OG images, MCP tools, or auth/account routes.',
      ].join(' '),
    ],
  }
}

export type {
  UrantiaPaperInput,
  UrantiaParagraphInput,
  UrantiaSearchInput,
  UrantiaTocInput,
} from '../../application/usecases/urantia.js'
