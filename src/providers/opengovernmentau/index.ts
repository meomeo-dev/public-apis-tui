import { z } from 'zod'
import { readOpenGovernmentAustraliaRecords, searchOpenGovernmentAustraliaDatasets } from '../../application/usecases/openGovernmentAustralia.js'
import {
  OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_QUERY,
  OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID,
  OPEN_GOVERNMENT_AUSTRALIA_RECORDS_DEFAULT_LIMIT,
  OPEN_GOVERNMENT_AUSTRALIA_SEARCH_DEFAULT_LIMIT,
  normalizeOpenGovernmentAustraliaRecordsInput,
  normalizeOpenGovernmentAustraliaSearchInput,
  type OpenGovernmentAustraliaRecordsInput,
  type OpenGovernmentAustraliaSearchInput,
} from '../../infrastructure/openApis/openGovernmentAustraliaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentAustraliaSearchInput>

const recordsParamsSchema = z.object({
  resourceId: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentAustraliaRecordsInput>

const searchOperation: PublicApiOperationDefinition<OpenGovernmentAustraliaSearchInput> = {
  id: 'opengovernmentau.search',
  providerId: 'opengovernmentau',
  name: 'Dataset Search',
  commandPath: ['opengovernmentau', 'search'],
  rpcMethod: 'opengovernmentau.search',
  description: 'Search Australian Government datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting one datastore resource UUID.',
      defaultValue: OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${OPEN_GOVERNMENT_AUSTRALIA_SEARCH_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'CKAN rows supports large no-auth result windows; default uses cap 1000 to maximize each bounded request.',
      valueType: 'integer',
      defaultValue: String(OPEN_GOVERNMENT_AUSTRALIA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchOpenGovernmentAustraliaDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentAustraliaSearchInput(params),
  resultKind: 'opengovernmentau.search',
  defaultFormat: 'text',
}

const recordsOperation: PublicApiOperationDefinition<OpenGovernmentAustraliaRecordsInput> = {
  id: 'opengovernmentau.records',
  providerId: 'opengovernmentau',
  name: 'Datastore Records',
  commandPath: ['opengovernmentau', 'records'],
  rpcMethod: 'opengovernmentau.records',
  description: 'Read records from one Australian Government CKAN datastore resource.',
  category: 'government',
  options: [
    {
      name: 'resourceId',
      flag: '--resource-id <uuid>',
      description: `CKAN datastore resource UUID, default ASIC Business Names ${OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Datastore reads require a CKAN resource UUID; default is ASIC Business Names, a high-value commercial-analysis dataset.',
      defaultValue: OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Records to request, default/cap ${OPEN_GOVERNMENT_AUSTRALIA_RECORDS_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show the default datastore accepts 5000 no-auth rows, maximizing one bounded request.',
      valueType: 'integer',
      defaultValue: String(OPEN_GOVERNMENT_AUSTRALIA_RECORDS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: recordsParamsSchema,
  execute: params => readOpenGovernmentAustraliaRecords(params),
  normalizeParams: params => recordsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentAustraliaRecordsInput(params),
  resultKind: 'opengovernmentau.records',
  defaultFormat: 'text',
}

export const openGovernmentAustraliaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opengovernmentau',
    name: 'Open Government Australia',
    description: 'No-auth data.gov.au CKAN dataset search and datastore records.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://www.data.gov.au/',
    docsUrl: 'https://data.gov.au/data/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['CKAN Action API endpoints work without API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'australia', 'ckan', 'datasets', 'business-names', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults/caps at 1000 rows.',
      'Datastore records default/cap at 5000 rows for the ASIC Business Names resource.',
      'Raw SQL/filter datastore surfaces are intentionally not exposed in CLI UX.',
    ],
  },
  operations: [searchOperation, recordsOperation],
  endpoints: [
    {
      id: 'opengovernmentau-package-search',
      method: 'GET',
      urlPattern: 'https://data.gov.au/data/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'data.gov.au CKAN package_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.data.gov.au/', 'https://data.gov.au/data/api/3/action/package_search?q=business&rows=3'],
      consumedBy: ['public-apis apis run opengovernmentau.search'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
    {
      id: 'opengovernmentau-datastore-search',
      method: 'GET',
      urlPattern: 'https://data.gov.au/data/api/3/action/datastore_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'data.gov.au CKAN datastore_search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: [`https://data.gov.au/data/api/3/action/datastore_search?resource_id=${OPEN_GOVERNMENT_AUSTRALIA_DEFAULT_RESOURCE_ID}&limit=5`],
      consumedBy: ['public-apis apis run opengovernmentau.records'],
      notes: ['No authentication required; resource_id is required by CKAN.'],
    },
  ],
}
