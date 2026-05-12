import { z } from 'zod'
import { getCrossrefWork, listCrossrefWorks, type CrossrefWorkInput, type CrossrefWorksInput } from '../../application/usecases/crossref.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const worksParamsSchema = z.object({
  query: z.string().min(1).optional(),
  rows: z.number().int().optional(),
  offset: z.number().int().optional(),
  filter: z.string().min(1).optional(),
  sort: z.string().min(1).optional(),
  order: z.string().min(1).optional(),
  mailto: z.string().min(1).optional(),
}) satisfies z.ZodType<CrossrefWorksInput>

const workParamsSchema = z.object({
  doi: z.string().min(1).optional(),
  mailto: z.string().min(1).optional(),
}) satisfies z.ZodType<CrossrefWorkInput>

const worksOperation: PublicApiOperationDefinition<CrossrefWorksInput> = {
  id: 'crossref.works',
  providerId: 'crossref',
  name: 'Works search',
  commandPath: ['crossref', 'works'],
  rpcMethod: 'crossref.works',
  description: 'Search Crossref works metadata via the public REST API.',
  category: 'books',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Bibliographic search query, default metadata',
      exposure: 'primary',
      group: 'query',
      reason: 'Search terms are the primary interaction for metadata discovery.',
      defaultValue: 'metadata',
    },
    {
      name: 'rows',
      flag: '--rows <count>',
      description: 'Rows to request, default 20, documented max 1000',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Crossref documents rows up to 1000 and users need control over result volume.',
      valueType: 'integer',
      defaultValue: '20',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Offset for offset-based pagination, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Useful for paging, but secondary to initial search.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'filter',
      flag: '--filter <expr>',
      description: 'Optional Crossref filter expression, e.g. type:journal-article',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Crossref filter grammar is powerful but too broad to expose as many separate CLI flags.',
    },
    {
      name: 'sort',
      flag: '--sort <field>',
      description: 'Optional Crossref sort field such as relevance, score, deposited, or published',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Sort is useful for advanced metadata exploration without flooding CLI with all fields.',
    },
    {
      name: 'order',
      flag: '--order <asc|desc>',
      description: 'Sort order, default desc',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Pairs with --sort while keeping direction explicit.',
      defaultValue: 'desc',
    },
    {
      name: 'mailto',
      flag: '--mailto <email>',
      description: 'Optional Crossref polite-pool email identification',
      exposure: 'advanced',
      group: 'transport',
      reason: 'Crossref recommends identifying clients; value is optional and not persisted as a secret.',
    },
  ],
  paramsSchema: worksParamsSchema,
  execute: params => listCrossrefWorks(params),
  normalizeParams: params => worksParamsSchema.parse(params),
  resultKind: 'crossref.works',
  defaultFormat: 'text',
}

const workOperation: PublicApiOperationDefinition<CrossrefWorkInput> = {
  id: 'crossref.work',
  providerId: 'crossref',
  name: 'Work by DOI',
  commandPath: ['crossref', 'work'],
  rpcMethod: 'crossref.work',
  description: 'Fetch one Crossref work metadata record by DOI.',
  category: 'books',
  options: [
    {
      name: 'doi',
      flag: '--doi <doi>',
      description: 'DOI to fetch, e.g. 10.1037/0003-066X.59.1.29',
      exposure: 'primary',
      group: 'query',
      reason: 'The work endpoint is addressed by DOI and cannot run without it.',
    },
    {
      name: 'mailto',
      flag: '--mailto <email>',
      description: 'Optional Crossref polite-pool email identification',
      exposure: 'advanced',
      group: 'transport',
      reason: 'Crossref recommends identifying clients; value is optional and not persisted as a secret.',
    },
  ],
  paramsSchema: workParamsSchema,
  execute: params => getCrossrefWork(params),
  normalizeParams: params => workParamsSchema.parse(params),
  resultKind: 'crossref.work',
  defaultFormat: 'text',
}

export const crossrefProvider: PublicApiProviderModule = {
  manifest: {
    id: 'crossref',
    name: 'Crossref Metadata Search',
    description: 'No-auth HTTPS JSON REST API for books and articles metadata.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/',
    docsUrl: 'https://github.com/CrossRef/rest-api-doc',
    auth: {
      mode: 'none',
      notes: ['REST API can be used without API keys; optional mailto identifies clients for polite usage.'],
    },
    tags: ['books', 'articles', 'metadata', 'doi', 'no-auth'],
    freePlanNotes: [
      'Docs state rows has a maximum of 1000 for offset pagination.',
      'Live public pool responses expose X-Rate-Limit-Limit, X-Rate-Limit-Interval, X-Concurrency-Limit, and X-API-Pool headers.',
    ],
  },
  operations: [worksOperation, workOperation],
  endpoints: [
    {
      id: 'crossref-works',
      method: 'GET',
      urlPattern: 'https://api.crossref.org/works',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Crossref works metadata search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/CrossRef/rest-api-doc'],
      consumedBy: ['crossref works'],
      notes: ['No authentication required.', 'rows maximum is documented as 1000.'],
    },
    {
      id: 'crossref-work',
      method: 'GET',
      urlPattern: 'https://api.crossref.org/works/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Crossref single work lookup by DOI.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/CrossRef/rest-api-doc'],
      consumedBy: ['crossref work'],
      notes: ['No authentication required.', 'DOI path component must be URL-encoded.'],
    },
  ],
}

export type { CrossrefWorkInput, CrossrefWorksInput } from '../../application/usecases/crossref.js'
