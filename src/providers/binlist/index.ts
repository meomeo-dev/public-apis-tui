import { z } from 'zod'
import { lookupBinlist } from '../../application/usecases/binlist.js'
import { BINLIST_DEFAULT_BIN, normalizeBinlistLookupInput, type BinlistLookupInput } from '../../infrastructure/openApis/binlistClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  bin: z.string().optional(),
}) satisfies z.ZodType<BinlistLookupInput>

const lookupOperation: PublicApiOperationDefinition<BinlistLookupInput> = {
  id: 'binlist.lookup',
  providerId: 'binlist',
  name: 'BIN/IIN Lookup',
  commandPath: ['binlist', 'lookup'],
  rpcMethod: 'binlist.lookup',
  description: 'Look up card BIN/IIN metadata using the no-auth Binlist API.',
  category: 'finance',
  options: [
    {
      name: 'bin',
      flag: '--bin <digits>',
      description: `BIN/IIN digits to look up, default ${BINLIST_DEFAULT_BIN}`,
      exposure: 'primary',
      group: 'query',
      reason: 'BIN/IIN is the only useful documented lookup parameter for the no-auth endpoint.',
      defaultValue: BINLIST_DEFAULT_BIN,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupBinlist(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBinlistLookupInput(params),
  resultKind: 'binlist.lookup',
  defaultFormat: 'text',
}

export const binlistProvider: PublicApiProviderModule = {
  manifest: {
    id: 'binlist',
    name: 'Binlist',
    description: 'No-auth HTTPS JSON API for public BIN/IIN card metadata lookup.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://binlist.net/',
    docsUrl: 'https://binlist.net/',
    auth: {
      mode: 'none',
      notes: ['Lookup endpoint requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['finance', 'cards', 'bin', 'iin', 'banking', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs state anonymous clients are throttled at 5 requests per hour with a burst allowance of 5.',
      'Live e2e uses one online request followed by offline JSON/text replay to conserve quota.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'binlist-lookup',
      method: 'GET',
      urlPattern: 'https://lookup.binlist.net/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Binlist no-auth BIN/IIN lookup endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://binlist.net/', 'https://lookup.binlist.net/45717360'],
      consumedBy: ['binlist lookup'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.', 'Anonymous clients are limited to 5 requests per hour.'],
    },
  ],
}
