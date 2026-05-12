import { z } from 'zod'
import {
  ENERGI_ELSPOT_DEFAULTS,
  ENERGI_RIGHT_NOW_DEFAULTS,
  getEnergiElspotPrices,
  getEnergiRightNow,
} from '../../application/usecases/energiDataService.js'
import {
  normalizeEnergiElspotPricesInput,
  normalizeEnergiRightNowInput,
  type EnergiElspotPricesInput,
  type EnergiRightNowInput,
} from '../../infrastructure/openApis/energiDataServiceClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const rightNowParamsSchema = z.object({
  start: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<EnergiRightNowInput>

const elspotPricesParamsSchema = z.object({
  priceArea: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<EnergiElspotPricesInput>

const rightNowOperation: PublicApiOperationDefinition<EnergiRightNowInput> = {
  id: 'energidataservice.rightnow',
  providerId: 'energidataservice',
  name: 'Power System Right Now',
  commandPath: ['energidataservice', 'rightnow'],
  rpcMethod: 'energidataservice.rightnow',
  description: 'Read current Danish power-system CO2, production, wind/solar, and exchange metrics.',
  category: 'environment',
  options: [
    {
      name: 'start',
      flag: '--start <time>',
      description: `Dynamic start timestamp, default ${ENERGI_RIGHT_NOW_DEFAULTS.start}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Official best practice recommends dynamic timestamps such as now-PT15M for frequently updated datasets.',
      defaultValue: ENERGI_RIGHT_NOW_DEFAULTS.start,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Records to return, default/cap ${ENERGI_RIGHT_NOW_DEFAULTS.limit}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The API documents default limit 100 and limit=0 for all records; CLI uses bounded 100 to avoid unbounded output/cache size.',
      valueType: 'integer',
      defaultValue: String(ENERGI_RIGHT_NOW_DEFAULTS.limit),
    },
  ],
  paramsSchema: rightNowParamsSchema,
  execute: params => getEnergiRightNow(params),
  normalizeParams: params => rightNowParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEnergiRightNowInput(params),
  resultKind: 'energidataservice.rightnow',
  defaultFormat: 'text',
}

const elspotPricesOperation: PublicApiOperationDefinition<EnergiElspotPricesInput> = {
  id: 'energidataservice.elspotprices',
  providerId: 'energidataservice',
  name: 'Elspot Prices',
  commandPath: ['energidataservice', 'elspotprices'],
  rpcMethod: 'energidataservice.elspotprices',
  description: 'Read Danish electricity spot prices from the Elspotprices dataset.',
  category: 'environment',
  options: [
    {
      name: 'priceArea',
      flag: '--price-area <area>',
      description: `Price area, default ${ENERGI_ELSPOT_DEFAULTS.priceArea}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'PriceArea is the primary commercial-analysis filter for spot-price lookups.',
      defaultValue: ENERGI_ELSPOT_DEFAULTS.priceArea,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Records to return, default/cap ${ENERGI_ELSPOT_DEFAULTS.limit}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The API documents default limit 100 and limit=0 for all records; CLI uses bounded 100 to avoid unbounded output/cache size.',
      valueType: 'integer',
      defaultValue: String(ENERGI_ELSPOT_DEFAULTS.limit),
    },
    {
      name: 'start',
      flag: '--start <time>',
      description: 'Optional dataset start timestamp',
      exposure: 'advanced',
      group: 'query',
      reason: 'Time windows are useful for historical analysis but optional for latest-price workflows.',
    },
    {
      name: 'end',
      flag: '--end <time>',
      description: 'Optional dataset end timestamp',
      exposure: 'advanced',
      group: 'query',
      reason: 'End timestamps bound historical windows and avoid unbounded queries.',
    },
  ],
  paramsSchema: elspotPricesParamsSchema,
  execute: params => getEnergiElspotPrices(params),
  normalizeParams: params => elspotPricesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEnergiElspotPricesInput(params),
  resultKind: 'energidataservice.elspotprices',
  defaultFormat: 'text',
}

export const energiDataServiceProvider: PublicApiProviderModule = {
  manifest: {
    id: 'energidataservice',
    name: 'Energi Data Service',
    description: 'No-auth HTTPS JSON open-data API from Energinet for Danish electricity, CO2, production, and market datasets.',
    publicApisCategory: 'Environment',
    homepageUrl: 'https://www.energidataservice.dk/',
    docsUrl: 'https://www.energidataservice.dk/guides/api-guides',
    auth: {
      mode: 'none',
      notes: ['Dataset GET endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['energy', 'environment', 'electricity', 'co2', 'prices', 'denmark', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official guide allows free downloads and documents GET /dataset/{name}.',
      'Best practice/rate limit: maximum 1 request per unique IP address per dataset per minute.',
      'The API documents default limit 100 and limit=0 for all records; CLI intentionally caps limit at 100.',
    ],
  },
  operations: [rightNowOperation, elspotPricesOperation],
  endpoints: [
    {
      id: 'energidataservice-power-system-right-now',
      method: 'GET',
      urlPattern: 'https://api.energidataservice.dk/dataset/PowerSystemRightNow*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Energi Data Service PowerSystemRightNow dataset endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://www.energidataservice.dk/guides/api-guides',
        'https://api.energidataservice.dk/dataset/PowerSystemRightNow?start=now-PT15M&limit=5',
      ],
      consumedBy: ['energidataservice rightnow'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.', 'Respect 1 request per dataset per minute guidance.'],
    },
    {
      id: 'energidataservice-elspotprices',
      method: 'GET',
      urlPattern: 'https://api.energidataservice.dk/dataset/Elspotprices*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Energi Data Service Elspotprices dataset endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://www.energidataservice.dk/guides/api-guides',
        'https://api.energidataservice.dk/dataset/Elspotprices?filter=%7B%22PriceArea%22:%5B%22DK1%22%5D%7D&sort=HourUTC%20desc&limit=5',
      ],
      consumedBy: ['energidataservice elspotprices'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.', 'Respect 1 request per dataset per minute guidance.'],
    },
  ],
}
