import { z } from 'zod'
import { readIstanbulOpenDataRecords, searchIstanbulOpenDataDatasets } from '../../application/usecases/istanbulOpenData.js'
import {
  ISTANBUL_OPEN_DATA_DEFAULT_QUERY,
  ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID,
  ISTANBUL_OPEN_DATA_RECORDS_DEFAULT_LIMIT,
  ISTANBUL_OPEN_DATA_SEARCH_DEFAULT_LIMIT,
  normalizeIstanbulOpenDataRecordsInput,
  normalizeIstanbulOpenDataSearchInput,
  type IstanbulOpenDataRecordsInput,
  type IstanbulOpenDataSearchInput,
} from '../../infrastructure/openApis/istanbulOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<IstanbulOpenDataSearchInput>

const recordsParamsSchema = z.object({
  resourceId: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<IstanbulOpenDataRecordsInput>

const searchOperation: PublicApiOperationDefinition<IstanbulOpenDataSearchInput> = {
  id: 'istanbulopendata.search',
  providerId: 'istanbulopendata',
  name: 'Dataset Search',
  commandPath: ['istanbulopendata', 'search'],
  rpcMethod: 'istanbulopendata.search',
  description: 'Search Istanbul Metropolitan Municipality datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${ISTANBUL_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a datastore resource UUID.',
      defaultValue: ISTANBUL_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${ISTANBUL_OPEN_DATA_SEARCH_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'CKAN rows supports large no-auth result windows; default uses cap 1000 to maximize each bounded request.',
      valueType: 'integer',
      defaultValue: String(ISTANBUL_OPEN_DATA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchIstanbulOpenDataDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIstanbulOpenDataSearchInput(params),
  resultKind: 'istanbulopendata.search',
  defaultFormat: 'text',
}

const recordsOperation: PublicApiOperationDefinition<IstanbulOpenDataRecordsInput> = {
  id: 'istanbulopendata.records',
  providerId: 'istanbulopendata',
  name: 'Datastore Records',
  commandPath: ['istanbulopendata', 'records'],
  rpcMethod: 'istanbulopendata.records',
  description: 'Read records from one Istanbul Open Data CKAN datastore resource.',
  category: 'government',
  options: [
    {
      name: 'resourceId',
      flag: '--resource-id <uuid>',
      description: `CKAN datastore resource UUID, default metro energy ${ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Datastore reads require an explicit CKAN resource UUID; default is a small metro energy datastore found via package_search.',
      defaultValue: ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Records to request, default/cap ${ISTANBUL_OPEN_DATA_RECORDS_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show datastore_search accepts large no-auth limits; default/cap 5000 maximizes one bounded request.',
      valueType: 'integer',
      defaultValue: String(ISTANBUL_OPEN_DATA_RECORDS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: recordsParamsSchema,
  execute: params => readIstanbulOpenDataRecords(params),
  normalizeParams: params => recordsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIstanbulOpenDataRecordsInput(params),
  resultKind: 'istanbulopendata.records',
  defaultFormat: 'text',
}

export const istanbulOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'istanbulopendata',
    name: 'Istanbul (İBB) Open Data',
    description: 'No-auth Istanbul Metropolitan Municipality CKAN dataset search and datastore records.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://data.ibb.gov.tr',
    docsUrl: 'https://data.ibb.gov.tr/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['CKAN Action API endpoints work without API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'istanbul', 'municipal', 'ckan', 'datasets', 'datastore', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults/caps at 1000 rows.',
      'Datastore records default/cap at 5000 rows to maximize one bounded no-auth request.',
      'Default records resource is Metro Hatları Enerji Tüketimi, a small datastore suitable for live e2e.',
    ],
  },
  operations: [searchOperation, recordsOperation],
  endpoints: [
    {
      id: 'istanbulopendata-package-search',
      method: 'GET',
      urlPattern: 'https://data.ibb.gov.tr/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Istanbul Open Data CKAN package_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: ['https://data.ibb.gov.tr', 'https://data.ibb.gov.tr/api/3/action/package_search?q=metro&rows=3'],
      consumedBy: ['public-apis apis run istanbulopendata.search'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
    {
      id: 'istanbulopendata-datastore-search',
      method: 'GET',
      urlPattern: 'https://data.ibb.gov.tr/api/3/action/datastore_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Istanbul Open Data CKAN datastore_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: [`https://data.ibb.gov.tr/api/3/action/datastore_search?resource_id=${ISTANBUL_OPEN_DATA_DEFAULT_RESOURCE_ID}&limit=5`],
      consumedBy: ['public-apis apis run istanbulopendata.records'],
      notes: ['No authentication required; resource_id is required by CKAN.'],
    },
  ],
}
