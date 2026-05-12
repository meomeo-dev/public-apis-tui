import { z } from 'zod'
import { getGruenstromIndexForecast } from '../../application/usecases/gruenstromindex.js'
import {
  GRUENSTROMINDEX_DEFAULT_LIMIT,
  GRUENSTROMINDEX_DEFAULT_ZIP,
  GRUENSTROMINDEX_MAX_LIMIT,
  normalizeGruenstromIndexForecastInput,
  type GruenstromIndexForecastInput,
} from '../../infrastructure/openApis/gruenstromindexClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const forecastParamsSchema = z.object({
  zip: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<GruenstromIndexForecastInput>

const forecastOperation: PublicApiOperationDefinition<GruenstromIndexForecastInput> = {
  id: 'gruenstromindex.forecast',
  providerId: 'gruenstromindex',
  name: 'Forecast',
  commandPath: ['gruenstromindex', 'forecast'],
  rpcMethod: 'gruenstromindex.forecast',
  description: 'Fetch GrünstromIndex green-power forecast for one German postal code.',
  category: 'environment',
  options: [
    {
      name: 'zip',
      flag: '--zip <code>',
      description: `German postal code, default ${GRUENSTROMINDEX_DEFAULT_ZIP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented/live endpoint returns a forecast for one postal code per request.',
      defaultValue: GRUENSTROMINDEX_DEFAULT_ZIP,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Forecast rows to show/cache, default/cap ${GRUENSTROMINDEX_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The free anonymous response currently returns up to 98 hourly entries; default uses the observed maximum to maximize each limited request.',
      valueType: 'integer',
      defaultValue: String(GRUENSTROMINDEX_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: forecastParamsSchema,
  execute: params => getGruenstromIndexForecast(params),
  normalizeParams: params => forecastParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGruenstromIndexForecastInput(params),
  resultKind: 'gruenstromindex.forecast',
  defaultFormat: 'text',
}

export const gruenstromIndexProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gruenstromindex',
    name: 'GrünstromIndex',
    description: 'No-auth Corrently green-power forecast API for German postal codes.',
    publicApisCategory: 'Environment',
    homepageUrl: 'https://gruenstromindex.de/',
    docsUrl: 'https://corrently.io/books/grunstromindex/page/technische-dokumentation-apisdk',
    auth: {
      mode: 'none',
      notes: ['Anonymous HTTPS JSON forecast endpoint works without API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['environment', 'energy', 'forecast', 'germany', 'no-auth', 'json'],
    freePlanNotes: [
      'Corrently documentation describes GrünstromIndex as a REST API with OpenAPI 3.0 specification.',
      `Live anonymous response returns up to ${GRUENSTROMINDEX_MAX_LIMIT} forecast rows for one postal code; CLI default uses that maximum.`,
    ],
  },
  operations: [forecastOperation],
  endpoints: [
    {
      id: 'gruenstromindex-gsi-prediction',
      method: 'GET',
      urlPattern: 'https://api.corrently.io/v2.0/gsi/prediction*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Corrently GrünstromIndex forecast endpoint for one German postal code.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://corrently.io/books/grunstromindex/page/technische-dokumentation-apisdk',
        'https://api.corrently.io/v2.0/gsi/prediction?zip=69168',
      ],
      consumedBy: ['gruenstromindex forecast'],
      notes: ['No API key required for anonymous access.', 'Live response includes provisioning/fair-use metadata and up to 98 forecast rows.'],
    },
  ],
}
