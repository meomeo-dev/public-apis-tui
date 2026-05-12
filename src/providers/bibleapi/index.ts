import { z } from 'zod'
import {
  getBibleApiPassage,
  getBibleApiRandom,
  type BibleApiPassageInput,
  type BibleApiRandomInput,
} from '../../application/usecases/bibleApi.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const passageParamsSchema = z.object({
  reference: z.string().min(1).optional(),
  translation: z.string().min(1).optional(),
  maxVerses: z.number().int().optional(),
}) satisfies z.ZodType<BibleApiPassageInput>

const randomParamsSchema = z.object({
  translation: z.string().min(1).optional(),
  book: z.string().min(1).optional(),
  chapter: z.number().int().optional(),
}) satisfies z.ZodType<BibleApiRandomInput>

const passageOperation: PublicApiOperationDefinition<BibleApiPassageInput> = {
  id: 'bibleapi.passage',
  providerId: 'bible-api',
  name: 'Passage',
  commandPath: ['bibleapi', 'passage'],
  rpcMethod: 'bibleapi.passage',
  description: 'Fetch one Bible passage by reference from bible-api.com.',
  category: 'books',
  options: [
    {
      name: 'reference',
      flag: '--reference <ref>',
      description: 'Bible reference, default John 3:16',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented passage endpoint is reference-addressed and this is the main user intent.',
      defaultValue: 'John 3:16',
    },
    {
      name: 'translation',
      flag: '--translation <id>',
      description: 'Translation id, default web',
      exposure: 'primary',
      group: 'filters',
      reason: 'Bible-api supports multiple documented translations via a query parameter.',
      defaultValue: 'web',
    },
    {
      name: 'maxVerses',
      flag: '--max-verses <count>',
      description: 'Maximum verse rows to show/cache from the passage, default 30, cap 100',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'References can span many verses; limiting keeps readable TUI and persisted payloads bounded.',
      valueType: 'integer',
      defaultValue: '30',
    },
  ],
  paramsSchema: passageParamsSchema,
  execute: params => getBibleApiPassage(params),
  normalizeParams: params => passageParamsSchema.parse(params),
  resultKind: 'bibleapi.passage',
  defaultFormat: 'text',
}

const randomOperation: PublicApiOperationDefinition<BibleApiRandomInput> = {
  id: 'bibleapi.random',
  providerId: 'bible-api',
  name: 'Random verse',
  commandPath: ['bibleapi', 'random'],
  rpcMethod: 'bibleapi.random',
  description: 'Fetch one random verse, optionally constrained by translation/book/chapter.',
  category: 'books',
  options: [
    {
      name: 'translation',
      flag: '--translation <id>',
      description: 'Translation id, default web',
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented random endpoint is translation-scoped.',
      defaultValue: 'web',
    },
    {
      name: 'book',
      flag: '--book <osis>',
      description: 'Optional book id such as JHN, GEN, or 1CO',
      exposure: 'primary',
      group: 'filters',
      reason: 'Book filtering is documented and useful for terminal exploration.',
    },
    {
      name: 'chapter',
      flag: '--chapter <number>',
      description: 'Optional chapter number; requires --book',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Chapter filtering is documented but only valid with a book, so it is secondary UX.',
      valueType: 'integer',
    },
  ],
  paramsSchema: randomParamsSchema,
  execute: params => getBibleApiRandom(params),
  normalizeParams: params => randomParamsSchema.parse(params),
  resultKind: 'bibleapi.random',
  defaultFormat: 'text',
}

export const bibleApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'bible-api',
    name: 'Bible-api',
    description: 'No-auth HTTPS JSON Bible passage and random verse API with multiple public-domain translations.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://bible-api.com/',
    docsUrl: 'https://bible-api.com/',
    auth: {
      mode: 'none',
      notes: ['Docs state no authentication is required.'],
    },
    tags: ['books', 'bible', 'verses', 'translations', 'no-auth'],
    freePlanNotes: [
      'Docs state a rate limit of 15 requests per 30 seconds per IP.',
      'Passage endpoint returns the requested reference; CLI defaults --max-verses to 30 and caps at 100 for terminal/cache safety.',
      'Random endpoint returns a single verse; no pagination maximum applies.',
    ],
  },
  operations: [passageOperation, randomOperation],
  endpoints: [
    {
      id: 'bible-api-passage',
      method: 'GET',
      urlPattern: 'https://bible-api.com/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Bible-api passage lookup by reference with optional translation query.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://bible-api.com/'],
      consumedBy: ['bibleapi passage'],
      notes: ['No authentication required.', 'Rate limit is documented as 15 requests per 30 seconds per IP.'],
    },
    {
      id: 'bible-api-random',
      method: 'GET',
      urlPattern: 'https://bible-api.com/data/*/random*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Bible-api random verse endpoint scoped by translation and optionally by book/chapter.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://bible-api.com/'],
      consumedBy: ['bibleapi random'],
      notes: ['No authentication required.', 'Returns one random verse.'],
    },
  ],
}

export type { BibleApiPassageInput, BibleApiRandomInput } from '../../application/usecases/bibleApi.js'
