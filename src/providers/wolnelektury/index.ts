import { z } from 'zod'
import {
  getWolneLekturyBook,
  listWolneLekturyBooks,
  readWolneLekturyBook,
  type WolneLekturyBookInput,
  type WolneLekturyBooksInput,
  type WolneLekturyReadInput,
} from '../../application/usecases/wolneLektury.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const booksParamsSchema = z.object({
  query: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  genre: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  epoch: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<WolneLekturyBooksInput>

const bookParamsSchema = z.object({
  slug: z.string().min(1).optional(),
}) satisfies z.ZodType<WolneLekturyBookInput>

const readParamsSchema = z.object({
  slug: z.string().min(1).optional(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<WolneLekturyReadInput>

const booksOperation: PublicApiOperationDefinition<WolneLekturyBooksInput> = {
  id: 'wolnelektury.books',
  providerId: 'wolnelektury',
  name: 'Books',
  commandPath: ['wolnelektury', 'books'],
  rpcMethod: 'wolnelektury.books',
  description: 'List Wolne Lektury public-domain book metadata with client-side terminal filters.',
  category: 'books',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Search title or author text',
      exposure: 'primary',
      group: 'query',
      reason: 'The books endpoint is a catalog; title/author search is the primary terminal workflow.',
    },
    {
      name: 'author',
      flag: '--author <text>',
      description: 'Filter by author name',
      exposure: 'primary',
      group: 'filters',
      reason: 'Author metadata is included in the documented books response.',
    },
    {
      name: 'genre',
      flag: '--genre <text>',
      description: 'Filter by genre label',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Genre metadata is useful but less common than title/author lookup.',
    },
    {
      name: 'kind',
      flag: '--kind <text>',
      description: 'Filter by literary kind',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Kind metadata is documented and useful for Polish literature browsing.',
    },
    {
      name: 'epoch',
      flag: '--epoch <text>',
      description: 'Filter by literary epoch',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Epoch metadata is documented and useful for literature browsing.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Books to show/cache, default 100, CLI cap 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The catalog endpoint is not documented as paginated, so a client-side cap keeps output/cache bounded.',
      valueType: 'integer',
      defaultValue: '100',
    },
  ],
  paramsSchema: booksParamsSchema,
  execute: params => listWolneLekturyBooks(params),
  normalizeParams: params => booksParamsSchema.parse(params),
  resultKind: 'wolnelektury.books',
  defaultFormat: 'text',
}

const bookOperation: PublicApiOperationDefinition<WolneLekturyBookInput> = {
  id: 'wolnelektury.book',
  providerId: 'wolnelektury',
  name: 'Book',
  commandPath: ['wolnelektury', 'book'],
  rpcMethod: 'wolnelektury.book',
  description: 'Fetch one Wolne Lektury book metadata document by slug.',
  category: 'books',
  options: [
    {
      name: 'slug',
      flag: '--slug <slug>',
      description: 'Book slug, default studnia-i-wahadlo',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented book detail endpoint is slug-addressed.',
      defaultValue: 'studnia-i-wahadlo',
    },
  ],
  paramsSchema: bookParamsSchema,
  execute: params => getWolneLekturyBook(params),
  normalizeParams: params => bookParamsSchema.parse(params),
  createCacheKeyParams: params => ({ slug: params.slug ?? 'studnia-i-wahadlo' }),
  resultKind: 'wolnelektury.book',
  defaultFormat: 'text',
}

const readOperation: PublicApiOperationDefinition<WolneLekturyReadInput> = {
  id: 'wolnelektury.read',
  providerId: 'wolnelektury',
  name: 'Read',
  commandPath: ['wolnelektury', 'read'],
  rpcMethod: 'wolnelektury.read',
  description: 'Read a bounded page from the official Wolne Lektury TXT download for one public-domain book.',
  category: 'books',
  options: [
    {
      name: 'slug',
      flag: '--slug <slug>',
      description: 'Book slug, default studnia-i-wahadlo',
      exposure: 'primary',
      group: 'query',
      reason: 'The metadata API exposes official TXT download URLs by book slug.',
      defaultValue: 'studnia-i-wahadlo',
    },
    {
      name: 'offset',
      flag: '--offset <line>',
      description: 'Zero-based line offset inside the TXT file, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'TXT downloads are full files; offset simulates terminal page up/down without browser scraping.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'limit',
      flag: '--limit <lines>',
      description: 'Lines to show/cache, default 80, CLI cap 200',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Reading pages must be bounded for terminal UX and persistence size.',
      valueType: 'integer',
      defaultValue: '80',
    },
  ],
  paramsSchema: readParamsSchema,
  execute: params => readWolneLekturyBook(params),
  normalizeParams: params => readParamsSchema.parse(params),
  createCacheKeyParams: params => ({
    slug: params.slug ?? 'studnia-i-wahadlo',
    offset: params.offset ?? 0,
    limit: params.limit ?? 80,
  }),
  resultKind: 'wolnelektury.read',
  defaultFormat: 'text',
}

export const wolneLekturyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'wolnelektury',
    name: 'Wolne Lektury',
    description: 'No-auth HTTPS JSON API for Polish public-domain book catalog metadata and download links.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://wolnelektury.pl/',
    docsUrl: 'https://wolnelektury.pl/api/',
    auth: {
      mode: 'none',
      notes: ['Official API docs expose public JSON endpoints without API keys.'],
    },
    tags: ['books', 'public-domain', 'polish', 'metadata', 'no-auth'],
    freePlanNotes: [
      'Docs do not show pagination for /api/books/; CLI filters client-side and caps output/cache at 100.',
      'Book detail returns official download URLs; read operation fetches only official TXT downloads and projects bounded line pages.',
    ],
  },
  operations: [booksOperation, bookOperation, readOperation],
  endpoints: [
    {
      id: 'wolnelektury-books',
      method: 'GET',
      urlPattern: 'https://wolnelektury.pl/api/books/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Wolne Lektury book catalog metadata list.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://wolnelektury.pl/api/'],
      consumedBy: ['wolnelektury books'],
      notes: ['No authentication required; client-side filters and limit bound terminal output.'],
    },
    {
      id: 'wolnelektury-book',
      method: 'GET',
      urlPattern: 'regex:^https://wolnelektury\\.pl/api/books/[^/]+/$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Wolne Lektury book detail metadata by slug.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://wolnelektury.pl/api/'],
      consumedBy: ['wolnelektury book'],
      notes: ['No authentication required; returns metadata and official download links.'],
    },
    {
      id: 'wolnelektury-text-download',
      method: 'GET',
      urlPattern: 'regex:^https://wolnelektury\\.pl/media/book/txt/[^/]+\\.txt$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Official Wolne Lektury TXT download URL exposed by book detail metadata.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://wolnelektury.pl/api/'],
      consumedBy: ['wolnelektury read'],
      notes: ['No authentication required; fetched as text/plain and rendered as bounded terminal pages.'],
    },
  ],
}
