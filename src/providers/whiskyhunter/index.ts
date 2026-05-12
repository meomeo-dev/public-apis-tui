import { z } from 'zod'
import { listWhiskyHunterDistilleries } from '../../application/usecases/whiskyHunter.js'
import {
  normalizeWhiskyHunterDistilleriesInput,
  WHISKY_HUNTER_DEFAULT_LIMIT,
  WHISKY_HUNTER_MAX_LIMIT,
  type WhiskyHunterDistilleriesInput,
} from '../../infrastructure/openApis/whiskyHunterClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const distilleriesParamsSchema = z.object({
  query: z.string().optional(),
  country: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<WhiskyHunterDistilleriesInput>

const distilleriesOperation: PublicApiOperationDefinition<WhiskyHunterDistilleriesInput> = {
  id: 'whiskyhunter.distilleries',
  providerId: 'whiskyhunter',
  name: 'Distilleries',
  commandPath: ['whiskyhunter', 'distilleries'],
  rpcMethod: 'whiskyhunter.distilleries',
  description: 'List WhiskyHunter distillery metadata from the stable no-auth JSON endpoint.',
  category: 'food-drink',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Distilleries to return, default/cap ${WHISKY_HUNTER_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint returns a finite list of 313 distilleries; defaulting to the full list uses one request efficiently.',
      valueType: 'integer',
      defaultValue: String(WHISKY_HUNTER_DEFAULT_LIMIT),
    },
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Filter returned distilleries by name or slug locally',
      exposure: 'primary',
      group: 'filters',
      reason: 'The upstream endpoint has no documented query parameter; local filtering keeps the API call stable and useful.',
    },
    {
      name: 'country',
      flag: '--country <name>',
      description: 'Filter returned distilleries by exact country locally',
      exposure: 'primary',
      group: 'filters',
      reason: 'Country is a stable upstream field and useful for whisky market analysis without extra upstream requests.',
    },
  ],
  paramsSchema: distilleriesParamsSchema,
  execute: params => listWhiskyHunterDistilleries(params),
  normalizeParams: params => distilleriesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeWhiskyHunterDistilleriesInput(params),
  resultKind: 'whiskyhunter.distilleries',
  defaultFormat: 'text',
}

export const whiskyHunterProvider: PublicApiProviderModule = {
  manifest: {
    id: 'whiskyhunter',
    name: 'WhiskyHunter',
    description: 'No-auth HTTPS JSON distillery metadata from WhiskyHunter.',
    publicApisCategory: 'Food & Drink',
    homepageUrl: 'https://whiskyhunter.net/api/',
    docsUrl: 'https://whiskyhunter.net/api/',
    auth: {
      mode: 'none',
      notes: ['The implemented distilleries_info endpoint requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['food-drink', 'whisky', 'distilleries', 'market-research', 'no-auth', 'json'],
    freePlanNotes: [
      'Only the stable no-auth distilleries_info JSON endpoint is implemented.',
      'Auction/item routes were probed but returned HTML 404 for guessed routes, so they are excluded until documented repeatable JSON endpoints are verified.',
      `Distilleries default/cap ${WHISKY_HUNTER_MAX_LIMIT} covers the full live list observed 2026-05-04.`,
    ],
  },
  operations: [distilleriesOperation],
  endpoints: [
    {
      id: 'whiskyhunter-distilleries-info',
      method: 'GET',
      urlPattern: 'https://whiskyhunter.net/api/distilleries_info/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'WhiskyHunter distillery metadata endpoint returning name, slug, and country JSON array.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://whiskyhunter.net/api/', 'https://whiskyhunter.net/api/distilleries_info/'],
      consumedBy: ['whiskyhunter distilleries'],
      notes: ['No authentication required.', 'Other guessed auction/item routes returned HTML 404 and are not consumed.'],
    },
  ],
}
