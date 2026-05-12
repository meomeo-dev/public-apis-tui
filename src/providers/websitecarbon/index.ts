import { z } from 'zod'
import { calculateWebsiteCarbonData } from '../../application/usecases/websiteCarbon.js'
import {
  WEBSITE_CARBON_DEFAULT_BYTES,
  WEBSITE_CARBON_DEFAULT_GREEN,
  WEBSITE_CARBON_MAX_BYTES,
  normalizeWebsiteCarbonDataInput,
  type WebsiteCarbonDataInput,
} from '../../infrastructure/openApis/websiteCarbonClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const booleanStringSchema = z.union([
  z.boolean(),
  z.string().transform(value => {
    if (/^(?:1|true|yes)$/iu.test(value)) {
      return true
    }
    if (/^(?:0|false|no)$/iu.test(value)) {
      return false
    }
    throw new Error('--green must be true or false.')
  }),
])

const dataParamsSchema = z.object({
  bytes: z.coerce.number().optional(),
  green: booleanStringSchema.optional(),
  legacy: z.coerce.number()
    .transform(value => value as 2 | 3)
    .optional(),
}) satisfies z.ZodType<WebsiteCarbonDataInput>

const dataOperation: PublicApiOperationDefinition<WebsiteCarbonDataInput> = {
  id: 'websitecarbon.data',
  providerId: 'websitecarbon',
  name: 'Page Data Carbon Estimate',
  commandPath: ['websitecarbon', 'data'],
  rpcMethod: 'websitecarbon.data',
  description: 'Estimate page-load carbon emissions from transferred bytes and green-hosting status.',
  category: 'environment',
  options: [
    {
      name: 'bytes',
      flag: '--bytes <count>',
      description: `Transferred page bytes, default ${WEBSITE_CARBON_DEFAULT_BYTES}, cap ${WEBSITE_CARBON_MAX_BYTES}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The official public /data endpoint requires manually supplied bytes because public URL testing is no longer offered.',
      valueType: 'integer',
      defaultValue: String(WEBSITE_CARBON_DEFAULT_BYTES),
    },
    {
      name: 'green',
      flag: '--green <true|false>',
      description: `Whether the page uses green hosting, default ${WEBSITE_CARBON_DEFAULT_GREEN}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The official public /data endpoint requires green-hosting status as 1 or 0.',
      valueType: 'boolean',
      defaultValue: String(WEBSITE_CARBON_DEFAULT_GREEN),
    },
    {
      name: 'legacy',
      flag: '--legacy <2|3>',
      description: 'Optional legacy statistics methodology selector',
      exposure: 'advanced',
      group: 'query',
      reason: 'Official docs expose legacy=2 or legacy=3 only for statistics comparison, so it is advanced rather than primary.',
      valueType: 'integer',
    },
  ],
  paramsSchema: dataParamsSchema,
  execute: params => calculateWebsiteCarbonData(params),
  normalizeParams: params => normalizeWebsiteCarbonDataInput(dataParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeWebsiteCarbonDataInput(params),
  resultKind: 'websitecarbon.data',
  defaultFormat: 'text',
}

export const websiteCarbonProvider: PublicApiProviderModule = {
  manifest: {
    id: 'websitecarbon',
    name: 'Website Carbon',
    description: 'No-auth HTTPS JSON API for calculating Website Carbon emissions from bytes and green-hosting status.',
    publicApisCategory: 'Environment',
    homepageUrl: 'https://api.websitecarbon.com/',
    docsUrl: 'https://api.websitecarbon.com/',
    auth: {
      mode: 'none',
      notes: ['The public /data endpoint requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['environment', 'carbon', 'website', 'sustainability', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs state /data is the only endpoint offered for public access.',
      'Official docs state /site public access ended on 2025-07-14, so URL testing is intentionally not implemented.',
      'Response structure may change without guaranteed support according to the API page.',
    ],
  },
  operations: [dataOperation],
  endpoints: [
    {
      id: 'websitecarbon-data',
      method: 'GET',
      urlPattern: 'https://api.websitecarbon.com/data*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Website Carbon public /data emissions calculation endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.websitecarbon.com/', 'https://api.websitecarbon.com/data?bytes=1000000&green=1'],
      consumedBy: ['websitecarbon data'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.', 'The /site endpoint is no longer publicly offered.'],
    },
  ],
}
