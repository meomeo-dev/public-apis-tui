import { z } from 'zod'
import {
  getNekosBestRandom,
  searchNekosBest,
  type NekosBestRandomInput,
  type NekosBestSearchInput,
} from '../../application/usecases/nekosBest.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const randomParamsSchema = z.object({
  category: z.string().min(1).optional(),
  amount: z.number().int().optional(),
}) satisfies z.ZodType<NekosBestRandomInput>

const searchParamsSchema = z.object({
  query: z.string().min(1),
  type: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  amount: z.number().int().optional(),
}) satisfies z.ZodType<NekosBestSearchInput>

const randomOperation: PublicApiOperationDefinition<NekosBestRandomInput> = {
  id: 'nekosbest.random',
  providerId: 'nekosbest',
  name: 'Random category assets',
  commandPath: ['nekosbest', 'random'],
  rpcMethod: 'nekosbest.random',
  description: 'Fetch random NekosBest assets from one documented category.',
  category: 'anime',
  options: [
    {
      name: 'category',
      flag: '--category <name>',
      description: 'Documented category such as neko, waifu, hug, pat, or smile',
      exposure: 'primary',
      group: 'filters',
      reason: 'Category is the primary interaction axis for NekosBest random assets.',
      defaultValue: 'neko',
    },
    {
      name: 'amount',
      flag: '--amount <count>',
      description: 'Number of assets to request, 1-20',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Controls response size and defaults to the documented maximum to conserve request quotas.',
      valueType: 'integer',
      defaultValue: '20',
    },
  ],
  paramsSchema: randomParamsSchema,
  execute: params => getNekosBestRandom(params),
  normalizeParams: params => randomParamsSchema.parse(params),
  resultKind: 'nekosbest.random',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<NekosBestSearchInput> = {
  id: 'nekosbest.search',
  providerId: 'nekosbest',
  name: 'Search assets',
  commandPath: ['nekosbest', 'search'],
  rpcMethod: 'nekosbest.search',
  description: 'Search NekosBest images or GIFs by metadata query.',
  category: 'anime',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Search phrase for image artists/sources or GIF anime metadata',
      exposure: 'primary',
      group: 'query',
      reason: 'Required documented search phrase and the core user intent.',
    },
    {
      name: 'type',
      flag: '--type <image|gif>',
      description: 'Search content type: image maps to documented type=1, gif maps to type=2',
      exposure: 'primary',
      group: 'filters',
      reason: 'Official /search requires type, so expose a human-readable curated enum.',
      defaultValue: 'image',
    },
    {
      name: 'category',
      flag: '--category <name>',
      description: 'Optional documented category restriction such as neko, waifu, hug, or pat',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful for narrowing search while not required for first-run search.',
    },
    {
      name: 'amount',
      flag: '--amount <count>',
      description: 'Number of assets to request, 1-20',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Controls response size and defaults to the documented maximum to conserve request quotas.',
      valueType: 'integer',
      defaultValue: '20',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchNekosBest(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  resultKind: 'nekosbest.search',
  defaultFormat: 'text',
}

export const nekosBestProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nekosbest',
    name: 'NekosBest',
    description: 'No-auth HTTPS JSON API for neko images and anime roleplaying GIFs.',
    publicApisCategory: 'Anime',
    homepageUrl: 'https://nekos.best',
    docsUrl: 'https://docs.nekos.best',
    auth: {
      mode: 'none',
      notes: ['Official docs describe public HTTPS JSON endpoints with no API key, OAuth, account, or session requirement.'],
    },
    tags: ['anime', 'images', 'gifs', 'no-auth'],
    freePlanNotes: [
      'Official docs require a non-generic User-Agent header.',
      'Official docs state category endpoints are limited to 200 requests/minute and /search is limited to 7 requests/5 seconds.',
      'Official docs state amount supports 1 through 20; CLI defaults to 20 to use the documented maximum per request.',
    ],
  },
  operations: [randomOperation, searchOperation],
  endpoints: [
    {
      id: 'nekosbest-random-category',
      method: 'GET',
      urlPattern: 'regex:^https://nekos\\.best/api/v2/(?!search(?:\\?|$))[a-z]+(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NekosBest category endpoint returning random images or GIFs with metadata.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://docs.nekos.best/getting-started/api-endpoints.html'],
      consumedBy: ['nekosbest random'],
      notes: ['No authentication required.', 'amount supports 1 through 20; User-Agent is required by docs.'],
    },
    {
      id: 'nekosbest-search',
      method: 'GET',
      urlPattern: 'https://nekos.best/api/v2/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NekosBest search endpoint for image or GIF metadata results.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://docs.nekos.best/getting-started/api-endpoints.html'],
      consumedBy: ['nekosbest search'],
      notes: ['No authentication required.', 'type=1 searches images and type=2 searches GIFs.'],
    },
  ],
}
