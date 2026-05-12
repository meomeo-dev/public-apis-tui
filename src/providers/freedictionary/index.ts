import { z } from 'zod'
import { defineFreeDictionary, type FreeDictionaryDefineInput } from '../../application/usecases/freeDictionary.js'
import { normalizeFreeDictionaryDefineInput } from '../../infrastructure/openApis/freeDictionaryClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const defineParamsSchema = z.object({
  word: z.string().optional(),
  language: z.string().optional(),
  definitionLimit: z.number().int().optional(),
}) satisfies z.ZodType<FreeDictionaryDefineInput>

const defineOperation: PublicApiOperationDefinition<FreeDictionaryDefineInput> = {
  id: 'freedictionary.define',
  providerId: 'free-dictionary',
  name: 'Define Word',
  commandPath: ['freedictionary', 'define'],
  rpcMethod: 'freedictionary.define',
  description: 'Fetch definitions, phonetics, examples, synonyms, and antonyms from Free Dictionary.',
  category: 'dictionaries',
  options: [
    {
      name: 'word',
      flag: '--word <word>',
      description: 'Word to define, default hello',
      exposure: 'primary',
      group: 'query',
      reason: 'The endpoint is addressed by language and word; word is the primary dictionary lookup input.',
      defaultValue: 'hello',
    },
    {
      name: 'language',
      flag: '--language <code>',
      description: 'Language code, default en',
      exposure: 'primary',
      group: 'filters',
      reason: 'Language is part of the documented URL path and changes the dictionary corpus.',
      defaultValue: 'en',
    },
    {
      name: 'definitionLimit',
      flag: '--definition-limit <count>',
      description: 'Definitions to show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Dictionary entries can contain many definitions; a bounded projection keeps TUI/cache output readable.',
      valueType: 'integer',
      defaultValue: '10',
    },
  ],
  paramsSchema: defineParamsSchema,
  execute: params => defineFreeDictionary(params),
  normalizeParams: params => defineParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFreeDictionaryDefineInput(params),
  resultKind: 'freedictionary.define',
  defaultFormat: 'text',
}

export const freeDictionaryProvider: PublicApiProviderModule = {
  manifest: {
    id: 'free-dictionary',
    name: 'Free Dictionary',
    description: 'No-auth HTTPS JSON dictionary API for definitions, phonetics, examples, synonyms, and antonyms.',
    publicApisCategory: 'Dictionaries',
    homepageUrl: 'https://dictionaryapi.dev/',
    docsUrl: 'https://dictionaryapi.dev/',
    auth: {
      mode: 'none',
      notes: ['Official docs show public GET /api/v2/entries/{language}/{word} without API keys.'],
    },
    tags: ['dictionary', 'definitions', 'phonetics', 'synonyms', 'antonyms', 'no-auth', 'json'],
    freePlanNotes: [
      'Live responses expose x-ratelimit headers; no API key is required for lookup.',
      'This provider caps rendered/persisted definitions with --definition-limit to keep output bounded.',
    ],
  },
  operations: [defineOperation],
  endpoints: [
    {
      id: 'free-dictionary-entries',
      method: 'GET',
      urlPattern: 'https://api.dictionaryapi.dev/api/v2/entries/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Free Dictionary word entries endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://dictionaryapi.dev/',
        'https://api.dictionaryapi.dev/api/v2/entries/en/hello',
      ],
      consumedBy: ['freedictionary define'],
      notes: ['No authentication required; no browser clickstream or scraping required.', 'Live responses include x-ratelimit headers.'],
    },
  ],
}
