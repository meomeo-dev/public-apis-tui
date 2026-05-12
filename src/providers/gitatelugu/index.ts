import { z } from 'zod'
import { getGitaTeluguVerse, type GitaTeluguVerseInput } from '../../application/usecases/gitaTelugu.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const verseParamsSchema = z.object({
  language: z.string().min(1).optional(),
  chapter: z.number().int().optional(),
  verse: z.number().int().optional(),
  serial: z.number().int().optional(),
}) satisfies z.ZodType<GitaTeluguVerseInput>

const verseOperation: PublicApiOperationDefinition<GitaTeluguVerseInput> = {
  id: 'gitatelugu.verse',
  providerId: 'gita-telugu',
  name: 'Verse',
  commandPath: ['gitatelugu', 'verse'],
  rpcMethod: 'gitatelugu.verse',
  description: 'Fetch a Bhagavad Gita verse in Telugu or Odia from the no-auth FastAPI service.',
  category: 'books',
  options: [
    {
      name: 'language',
      flag: '--language <tel|odi>',
      description: 'Language code: tel or odi; default tel',
      exposure: 'primary',
      group: 'filters',
      reason: 'Primary documented language selector for the API.',
      defaultValue: 'tel',
    },
    {
      name: 'chapter',
      flag: '--chapter <number>',
      description: 'Chapter number, 1-18; default 1',
      exposure: 'primary',
      group: 'query',
      reason: 'Canonical verse lookup dimension for chapter/verse paths.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'verse',
      flag: '--verse <number>',
      description: 'Verse number within chapter, 1-78; default 1',
      exposure: 'primary',
      group: 'query',
      reason: 'Canonical verse lookup dimension for chapter/verse paths.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'serial',
      flag: '--serial <number>',
      description: 'Serial verse number, 1-700; overrides chapter/verse',
      exposure: 'advanced',
      group: 'query',
      reason: 'Documented alternate lookup path, but less common than chapter/verse browsing.',
      valueType: 'integer',
    },
  ],
  paramsSchema: verseParamsSchema,
  execute: params => getGitaTeluguVerse(params),
  normalizeParams: params => verseParamsSchema.parse(params),
  resultKind: 'gitatelugu.verse',
  defaultFormat: 'text',
}

export const gitaTeluguProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gita-telugu',
    name: 'Bhagavad Gita Telugu',
    description: 'No-auth HTTPS JSON API for Bhagavad Gita verses in Telugu and Odia.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://gita-api.vercel.app/',
    docsUrl: 'https://gita-api.vercel.app/docs',
    auth: {
      mode: 'none',
      notes: ['OpenAPI docs expose verse lookup endpoints without API keys.'],
    },
    tags: ['books', 'gita', 'telugu', 'odia', 'verses', 'no-auth'],
    freePlanNotes: [
      'Only single-verse lookup endpoints are documented; no pagination maximum applies.',
      'Language enum advertises eng/esp, but live responses report those languages are not implemented; CLI exposes tel and odi only.',
    ],
  },
  operations: [verseOperation],
  endpoints: [
    {
      id: 'gita-telugu-verse-by-chapter',
      method: 'GET',
      urlPattern: 'https://gita-api.vercel.app/*/verse/*/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Gita Telugu API chapter/verse lookup endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://gita-api.vercel.app/openapi.json'],
      consumedBy: ['gitatelugu verse'],
      notes: ['No authentication required.', 'Language path values tel and odi are live-verified.'],
    },
    {
      id: 'gita-telugu-verse-by-serial',
      method: 'GET',
      urlPattern: 'https://gita-api.vercel.app/*/verse/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Gita Telugu API serial verse lookup endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://gita-api.vercel.app/openapi.json'],
      consumedBy: ['gitatelugu verse'],
      notes: ['No authentication required.', 'Serial verse lookup returns the same verse schema.'],
    },
  ],
}

export type { GitaTeluguVerseInput } from '../../application/usecases/gitaTelugu.js'
