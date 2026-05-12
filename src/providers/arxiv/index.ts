import { z } from 'zod'
import {
  getArxivPaper,
  searchArxiv,
  type ArxivPaperInput,
  type ArxivSearchInput,
} from '../../application/usecases/arxiv.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  start: z.number().int().optional(),
  maxResults: z.number().int().optional(),
  sortBy: z.string().min(1).optional(),
  sortOrder: z.string().min(1).optional(),
  summaryLength: z.number().int().optional(),
}) satisfies z.ZodType<ArxivSearchInput>

const paperParamsSchema = z.object({
  id: z.string().min(1).optional(),
  summaryLength: z.number().int().optional(),
}) satisfies z.ZodType<ArxivPaperInput>

const searchOperation: PublicApiOperationDefinition<ArxivSearchInput> = {
  id: 'arxiv.search',
  providerId: 'arxiv',
  name: 'Search papers',
  commandPath: ['arxiv', 'search'],
  rpcMethod: 'arxiv.search',
  description: 'Search arXiv metadata through the no-auth Atom API.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <query>',
      description: 'arXiv search query, default all:electron',
      exposure: 'primary',
      group: 'query',
      reason: [
        'The official API is query-driven and supports field prefixes such as',
        'all:, ti:, au:, and abs:.',
      ].join(' '),
      defaultValue: 'all:electron',
    },
    {
      name: 'category',
      flag: '--category <category>',
      description: 'Optional arXiv category filter such as cs.LG or math.AG',
      exposure: 'primary',
      group: 'filters',
      reason: [
        'Category filtering is a common research workflow and keeps search',
        'output focused.',
      ].join(' '),
    },
    {
      name: 'maxResults',
      flag: '--max-results <count>',
      description: 'Results to request, default 10, CLI cap 100',
      exposure: 'primary',
      group: 'pagination',
      reason: [
        'arXiv documents 2000 per slice, but CLI output and cache should',
        'stay bounded.',
      ].join(' '),
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'start',
      flag: '--start <count>',
      description: '0-based result offset, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: [
        'Supports documented paging without cluttering the first search',
        'workflow.',
      ].join(' '),
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'sortBy',
      flag: '--sort-by <relevance|lastUpdatedDate|submittedDate>',
      description: 'Sort field, default relevance',
      exposure: 'advanced',
      group: 'filters',
      reason: 'arXiv documents these sort fields; relevance is the common default.',
      defaultValue: 'relevance',
    },
    {
      name: 'sortOrder',
      flag: '--sort-order <ascending|descending>',
      description: 'Sort order, default descending',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Pairs with --sort-by while keeping result chronology explicit.',
      defaultValue: 'descending',
    },
    {
      name: 'summaryLength',
      flag: '--summary-length <count>',
      description: [
        'Maximum abstract characters per paper, default 500, 0 hides',
        'summaries',
      ].join(' '),
      exposure: 'advanced',
      group: 'presentation',
      reason: [
        'arXiv abstracts can be long; bounding them preserves readable',
        'terminal output and cache size.',
      ].join(' '),
      valueType: 'integer',
      defaultValue: '500',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchArxiv(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  resultKind: 'arxiv.search',
  defaultFormat: 'text',
}

const paperOperation: PublicApiOperationDefinition<ArxivPaperInput> = {
  id: 'arxiv.paper',
  providerId: 'arxiv',
  name: 'Paper by id',
  commandPath: ['arxiv', 'paper'],
  rpcMethod: 'arxiv.paper',
  description: 'Fetch one arXiv paper metadata record by arXiv identifier.',
  category: 'science',
  options: [
    {
      name: 'id',
      flag: '--id <arxiv-id>',
      description: 'arXiv id such as 2101.00001 or cond-mat/0011267',
      exposure: 'primary',
      group: 'query',
      reason: 'The id_list API path needs an explicit arXiv identifier.',
    },
    {
      name: 'summaryLength',
      flag: '--summary-length <count>',
      description: 'Maximum abstract characters, default 500, 0 hides summary',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Paper abstracts can be long; users can hide or expand them explicitly.',
      valueType: 'integer',
      defaultValue: '500',
    },
  ],
  paramsSchema: paperParamsSchema,
  execute: params => getArxivPaper(params),
  normalizeParams: params => paperParamsSchema.parse(params),
  resultKind: 'arxiv.paper',
  defaultFormat: 'text',
}

export const arxivProvider: PublicApiProviderModule = {
  manifest: {
    id: 'arxiv',
    name: 'arXiv',
    description: 'No-auth Atom API for searching arXiv paper metadata.',
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://arxiv.org/',
    docsUrl: 'https://info.arxiv.org/help/api/user-manual.html',
    auth: {
      mode: 'none',
      notes: ['Official API examples use public GET requests without API keys.'],
    },
    tags: ['science', 'research', 'papers', 'atom', 'metadata', 'no-auth'],
    freePlanNotes: [
      'Official docs ask clients making repeated calls to include a 3 second delay.',
      [
        'Docs limit a single slice to at most 2000 results and 30000 total',
        'results; CLI caps interactive requests at 100.',
      ].join(' '),
      [
        'CLI exposes metadata and links only; it does not fetch PDFs or',
        'scrape article pages.',
      ].join(' '),
    ],
  },
  operations: [searchOperation, paperOperation],
  endpoints: [
    {
      id: 'arxiv-query',
      method: 'GET',
      urlPattern: 'https://export.arxiv.org/api/query*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: [
        'arXiv Atom query endpoint for search_query, id_list, paging, and',
        'sorting.',
      ].join(' '),
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://info.arxiv.org/help/api/user-manual.html'],
      consumedBy: ['arxiv search', 'arxiv paper'],
      notes: [
        'No authentication required.',
        'Docs request a 3 second delay between repeated calls.',
        'Response is Atom XML projected to bounded JSON metadata by the CLI.',
      ],
    },
  ],
}

export type {
  ArxivPaperInput,
  ArxivSearchInput,
} from '../../application/usecases/arxiv.js'
