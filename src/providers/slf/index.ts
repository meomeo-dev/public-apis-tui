import { z } from 'zod'
import { lookupSlf, type SlfLookupInput } from '../../application/usecases/slf.js'
import {
  SLF_DATA_URL,
  SLF_DEFAULT_CATEGORY,
  SLF_DEFAULT_LETTER,
  SLF_DEFAULT_LIMIT,
  SLF_DOCS_URL,
  SLF_MAX_LIMIT,
  normalizeSlfLookupInput,
} from '../../infrastructure/openApis/slfClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  letter: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<SlfLookupInput>

const lookupOperation: PublicApiOperationDefinition<SlfLookupInput> = {
  id: 'slf.lookup',
  providerId: 'slf',
  name: 'Lookup',
  commandPath: ['slf', 'lookup'],
  rpcMethod: 'slf.lookup',
  description: 'Lookup bounded Stadt-Land-Fluss word-list values by letter and category from the no-auth static JSON API.',
  category: 'geocoding',
  options: [
    {
      name: 'letter',
      flag: '--letter <letter>',
      description: `Single letter to read, default ${SLF_DEFAULT_LETTER}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The static JSON is keyed by one lowercase letter.',
      defaultValue: SLF_DEFAULT_LETTER,
    },
    {
      name: 'category',
      flag: '--category <name>',
      description: `Category to read, default ${SLF_DEFAULT_CATEGORY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'The documented dataset groups each letter by Stadt-Land-Fluss categories.',
      defaultValue: SLF_DEFAULT_CATEGORY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Values to show, default ${String(SLF_DEFAULT_LIMIT)}, max ${String(SLF_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI intentionally bounds static list output and persisted payload size.',
      valueType: 'integer',
      defaultValue: String(SLF_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupSlf(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeSlfLookupInput(params),
  resultKind: 'slf.lookup',
  defaultFormat: 'text',
}

export const slfProvider: PublicApiProviderModule = {
  manifest: {
    id: 'slf',
    name: 'SLF',
    description: 'No-auth HTTPS static JSON word-list data for Stadt-Land-Fluss categories.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://slftool.github.io/',
    docsUrl: SLF_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['The documented data.json endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'word-list', 'german', 'stadt-land-fluss', 'json', 'no-auth'],
    freePlanNotes: [
      'Static game helper data only; not authoritative geographic, demographic, or identity reference data.',
      'CLI exposes bounded per-letter and per-category lookup instead of dumping the full JSON dataset.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'slf-data-json',
      method: 'GET',
      urlPattern: SLF_DATA_URL,
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'SLF static Stadt-Land-Fluss JSON data endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [SLF_DOCS_URL, SLF_DATA_URL],
      consumedBy: ['public-apis apis run slf.lookup'],
      notes: ['No authentication required.', 'CORS allows public static JSON reads.', 'CLI caps returned values and does not expose raw full dataset dumps.'],
    },
  ],
}

export type { SlfLookupInput } from '../../application/usecases/slf.js'
