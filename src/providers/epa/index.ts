import { z } from 'zod'
import { getEpaUvDaily, getEpaUvHourly } from '../../application/usecases/epa.js'
import {
  EPA_DEFAULT_HOURLY_LIMIT,
  EPA_DEFAULT_ZIP,
  normalizeEpaUvDailyInput,
  normalizeEpaUvHourlyInput,
  type EpaUvDailyInput,
  type EpaUvHourlyInput,
} from '../../infrastructure/openApis/epaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const hourlyParamsSchema = z.object({
  zip: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<EpaUvHourlyInput>

const dailyParamsSchema = z.object({
  zip: z.string().optional(),
}) satisfies z.ZodType<EpaUvDailyInput>

const hourlyOperation: PublicApiOperationDefinition<EpaUvHourlyInput> = {
  id: 'epa.uvHourly',
  providerId: 'epa',
  name: 'UV Hourly',
  commandPath: ['epa', 'uv-hourly'],
  rpcMethod: 'epa.uvHourly',
  description: 'Read EPA hourly UV Index forecasts by US ZIP Code.',
  category: 'government',
  options: [
    {
      name: 'zip',
      flag: '--zip <code>',
      description: `US ZIP Code, default ${EPA_DEFAULT_ZIP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented EPA UV hourly endpoint is keyed by ZIP Code and does not require auth.',
      defaultValue: EPA_DEFAULT_ZIP,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Hourly rows to show/cache, default/cap ${EPA_DEFAULT_HOURLY_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The live EPA ZIP hourly response returns 21 forecast rows; defaulting to 21 captures the complete response.',
      valueType: 'integer',
      defaultValue: String(EPA_DEFAULT_HOURLY_LIMIT),
    },
  ],
  paramsSchema: hourlyParamsSchema,
  execute: params => getEpaUvHourly(params),
  normalizeParams: params => hourlyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEpaUvHourlyInput(params),
  resultKind: 'epa.uvHourly',
  defaultFormat: 'text',
}

const dailyOperation: PublicApiOperationDefinition<EpaUvDailyInput> = {
  id: 'epa.uvDaily',
  providerId: 'epa',
  name: 'UV Daily',
  commandPath: ['epa', 'uv-daily'],
  rpcMethod: 'epa.uvDaily',
  description: 'Read EPA daily UV Index and UV alert forecasts by US ZIP Code.',
  category: 'government',
  options: [
    {
      name: 'zip',
      flag: '--zip <code>',
      description: `US ZIP Code, default ${EPA_DEFAULT_ZIP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented EPA UV daily endpoint is keyed by ZIP Code and does not require auth.',
      defaultValue: EPA_DEFAULT_ZIP,
    },
  ],
  paramsSchema: dailyParamsSchema,
  execute: params => getEpaUvDaily(params),
  normalizeParams: params => dailyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEpaUvDailyInput(params),
  resultKind: 'epa.uvDaily',
  defaultFormat: 'text',
}

export const epaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'epa',
    name: 'EPA',
    description: 'No-auth EPA DMAP-EF RESTful Data Service UV Index forecast integration.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://www.epa.gov/developers/data-data-products#apis',
    docsUrl: 'https://www.epa.gov/enviro/web-services',
    auth: {
      mode: 'none',
      notes: ['Implemented EPA DMAP-EF UV Index GET JSON endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'epa', 'uv-index', 'environment', 'health', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'The EPA developer page links to Envirofacts/DMAP-EF web services; the implemented UV Index endpoints are public GET JSON calls.',
      'Hourly forecasts default/cap at 21 rows to capture the observed complete ZIP forecast response in one bounded request.',
    ],
  },
  operations: [hourlyOperation, dailyOperation],
  endpoints: [
    {
      id: 'epa-dmap-uv-hourly-zip',
      method: 'GET',
      urlPattern: 'https://data.epa.gov/dmapservice/getEnvirofactsUVHOURLY/ZIP/*/JSON',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'EPA DMAP-EF hourly UV Index forecast by ZIP Code.',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.epa.gov/enviro/web-services', 'https://data.epa.gov/dmapservice/getEnvirofactsUVHOURLY/ZIP/20050/JSON'],
      consumedBy: ['public-apis apis run epa.uvHourly'],
      notes: ['No API key observed. HEAD may return provider errors; implementation uses documented GET JSON request.'],
    },
    {
      id: 'epa-dmap-uv-daily-zip',
      method: 'GET',
      urlPattern: 'https://data.epa.gov/dmapservice/getEnvirofactsUVDAILY/ZIP/*/JSON',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'EPA DMAP-EF daily UV Index and alert forecast by ZIP Code.',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.epa.gov/enviro/web-services', 'https://data.epa.gov/dmapservice/getEnvirofactsUVDAILY/ZIP/20050/JSON'],
      consumedBy: ['public-apis apis run epa.uvDaily'],
      notes: ['No API key observed.'],
    },
  ],
}
