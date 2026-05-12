import { z } from 'zod'
import {
  getQuranCloudAyah,
  getQuranCloudSurah,
  type QuranCloudAyahInput,
  type QuranCloudSurahInput,
} from '../../application/usecases/quranCloud.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ayahParamsSchema = z.object({
  reference: z.string().min(1).optional(),
  edition: z.string().min(1).optional(),
}) satisfies z.ZodType<QuranCloudAyahInput>

const surahParamsSchema = z.object({
  surah: z.number().int().optional(),
  edition: z.string().min(1).optional(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<QuranCloudSurahInput>

const ayahOperation: PublicApiOperationDefinition<QuranCloudAyahInput> = {
  id: 'qurancloud.ayah',
  providerId: 'qurancloud',
  name: 'Ayah',
  commandPath: ['qurancloud', 'ayah'],
  rpcMethod: 'qurancloud.ayah',
  description: 'Fetch one Quran Cloud ayah by global number or surah:ayah reference.',
  category: 'books',
  options: [
    {
      name: 'reference',
      flag: '--reference <number|surah:ayah>',
      description: 'Ayah reference, default 2:255',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented ayah endpoint is reference-addressed and this is the main lookup intent.',
      defaultValue: '2:255',
    },
    {
      name: 'edition',
      flag: '--edition <identifier>',
      description: 'Edition identifier, default en.asad',
      exposure: 'primary',
      group: 'filters',
      reason: 'Quran Cloud endpoints are edition-scoped; translations are important for readable terminal output.',
      defaultValue: 'en.asad',
    },
  ],
  paramsSchema: ayahParamsSchema,
  execute: params => getQuranCloudAyah(params),
  normalizeParams: params => ayahParamsSchema.parse(params),
  resultKind: 'qurancloud.ayah',
  defaultFormat: 'text',
}

const surahOperation: PublicApiOperationDefinition<QuranCloudSurahInput> = {
  id: 'qurancloud.surah',
  providerId: 'qurancloud',
  name: 'Surah',
  commandPath: ['qurancloud', 'surah'],
  rpcMethod: 'qurancloud.surah',
  description: 'Fetch one Quran Cloud surah with optional offset and limit.',
  category: 'books',
  options: [
    {
      name: 'surah',
      flag: '--surah <number>',
      description: 'Surah number 1-114, default 1',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented surah endpoint is number-addressed.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'edition',
      flag: '--edition <identifier>',
      description: 'Edition identifier, default en.asad',
      exposure: 'primary',
      group: 'filters',
      reason: 'Quran Cloud endpoints are edition-scoped; translations are important for readable terminal output.',
      defaultValue: 'en.asad',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Ayah offset inside the surah',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset is documented for partial surah retrieval but not needed for the default full-surah request.',
      valueType: 'integer',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Ayahs to request, default 286, CLI cap 286',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Docs expose limit; default 286 covers the longest surah in one read-only request while keeping payload bounded.',
      valueType: 'integer',
      defaultValue: '286',
    },
  ],
  paramsSchema: surahParamsSchema,
  execute: params => getQuranCloudSurah(params),
  normalizeParams: params => surahParamsSchema.parse(params),
  resultKind: 'qurancloud.surah',
  defaultFormat: 'text',
}

export const quranCloudProvider: PublicApiProviderModule = {
  manifest: {
    id: 'qurancloud',
    name: 'Quran Cloud',
    description: 'No-auth HTTPS JSON Quran API for ayah and surah retrieval across public editions.',
    publicApisCategory: 'Books',
    homepageUrl: 'https://alquran.cloud/',
    docsUrl: 'https://alquran.cloud/api',
    auth: {
      mode: 'none',
      notes: ['Official docs describe public GET JSON endpoints and do not require API keys.'],
    },
    tags: ['books', 'quran', 'religion', 'translations', 'no-auth'],
    freePlanNotes: [
      'Docs state edition is optional and defaults to quran-uthmani; CLI defaults to en.asad for readable English terminal output.',
      'Surah limit is documented without a finite maximum; CLI defaults/caps at 286, the longest surah length, for one-request full-surah retrieval.',
    ],
  },
  operations: [ayahOperation, surahOperation],
  endpoints: [
    {
      id: 'qurancloud-ayah',
      method: 'GET',
      urlPattern: 'https://api.alquran.cloud/v1/ayah/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Quran Cloud ayah lookup by global or surah:ayah reference and edition.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://alquran.cloud/api'],
      consumedBy: ['qurancloud ayah'],
      notes: ['No authentication required.'],
    },
    {
      id: 'qurancloud-surah',
      method: 'GET',
      urlPattern: 'https://api.alquran.cloud/v1/surah/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Quran Cloud surah retrieval by surah number and edition with optional offset/limit.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://alquran.cloud/api'],
      consumedBy: ['qurancloud surah'],
      notes: ['No authentication required; CLI caps limit at 286 for terminal/cache safety.'],
    },
  ],
}
