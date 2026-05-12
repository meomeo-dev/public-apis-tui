import { z } from 'zod'
import { listColoradoBusinessEntities, listColoradoDataDatasets } from '../../application/usecases/coloradoData.js'
import {
  COLORADO_DATA_DEFAULT_DATASET_LIMIT,
  COLORADO_DATA_DEFAULT_DATASET_QUERY,
  COLORADO_DATA_DEFAULT_ENTITY_LIMIT,
  COLORADO_DATA_DEFAULT_ENTITY_STATUS,
  normalizeColoradoDataBusinessEntitiesInput,
  normalizeColoradoDataDatasetsInput,
  type ColoradoDataBusinessEntitiesInput,
  type ColoradoDataDatasetsInput,
} from '../../infrastructure/openApis/coloradoDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<ColoradoDataDatasetsInput>

const entitiesParamsSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<ColoradoDataBusinessEntitiesInput>

const datasetsOperation: PublicApiOperationDefinition<ColoradoDataDatasetsInput> = {
  id: 'coloradodata.datasets',
  providerId: 'coloradodata',
  name: 'Datasets',
  commandPath: ['coloradodata', 'datasets'],
  rpcMethod: 'coloradodata.datasets',
  description: 'Search Colorado Information Marketplace public Socrata datasets.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Local catalog filter, default ${COLORADO_DATA_DEFAULT_DATASET_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The catalog is broad; local filtering keeps terminal output focused without extra API calls.',
      defaultValue: COLORADO_DATA_DEFAULT_DATASET_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to show/cache, default/cap ${COLORADO_DATA_DEFAULT_DATASET_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Catalog metadata is fetched once and client-filtered; 100 bounds terminal output and cache size.',
      valueType: 'integer',
      defaultValue: String(COLORADO_DATA_DEFAULT_DATASET_LIMIT),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listColoradoDataDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeColoradoDataDatasetsInput(params),
  resultKind: 'coloradodata.datasets',
  defaultFormat: 'text',
}

const entitiesOperation: PublicApiOperationDefinition<ColoradoDataBusinessEntitiesInput> = {
  id: 'coloradodata.businessEntities',
  providerId: 'coloradodata',
  name: 'Business Entities',
  commandPath: ['coloradodata', 'business-entities'],
  rpcMethod: 'coloradodata.businessEntities',
  description: 'Read recent Colorado business entity filings from the public Socrata API.',
  category: 'government',
  options: [
    {
      name: 'status',
      flag: '--status <text>',
      description: `Entity status filter, default ${COLORADO_DATA_DEFAULT_ENTITY_STATUS}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Status filtering keeps the business feed focused on actionable active entities by default.',
      defaultValue: COLORADO_DATA_DEFAULT_ENTITY_STATUS,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Recent rows to request, default/cap ${COLORADO_DATA_DEFAULT_ENTITY_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Socrata commonly documents 1000 rows per request without paging; this maximizes one bounded no-token request.',
      valueType: 'integer',
      defaultValue: String(COLORADO_DATA_DEFAULT_ENTITY_LIMIT),
    },
  ],
  paramsSchema: entitiesParamsSchema,
  execute: params => listColoradoBusinessEntities(params),
  normalizeParams: params => entitiesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeColoradoDataBusinessEntitiesInput(params),
  resultKind: 'coloradodata.businessEntities',
  defaultFormat: 'text',
}

export const coloradoDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'coloradodata',
    name: 'Colorado Information Marketplace',
    description: 'No-auth Colorado Information Marketplace Socrata catalog and business entity data integration.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://data.colorado.gov/',
    docsUrl: 'https://dev.socrata.com/',
    auth: {
      mode: 'none',
      notes: ['Implemented public Socrata reads require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'colorado', 'socrata', 'business-entities', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Socrata supports optional app tokens for higher throttling; this provider intentionally uses only unauthenticated public reads.',
      'Business entity rows default/cap at 1000 to maximize one bounded request.',
    ],
  },
  operations: [datasetsOperation, entitiesOperation],
  endpoints: [
    {
      id: 'coloradodata-catalog',
      method: 'GET',
      urlPattern: 'https://api.us.socrata.com/api/catalog/v1',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Socrata catalog API endpoint scoped to Colorado Information Marketplace datasets.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.us.socrata.com/api/catalog/v1?domains=data.colorado.gov&only=datasets&limit=100', 'https://data.colorado.gov/'],
      consumedBy: ['coloradodata datasets'],
      notes: ['No API key required.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'coloradodata-business-entities',
      method: 'GET',
      urlPattern: 'https://data.colorado.gov/resource/4ykn-tg5h.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Colorado Business Entities Socrata JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://data.colorado.gov/resource/4ykn-tg5h.json?$limit=5'],
      consumedBy: ['coloradodata business-entities'],
      notes: ['No API key required for this query.', 'No browser clickstream or scraping required.'],
    },
  ],
}
