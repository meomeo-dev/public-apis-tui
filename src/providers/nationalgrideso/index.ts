import { z } from 'zod'
import { readNationalGridEsoRecords, searchNationalGridEsoDatasets } from '../../application/usecases/nationalGridEso.js'
import {
  NATIONAL_GRID_ESO_DEFAULT_QUERY,
  NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID,
  NATIONAL_GRID_ESO_RECORDS_DEFAULT_LIMIT,
  NATIONAL_GRID_ESO_SEARCH_DEFAULT_LIMIT,
  normalizeNationalGridEsoRecordsInput,
  normalizeNationalGridEsoSearchInput,
  type NationalGridEsoRecordsInput,
  type NationalGridEsoSearchInput,
} from '../../infrastructure/openApis/nationalGridEsoClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<NationalGridEsoSearchInput>

const recordsParamsSchema = z.object({
  resourceId: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<NationalGridEsoRecordsInput>

const searchOperation: PublicApiOperationDefinition<NationalGridEsoSearchInput> = {
  id: 'nationalgrideso.search',
  providerId: 'nationalgrideso',
  name: 'Dataset Search',
  commandPath: ['nationalgrideso', 'search'],
  rpcMethod: 'nationalgrideso.search',
  description: 'Search NESO Data Portal datasets through the no-auth CKAN Action API.',
  category: 'environment',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${NATIONAL_GRID_ESO_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest scalable entrypoint before choosing one datastore resource.',
      defaultValue: NATIONAL_GRID_ESO_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${NATIONAL_GRID_ESO_SEARCH_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'CKAN rows supports large no-auth result windows; default uses cap 1000 to maximize each limited request.',
      valueType: 'integer',
      defaultValue: String(NATIONAL_GRID_ESO_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchNationalGridEsoDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNationalGridEsoSearchInput(params),
  resultKind: 'nationalgrideso.search',
  defaultFormat: 'text',
}

const recordsOperation: PublicApiOperationDefinition<NationalGridEsoRecordsInput> = {
  id: 'nationalgrideso.records',
  providerId: 'nationalgrideso',
  name: 'Datastore Records',
  commandPath: ['nationalgrideso', 'records'],
  rpcMethod: 'nationalgrideso.records',
  description: 'Read records from one NESO CKAN datastore resource.',
  category: 'environment',
  options: [
    {
      name: 'resourceId',
      flag: '--resource-id <uuid>',
      description: `CKAN datastore resource UUID, default daily demand update ${NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Datastore reads require an explicit resource UUID; default is the live demand-data resource found via package_search.',
      defaultValue: NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Records to request, default/cap ${NATIONAL_GRID_ESO_RECORDS_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'CKAN datastore_search accepts a 100-row window reliably for the default no-auth demand dataset.',
      valueType: 'integer',
      defaultValue: String(NATIONAL_GRID_ESO_RECORDS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: recordsParamsSchema,
  execute: params => readNationalGridEsoRecords(params),
  normalizeParams: params => recordsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNationalGridEsoRecordsInput(params),
  resultKind: 'nationalgrideso.records',
  defaultFormat: 'text',
}

export const nationalGridEsoProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nationalgrideso',
    name: 'National Grid ESO / NESO Data Portal',
    description: 'No-auth NESO Data Portal CKAN dataset search and datastore records.',
    publicApisCategory: 'Environment',
    homepageUrl: 'https://api.neso.energy/',
    docsUrl: 'https://api.neso.energy/api/3/action/package_search?q=demand&rows=3',
    auth: {
      mode: 'none',
      notes: ['CKAN Action API endpoints work without API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['environment', 'energy', 'electricity', 'great-britain', 'ckan', 'no-auth', 'json'],
    freePlanNotes: [
      'The public-apis data.nationalgrideso.com entry has migrated to api.neso.energy.',
      'Dataset search defaults/caps at 1000 rows; datastore records default/cap at 100 rows for repeatable live e2e.',
    ],
  },
  operations: [searchOperation, recordsOperation],
  endpoints: [
    {
      id: 'nationalgrideso-package-search',
      method: 'GET',
      urlPattern: 'https://api.neso.energy/api/3/action/package_search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NESO Data Portal CKAN package_search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.neso.energy/api/3/action/package_search?q=demand&rows=3'],
      consumedBy: ['nationalgrideso search'],
      notes: ['No API key required.', 'Replaces the old data.nationalgrideso.com host.'],
    },
    {
      id: 'nationalgrideso-datastore-search',
      method: 'GET',
      urlPattern: 'https://api.neso.energy/api/3/action/datastore_search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NESO Data Portal CKAN datastore_search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [`https://api.neso.energy/api/3/action/datastore_search?resource_id=${NATIONAL_GRID_ESO_DEFAULT_RESOURCE_ID}&limit=100`],
      consumedBy: ['nationalgrideso records'],
      notes: ['No API key required.', 'Default resource is Demand Data Update datastore.'],
    },
  ],
}
