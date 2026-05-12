import { z } from 'zod'
import { listNycOpenData311Requests, listNycOpenDataDatasets } from '../../application/usecases/nycOpenData.js'
import {
  NYC_OPEN_DATA_DEFAULT_311_LIMIT,
  NYC_OPEN_DATA_DEFAULT_BOROUGH,
  NYC_OPEN_DATA_DEFAULT_DATASET_LIMIT,
  NYC_OPEN_DATA_DEFAULT_DATASET_QUERY,
  normalizeNycOpenData311RequestsInput,
  normalizeNycOpenDataDatasetsInput,
  type NycOpenData311RequestsInput,
  type NycOpenDataDatasetsInput,
} from '../../infrastructure/openApis/nycOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<NycOpenDataDatasetsInput>

const requestsParamsSchema = z.object({
  borough: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<NycOpenData311RequestsInput>

const datasetsOperation: PublicApiOperationDefinition<NycOpenDataDatasetsInput> = {
  id: 'nycopendata.datasets',
  providerId: 'nycopendata',
  name: 'Datasets',
  commandPath: ['nycopendata', 'datasets'],
  rpcMethod: 'nycopendata.datasets',
  description: 'Search NYC Open Data public dataset metadata.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Local catalog filter, default ${NYC_OPEN_DATA_DEFAULT_DATASET_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The NYC catalog is large; local filtering keeps terminal output focused without extra API calls.',
      defaultValue: NYC_OPEN_DATA_DEFAULT_DATASET_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to show/cache, default/cap ${NYC_OPEN_DATA_DEFAULT_DATASET_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Catalog metadata is fetched once and client-filtered; 100 bounds terminal output and cache size.',
      valueType: 'integer',
      defaultValue: String(NYC_OPEN_DATA_DEFAULT_DATASET_LIMIT),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listNycOpenDataDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNycOpenDataDatasetsInput(params),
  resultKind: 'nycopendata.datasets',
  defaultFormat: 'text',
}

const requestsOperation: PublicApiOperationDefinition<NycOpenData311RequestsInput> = {
  id: 'nycopendata.311Requests',
  providerId: 'nycopendata',
  name: '311 Requests',
  commandPath: ['nycopendata', '311-requests'],
  rpcMethod: 'nycopendata.311Requests',
  description: 'Read recent NYC 311 service requests from the public Socrata API.',
  category: 'government',
  options: [
    {
      name: 'borough',
      flag: '--borough <name>',
      description: `Borough filter, default ${NYC_OPEN_DATA_DEFAULT_BOROUGH}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Borough filtering gives useful local slices and avoids pulling all citywide rows by default.',
      defaultValue: NYC_OPEN_DATA_DEFAULT_BOROUGH,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Recent rows to request, default/cap ${NYC_OPEN_DATA_DEFAULT_311_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Socrata commonly documents 1000 rows per request without paging; this maximizes one bounded no-token request.',
      valueType: 'integer',
      defaultValue: String(NYC_OPEN_DATA_DEFAULT_311_LIMIT),
    },
  ],
  paramsSchema: requestsParamsSchema,
  execute: params => listNycOpenData311Requests(params),
  normalizeParams: params => requestsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNycOpenData311RequestsInput(params),
  resultKind: 'nycopendata.311Requests',
  defaultFormat: 'text',
}

export const nycOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nycopendata',
    name: 'City, New York Open Data',
    description: 'No-auth NYC Open Data Socrata catalog and 311 service request API integration.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://opendata.cityofnewyork.us/',
    docsUrl: 'https://dev.socrata.com/',
    auth: {
      mode: 'none',
      notes: ['Implemented public Socrata reads require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'nyc', 'socrata', '311', 'municipal-data', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Socrata supports optional app tokens for higher throttling; this provider intentionally uses only unauthenticated public reads.',
      '311 recent rows default/cap is 1000 to match common documented no-paging behavior and keep live e2e quota-conscious.',
    ],
  },
  operations: [datasetsOperation, requestsOperation],
  endpoints: [
    {
      id: 'nycopendata-views-catalog',
      method: 'GET',
      urlPattern: 'https://api.us.socrata.com/api/catalog/v1',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Socrata catalog API endpoint scoped to NYC Open Data datasets.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.us.socrata.com/api/catalog/v1?domains=data.cityofnewyork.us&only=datasets&limit=100', 'https://opendata.cityofnewyork.us/'],
      consumedBy: ['nycopendata datasets'],
      notes: ['No API key required.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'nycopendata-311-service-requests',
      method: 'GET',
      urlPattern: 'https://data.cityofnewyork.us/resource/erm2-nwe9.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NYC 311 Service Requests from 2020 to Present SODA JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=5', 'https://data.cityofnewyork.us/api/views/erm2-nwe9'],
      consumedBy: ['nycopendata 311-requests'],
      notes: ['No API key required for this query.', 'No browser clickstream or scraping required.'],
    },
  ],
}
