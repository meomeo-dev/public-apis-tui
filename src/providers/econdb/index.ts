import { z } from 'zod'
import { listEcondbDatasets, listEcondbSources } from '../../application/usecases/econdb.js'
import {
  ECONDB_DEFAULT_LIMIT,
  ECONDB_DEFAULT_PAGE,
  ECONDB_MAX_LIMIT,
  normalizeEcondbCatalogInput,
  type EcondbCatalogInput,
} from '../../infrastructure/openApis/econdbClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const catalogParamsSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<EcondbCatalogInput>

const sharedOptions = [
  {
    name: 'page',
    flag: '--page <number>',
    description: `Catalog page, default ${ECONDB_DEFAULT_PAGE}`,
    exposure: 'primary' as const,
    group: 'pagination' as const,
    reason: 'No-auth catalog endpoints are paginated and page selection is the stable navigation control.',
    valueType: 'integer' as const,
    defaultValue: String(ECONDB_DEFAULT_PAGE),
  },
  {
    name: 'limit',
    flag: '--limit <count>',
    description: `Rows per page, default/cap ${ECONDB_DEFAULT_LIMIT}`,
    exposure: 'primary' as const,
    group: 'pagination' as const,
    reason: `The no-auth catalog endpoints support page_size=100; default uses that maximum to maximize each limited request.`,
    valueType: 'integer' as const,
    defaultValue: String(ECONDB_DEFAULT_LIMIT),
  },
]

const sourcesOperation: PublicApiOperationDefinition<EcondbCatalogInput> = {
  id: 'econdb.sources',
  providerId: 'econdb',
  name: 'Sources',
  commandPath: ['econdb', 'sources'],
  rpcMethod: 'econdb.sources',
  description: 'List no-auth Econdb macro data sources.',
  category: 'finance',
  options: sharedOptions,
  paramsSchema: catalogParamsSchema,
  execute: params => listEcondbSources(params),
  normalizeParams: params => catalogParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEcondbCatalogInput(params),
  resultKind: 'econdb.sources',
  defaultFormat: 'text',
}

const datasetsOperation: PublicApiOperationDefinition<EcondbCatalogInput> = {
  id: 'econdb.datasets',
  providerId: 'econdb',
  name: 'Datasets',
  commandPath: ['econdb', 'datasets'],
  rpcMethod: 'econdb.datasets',
  description: 'List no-auth Econdb macro datasets.',
  category: 'finance',
  options: sharedOptions,
  paramsSchema: catalogParamsSchema,
  execute: params => listEcondbDatasets(params),
  normalizeParams: params => catalogParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEcondbCatalogInput(params),
  resultKind: 'econdb.datasets',
  defaultFormat: 'text',
}

export const econdbProvider: PublicApiProviderModule = {
  manifest: {
    id: 'econdb',
    name: 'Econdb',
    description: 'No-auth Econdb sources and datasets catalog endpoints for macroeconomic discovery.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://www.econdb.com/api/',
    docsUrl: 'https://developers.econdb.com/docs/',
    auth: {
      mode: 'none',
      notes: [
        'Sources and datasets catalog endpoints work without API key, OAuth, cookies, browser session, or account setup.',
        'Series data endpoints returned HTTP 401 Token required during 2026-05-04 live probe and are intentionally not implemented as no-auth operations.',
      ],
    },
    tags: ['finance', 'macroeconomics', 'catalog', 'datasets', 'no-auth', 'json'],
    freePlanNotes: [`No-auth catalog endpoints default/cap at ${ECONDB_MAX_LIMIT} rows per page.`],
  },
  operations: [sourcesOperation, datasetsOperation],
  endpoints: [
    {
      id: 'econdb-sources',
      method: 'GET',
      urlPattern: 'https://www.econdb.com/api/sources/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Econdb no-auth macro data source catalog endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://developers.econdb.com/docs/', 'https://www.econdb.com/api/sources/?format=json&page=1&page_size=100'],
      consumedBy: ['econdb sources'],
      notes: ['No API key required.', 'Series endpoints require Token and are out of no-auth scope.'],
    },
    {
      id: 'econdb-datasets',
      method: 'GET',
      urlPattern: 'https://www.econdb.com/api/datasets/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Econdb no-auth macro dataset catalog endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://developers.econdb.com/docs/', 'https://www.econdb.com/api/datasets/?format=json&page=1&page_size=100'],
      consumedBy: ['econdb datasets'],
      notes: ['No API key required.', 'Series endpoints require Token and are out of no-auth scope.'],
    },
  ],
}
