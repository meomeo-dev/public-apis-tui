import { z } from 'zod'
import { getGutendexBook, listGutendexBooks, type GutendexBookInput, type GutendexBooksInput } from '../../application/usecases/gutendex.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const booksParamsSchema = z.object({
  search: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  languages: z.string().min(1).optional(),
  page: z.number().int().optional(),
  sort: z.string().min(1).optional(),
  ids: z.string().min(1).optional(),
}) satisfies z.ZodType<GutendexBooksInput>

const bookParamsSchema = z.object({
  id: z.number().int().optional(),
}) satisfies z.ZodType<GutendexBookInput>

const booksOperation: PublicApiOperationDefinition<GutendexBooksInput> = {
  id: 'gutendex.books',
  providerId: 'gutendex',
  name: 'Books',
  commandPath: ['gutendex', 'books'],
  rpcMethod: 'gutendex.books',
  description: 'Search and filter Project Gutenberg book metadata from Gutendex.',
  category: 'books',
  options: [
    {
      name: 'search',
      flag: '--search <text>',
      description: 'Search authors and titles',
      exposure: 'primary',
      group: 'query',
      reason: 'Gutendex search is the primary discovery workflow for terminal users.',
    },
    {
      name: 'topic',
      flag: '--topic <text>',
      description: 'Filter by subject or bookshelf topic',
      exposure: 'primary',
      group: 'filters',
      reason: 'Topic filtering is documented and useful for browsing public-domain books.',
    },
    {
      name: 'languages',
      flag: '--languages <codes>',
      description: 'Comma-separated language codes, e.g. en or en,fr',
      exposure: 'primary',
      group: 'filters',
      reason: 'Language is a high-value documented filter for books.',
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: 'Page number; Gutendex controls page size from 0-32',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint is paginated and exposes next/previous links.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'sort',
      flag: '--sort <ascending|descending|popular>',
      description: 'Sort by Gutenberg id or popularity',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Sorting is documented but secondary to search/topic/language filters.',
    },
    {
      name: 'ids',
      flag: '--ids <ids>',
      description: 'Comma-separated book ids to fetch in list mode',
      exposure: 'advanced',
      group: 'query',
      reason: 'ID filtering is useful for repeatable lookups but less common than the single-book command.',
    },
  ],
  paramsSchema: booksParamsSchema,
  execute: params => listGutendexBooks(params),
  normalizeParams: params => booksParamsSchema.parse(params),
  resultKind: 'gutendex.books',
  defaultFormat: 'text',
}

const bookOperation: PublicApiOperationDefinition<GutendexBookInput> = {
  id: 'gutendex.book',
  providerId: 'gutendex',
  name: 'Book',
  commandPath: ['gutendex', 'book'],
  rpcMethod: 'gutendex.book',
  description: 'Fetch one Gutendex book by Gutenberg id.',
  category: 'books',
  options: [
    {
      name: 'id',
      flag: '--id <id>',
      description: 'Project Gutenberg book id, default 1342',
      exposure: 'primary',
      group: 'query',
      reason: 'The single-book endpoint is addressed by numeric id.',
      valueType: 'integer',
      defaultValue: '1342',
    },
  ],
  paramsSchema: bookParamsSchema,
  execute: params => getGutendexBook(params),
  normalizeParams: params => bookParamsSchema.parse(params),
  resultKind: 'gutendex.book',
  defaultFormat: 'text',
}

export const gutendexProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gutendex',
    name: 'Gutendex',
    description: 'No-auth HTTPS JSON API for Project Gutenberg book metadata.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://gutendex.com/',
    docsUrl: 'https://gutendex.com/',
    auth: {
      mode: 'none',
      notes: ['Docs expose public GET /books/ and /books/<id>/ endpoints without API keys.'],
    },
    tags: ['books', 'project-gutenberg', 'metadata', 'public-domain', 'no-auth'],
    freePlanNotes: [
      'Docs state each books page has 0-32 results controlled by Gutendex; CLI exposes page but no page-size parameter.',
      'No API key, OAuth, or browser clickstream is required.',
    ],
  },
  operations: [booksOperation, bookOperation],
  endpoints: [
    {
      id: 'gutendex-books',
      method: 'GET',
      urlPattern: 'https://gutendex.com/books/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Gutendex paginated books metadata endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://gutendex.com/'],
      consumedBy: ['gutendex books'],
      notes: ['No authentication required.', 'Page size is provider-controlled at 0-32 results.'],
    },
    {
      id: 'gutendex-book',
      method: 'GET',
      urlPattern: 'https://gutendex.com/books/*/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Gutendex single book lookup endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://gutendex.com/'],
      consumedBy: ['gutendex book'],
      notes: ['No authentication required.'],
    },
  ],
}

export type { GutendexBookInput, GutendexBooksInput } from '../../application/usecases/gutendex.js'
