import { z } from 'zod'
import {
  RUNYANKOLE_BIBLE_DEFAULT_BOOK,
  RUNYANKOLE_BIBLE_DEFAULT_CHAPTER,
  RUNYANKOLE_BIBLE_DEFAULT_LIMIT,
  RUNYANKOLE_BIBLE_DEFAULT_QUERY,
  RUNYANKOLE_BIBLE_DEFAULT_VERSE,
  RUNYANKOLE_BIBLE_MAX_LIMIT,
  getRunyankoleBibleBooks,
  getRunyankoleBibleChapter,
  getRunyankoleBibleRandom,
  getRunyankoleBibleVerse,
  normalizeRunyankoleBibleBooksInput,
  normalizeRunyankoleBibleChapterInput,
  normalizeRunyankoleBibleRandomInput,
  normalizeRunyankoleBibleSearchInput,
  normalizeRunyankoleBibleVerseInput,
  searchRunyankoleBible,
  type RunyankoleBibleBooksInput,
  type RunyankoleBibleChapterInput,
  type RunyankoleBibleRandomInput,
  type RunyankoleBibleSearchInput,
  type RunyankoleBibleVerseInput,
} from '../../application/usecases/runyankoleBible.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const booksParamsSchema = z.object({
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<RunyankoleBibleBooksInput>

const verseParamsSchema = z.object({
  book: z.number().int().optional(),
  chapter: z.number().int().optional(),
  verse: z.number().int().optional(),
}) satisfies z.ZodType<RunyankoleBibleVerseInput>

const chapterParamsSchema = z.object({
  book: z.number().int().optional(),
  chapter: z.number().int().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<RunyankoleBibleChapterInput>

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<RunyankoleBibleSearchInput>

const randomParamsSchema = z.object({
  book: z.number().int().optional(),
}) satisfies z.ZodType<RunyankoleBibleRandomInput>

const booksOperation: PublicApiOperationDefinition<RunyankoleBibleBooksInput> = {
  id: 'runyankolebible.books',
  providerId: 'runyankolebible',
  name: 'Runyankole Bible books',
  commandPath: ['runyankolebible', 'books'],
  rpcMethod: 'runyankolebible.books',
  description: 'List the 66 Baibuli Erikwera books and numeric IDs.',
  category: 'books',
  options: paginationOptions('books', 66),
  paramsSchema: booksParamsSchema,
  execute: params => getRunyankoleBibleBooks(params),
  normalizeParams: params => booksParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRunyankoleBibleBooksInput(params),
  resultKind: 'runyankolebible.books',
  defaultFormat: 'text',
}

const verseOperation: PublicApiOperationDefinition<RunyankoleBibleVerseInput> = {
  id: 'runyankolebible.verse',
  providerId: 'runyankolebible',
  name: 'Runyankole Bible verse',
  commandPath: ['runyankolebible', 'verse'],
  rpcMethod: 'runyankolebible.verse',
  description: 'Fetch one Baibuli Erikwera verse by book, chapter, and verse.',
  category: 'books',
  options: referenceOptions(true),
  paramsSchema: verseParamsSchema,
  execute: params => getRunyankoleBibleVerse(params),
  normalizeParams: params => verseParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRunyankoleBibleVerseInput(params),
  resultKind: 'runyankolebible.verse',
  defaultFormat: 'text',
}

const chapterOperation: PublicApiOperationDefinition<RunyankoleBibleChapterInput> = {
  id: 'runyankolebible.chapter',
  providerId: 'runyankolebible',
  name: 'Runyankole Bible chapter',
  commandPath: ['runyankolebible', 'chapter'],
  rpcMethod: 'runyankolebible.chapter',
  description: 'Fetch one Baibuli Erikwera chapter with bounded verse rows.',
  category: 'books',
  options: [
    ...referenceOptions(false),
    ...paginationOptions('chapter', RUNYANKOLE_BIBLE_DEFAULT_LIMIT),
  ],
  paramsSchema: chapterParamsSchema,
  execute: params => getRunyankoleBibleChapter(params),
  normalizeParams: params => chapterParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRunyankoleBibleChapterInput(params),
  resultKind: 'runyankolebible.chapter',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<RunyankoleBibleSearchInput> = {
  id: 'runyankolebible.search',
  providerId: 'runyankolebible',
  name: 'Runyankole Bible search',
  commandPath: ['runyankolebible', 'search'],
  rpcMethod: 'runyankolebible.search',
  description: 'Search Baibuli Erikwera verses by Runyankole keyword.',
  category: 'books',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search term, default ${RUNYANKOLE_BIBLE_DEFAULT_QUERY}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented /api/search endpoint requires q text.',
      defaultValue: RUNYANKOLE_BIBLE_DEFAULT_QUERY,
    },
    ...paginationOptions('search', RUNYANKOLE_BIBLE_DEFAULT_LIMIT),
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchRunyankoleBible(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRunyankoleBibleSearchInput(params),
  resultKind: 'runyankolebible.search',
  defaultFormat: 'text',
}

const randomOperation: PublicApiOperationDefinition<RunyankoleBibleRandomInput> = {
  id: 'runyankolebible.random',
  providerId: 'runyankolebible',
  name: 'Runyankole Bible random verse',
  commandPath: ['runyankolebible', 'random'],
  rpcMethod: 'runyankolebible.random',
  description: 'Fetch one random Baibuli Erikwera verse, optionally by book.',
  category: 'books',
  options: [
    {
      name: 'book',
      flag: '--book <id>',
      description: [
        'Optional numeric book ID, default any book; Genesis is',
        `${RUNYANKOLE_BIBLE_DEFAULT_BOOK}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented /api/random endpoint accepts an optional book.',
      valueType: 'integer',
    },
  ],
  paramsSchema: randomParamsSchema,
  execute: params => getRunyankoleBibleRandom(params),
  normalizeParams: params => randomParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRunyankoleBibleRandomInput(params),
  resultKind: 'runyankolebible.random',
  defaultFormat: 'text',
}

export const runyankoleBibleProvider: PublicApiProviderModule = {
  manifest: {
    id: 'runyankolebible',
    name: 'Runyankole Bible',
    description: [
      'No-auth HTTPS JSON access to Baibuli Erikwera 1964 books, verses,',
      'chapters, keyword search, and random verses.',
    ].join(' '),
    publicApisCategory: 'Books',
    homepageUrl: 'https://runyankole-bible-api.vercel.app/',
    docsUrl: 'https://runyankole-bible-api.vercel.app/',
    auth: {
      mode: 'none',
      notes: [
        [
          'Homepage badges and live probes confirm the documented JSON',
          'endpoints require no authentication.',
        ].join(' '),
      ],
    },
    tags: ['books', 'bible', 'runyankole', 'runyankore-rukiga', 'no-auth'],
    freePlanNotes: [
      'Homepage describes free public access, no auth required, and CORS.',
      [
        'Translation is Baibuli Erikwera 1964 with attribution to The Bible',
        'Society of Uganda.',
      ].join(' '),
      [
        'CLI uses bounded result limits and excludes bulk download or',
        'undocumented route proxying.',
      ].join(' '),
    ],
  },
  operations: [
    booksOperation,
    verseOperation,
    chapterOperation,
    searchOperation,
    randomOperation,
  ],
  endpoints: [
    createEndpoint(
      'runyankolebible-books',
      'https://runyankole-bible-api.vercel.app/api/books',
      'List all 66 book IDs and Runyankole names.',
      ['public-apis apis run runyankolebible.books'],
    ),
    createEndpoint(
      'runyankolebible-verse',
      'https://runyankole-bible-api.vercel.app/api/verse?book=*&chapter=*&verse=*',
      'Fetch a single verse by numeric book, chapter, and verse.',
      ['public-apis apis run runyankolebible.verse'],
    ),
    createEndpoint(
      'runyankolebible-chapter',
      'https://runyankole-bible-api.vercel.app/api/chapter?book=*&chapter=*',
      'Fetch all verses in one chapter; CLI applies bounded display.',
      ['public-apis apis run runyankolebible.chapter'],
    ),
    createEndpoint(
      'runyankolebible-search',
      'https://runyankole-bible-api.vercel.app/api/search?q=*&limit=*&offset=*',
      'Search verses by Runyankole keyword with documented pagination.',
      ['public-apis apis run runyankolebible.search'],
    ),
    createEndpoint(
      'runyankolebible-random',
      'https://runyankole-bible-api.vercel.app/api/random*',
      'Fetch one random verse, optionally scoped to a book.',
      ['public-apis apis run runyankolebible.random'],
    ),
  ],
}

function referenceOptions(includeVerse: boolean) {
  return [
    {
      name: 'book',
      flag: '--book <id>',
      description: `Numeric book ID, default ${RUNYANKOLE_BIBLE_DEFAULT_BOOK}.`,
      exposure: 'primary' as const,
      group: 'query' as const,
      reason: 'Documented verse and chapter endpoints are book-addressed.',
      valueType: 'integer' as const,
      defaultValue: String(RUNYANKOLE_BIBLE_DEFAULT_BOOK),
    },
    {
      name: 'chapter',
      flag: '--chapter <number>',
      description: [
        'Chapter number, default',
        `${RUNYANKOLE_BIBLE_DEFAULT_CHAPTER}.`,
      ].join(' '),
      exposure: 'primary' as const,
      group: 'query' as const,
      reason: 'Documented verse and chapter endpoints are chapter-addressed.',
      valueType: 'integer' as const,
      defaultValue: String(RUNYANKOLE_BIBLE_DEFAULT_CHAPTER),
    },
    ...(includeVerse ? [{
      name: 'verse',
      flag: '--verse <number>',
      description: `Verse number, default ${RUNYANKOLE_BIBLE_DEFAULT_VERSE}.`,
      exposure: 'primary' as const,
      group: 'query' as const,
      reason: 'The documented /api/verse endpoint requires a verse number.',
      valueType: 'integer' as const,
      defaultValue: String(RUNYANKOLE_BIBLE_DEFAULT_VERSE),
    }] : []),
  ]
}

function paginationOptions(scope: string, defaultLimit: number) {
  return [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `${scope} rows to return, default ${defaultLimit}, cap`,
        `${RUNYANKOLE_BIBLE_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary' as const,
      group: 'pagination' as const,
      reason: 'Bounds terminal output and persisted payloads.',
      valueType: 'integer' as const,
      defaultValue: String(defaultLimit),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Result offset, default 0.',
      exposure: 'advanced' as const,
      group: 'pagination' as const,
      reason: 'Supports navigation without unbounded output.',
      valueType: 'integer' as const,
      defaultValue: '0',
    },
  ]
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
    sampleSources: ['https://runyankole-bible-api.vercel.app/'],
    consumedBy,
    notes: [
      'No authentication required in documentation badges and live probes.',
      [
        'Responses are JSON; homepage HTML and undocumented paths are not',
        'treated as API data.',
      ].join(' '),
      'Translation attribution: Baibuli Erikwera 1964, The Bible Society of Uganda.',
    ],
  }
}

export type {
  RunyankoleBibleBooksInput,
  RunyankoleBibleChapterInput,
  RunyankoleBibleRandomInput,
  RunyankoleBibleSearchInput,
  RunyankoleBibleVerseInput,
} from '../../application/usecases/runyankoleBible.js'
