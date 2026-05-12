import { z } from 'zod'
import {
  getQuranApiChapter,
  getQuranApiVerse,
  type QuranApiChapterInput,
  type QuranApiVerseInput,
} from '../../application/usecases/quranApi.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const verseParamsSchema = z.object({
  edition: z.string().min(1).optional(),
  chapter: z.number().int().optional(),
  verse: z.number().int().optional(),
}) satisfies z.ZodType<QuranApiVerseInput>

const chapterParamsSchema = z.object({
  edition: z.string().min(1).optional(),
  chapter: z.number().int().optional(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<QuranApiChapterInput>

const verseOperation: PublicApiOperationDefinition<QuranApiVerseInput> = {
  id: 'quranapi.verse',
  providerId: 'quranapi',
  name: 'Verse',
  commandPath: ['quranapi', 'verse'],
  rpcMethod: 'quranapi.verse',
  description: 'Fetch one Quran-api CDN verse by edition, chapter, and verse number.',
  category: 'books',
  options: [
    {
      name: 'edition',
      flag: '--edition <identifier>',
      description: 'Edition identifier, default eng-ummmuhammad',
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented endpoint is edition-scoped and editions select language/translation.',
      defaultValue: 'eng-ummmuhammad',
    },
    {
      name: 'chapter',
      flag: '--chapter <number>',
      description: 'Chapter number 1-114, default 1',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented verse endpoint is chapter-addressed.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'verse',
      flag: '--verse <number>',
      description: 'Verse number, default 1',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented verse endpoint is verse-addressed.',
      valueType: 'integer',
      defaultValue: '1',
    },
  ],
  paramsSchema: verseParamsSchema,
  execute: params => getQuranApiVerse(params),
  normalizeParams: params => verseParamsSchema.parse(params),
  resultKind: 'quranapi.verse',
  defaultFormat: 'text',
}

const chapterOperation: PublicApiOperationDefinition<QuranApiChapterInput> = {
  id: 'quranapi.chapter',
  providerId: 'quranapi',
  name: 'Chapter',
  commandPath: ['quranapi', 'chapter'],
  rpcMethod: 'quranapi.chapter',
  description: 'Fetch one Quran-api CDN chapter and project bounded verses for terminal output.',
  category: 'books',
  options: [
    {
      name: 'edition',
      flag: '--edition <identifier>',
      description: 'Edition identifier, default eng-ummmuhammad',
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented endpoint is edition-scoped and editions select language/translation.',
      defaultValue: 'eng-ummmuhammad',
    },
    {
      name: 'chapter',
      flag: '--chapter <number>',
      description: 'Chapter number 1-114, default 1',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented chapter endpoint is chapter-addressed.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Verse offset inside the chapter, default 0',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'The CDN returns whole chapter files; offset provides TUI-style page navigation without exposing raw CDN complexity.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Verses to show/cache, default 286, CLI cap 286',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Chapter endpoint returns a full chapter; limit bounds terminal and cache size while covering the longest chapter by default.',
      valueType: 'integer',
      defaultValue: '286',
    },
  ],
  paramsSchema: chapterParamsSchema,
  execute: params => getQuranApiChapter(params),
  normalizeParams: params => chapterParamsSchema.parse(params),
  resultKind: 'quranapi.chapter',
  defaultFormat: 'text',
}

export const quranApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'quranapi',
    name: 'Quran-api',
    description: 'No-auth jsDelivr-hosted Quran translation JSON files from fawazahmed0/quran-api.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://github.com/fawazahmed0/quran-api',
    docsUrl: 'https://github.com/fawazahmed0/quran-api#readme',
    auth: {
      mode: 'none',
      notes: ['Official README documents public CDN GET JSON URLs without API keys.'],
    },
    tags: ['books', 'quran', 'translations', 'cdn', 'no-auth'],
    freePlanNotes: [
      'README states no rate limits and public HTTP GET JSON files over jsDelivr.',
      'Chapter output defaults/caps at 286 verses, covering the longest chapter while preserving bounded cache/output.',
    ],
  },
  operations: [verseOperation, chapterOperation],
  endpoints: [
    {
      id: 'quranapi-verse',
      method: 'GET',
      urlPattern: 'regex:^https://cdn\\.jsdelivr\\.net/gh/fawazahmed0/quran-api@1/editions/.+/[0-9]+/[0-9]+\\.json$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Quran-api CDN verse JSON file by edition, chapter, and verse.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/fawazahmed0/quran-api#readme'],
      consumedBy: ['quranapi verse'],
      notes: ['No authentication required.'],
    },
    {
      id: 'quranapi-chapter',
      method: 'GET',
      urlPattern: 'regex:^https://cdn\\.jsdelivr\\.net/gh/fawazahmed0/quran-api@1/editions/.+/[0-9]+\\.json$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Quran-api CDN chapter JSON file by edition and chapter.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/fawazahmed0/quran-api#readme'],
      consumedBy: ['quranapi chapter'],
      notes: ['No authentication required; CLI bounds chapter projection to 286 verses.'],
    },
  ],
}
