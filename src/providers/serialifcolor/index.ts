import { z } from 'zod'
import { lookupSerialifColor, type SerialifColorInput } from '../../application/usecases/serialifColor.js'
import {
  SERIALIF_COLOR_DEFAULT_COLOR,
  normalizeSerialifColorInput,
} from '../../infrastructure/openApis/serialifColorClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  color: z.string().optional(),
}) satisfies z.ZodType<SerialifColorInput>

const lookupOperation: PublicApiOperationDefinition<SerialifColorInput> = {
  id: 'serialifcolor.lookup',
  providerId: 'serialifcolor',
  name: 'Color Lookup',
  commandPath: ['serialifcolor', 'lookup'],
  rpcMethod: 'serialifcolor.lookup',
  description: 'Convert a CSS keyword or hex color and show complementary, grayscale, and contrasted text colors.',
  category: 'development',
  options: [
    {
      name: 'color',
      flag: '--color <keyword-or-hex>',
      description: `CSS color keyword or hex value, default ${SERIALIF_COLOR_DEFAULT_COLOR}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The color token is the only required upstream path parameter and defines every derived color.',
      defaultValue: SERIALIF_COLOR_DEFAULT_COLOR,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupSerialifColor(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeSerialifColorInput(params),
  resultKind: 'serialifcolor.lookup',
  defaultFormat: 'text',
}

export const serialifColorProvider: PublicApiProviderModule = {
  manifest: {
    id: 'serialifcolor',
    name: 'Serialif Color',
    description: 'No-auth HTTPS JSON API for color conversion, complementary colors, grayscale, and contrasted text colors.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://color.serialif.com/',
    docsUrl: 'https://color.serialif.com/',
    auth: {
      mode: 'none',
      notes: ['Color path endpoints are reachable without API keys, OAuth, cookies, browser sessions, or scraping.'],
    },
    tags: ['development', 'color', 'conversion', 'contrast', 'json', 'no-auth'],
    freePlanNotes: [
      'No public API key requirement or quota header was observed for color path lookups.',
      'Root query-string variants returned HTML and are intentionally not used; CLI consumes only /{color} JSON responses.',
      'CLI accepts CSS color keywords plus 3/4/6/8-digit hex values and strips a leading # locally.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'serialifcolor-lookup',
      method: 'GET',
      urlPattern: 'https://color.serialif.com/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Serialif Color path endpoint returning base, complementary, grayscale, and contrast JSON objects.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://color.serialif.com/', 'https://color.serialif.com/aquamarine', 'https://color.serialif.com/55667788'],
      consumedBy: ['serialifcolor lookup'],
      notes: ['No authentication required.', 'Root query-string variants return HTML and are not consumed.', 'Invalid color paths return JSON status=error payloads.'],
    },
  ],
}

export type { SerialifColorInput } from '../../application/usecases/serialifColor.js'
