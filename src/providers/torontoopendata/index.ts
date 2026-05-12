import { z } from 'zod'
import { searchTorontoOpenDataDatasets, showTorontoOpenDataDataset } from '../../application/usecases/torontoOpenData.js'
import {
  TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID,
  TORONTO_OPEN_DATA_DEFAULT_QUERY,
  TORONTO_OPEN_DATA_SEARCH_DEFAULT_LIMIT,
  normalizeTorontoOpenDataPackageInput,
  normalizeTorontoOpenDataSearchInput,
  type TorontoOpenDataPackageInput,
  type TorontoOpenDataSearchInput,
} from '../../infrastructure/openApis/torontoOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<TorontoOpenDataSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<TorontoOpenDataPackageInput>

const searchOperation: PublicApiOperationDefinition<TorontoOpenDataSearchInput> = {
  id: 'torontoopendata.search',
  providerId: 'torontoopendata',
  name: 'Dataset Search',
  commandPath: ['torontoopendata', 'search'],
  rpcMethod: 'torontoopendata.search',
  description: 'Search Toronto Open Data datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${TORONTO_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a Toronto CKAN package UUID or package name.',
      defaultValue: TORONTO_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default ${TORONTO_OPEN_DATA_SEARCH_DEFAULT_LIMIT}, cap 1000`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI bounds CKAN package_search rows to avoid unbounded catalog output.',
      valueType: 'integer',
      defaultValue: String(TORONTO_OPEN_DATA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchTorontoOpenDataDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeTorontoOpenDataSearchInput(params),
  resultKind: 'torontoopendata.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<TorontoOpenDataPackageInput> = {
  id: 'torontoopendata.dataset',
  providerId: 'torontoopendata',
  name: 'Dataset Detail',
  commandPath: ['torontoopendata', 'dataset'],
  rpcMethod: 'torontoopendata.dataset',
  description: 'Read one Toronto Open Data CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <id>',
      description: `CKAN package UUID or name, default TTC Routes and Schedules ${TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID or package name; default documents a stable Toronto transit dataset.',
      defaultValue: TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showTorontoOpenDataDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeTorontoOpenDataPackageInput(params),
  resultKind: 'torontoopendata.dataset',
  defaultFormat: 'text',
}

export const torontoOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'torontoopendata',
    name: 'Toronto Open Data',
    description: 'No-auth Toronto CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://open.toronto.ca/',
    docsUrl: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['Toronto Open Data CKAN package_search and package_show are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['government', 'toronto', 'canada', 'ckan', 'datasets', 'open-data', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults to 100 rows and is capped at 1000 rows for bounded CLI output.',
      'Dataset detail defaults to the TTC Routes and Schedules package for a stable transit catalog metadata example.',
      'Mutating CKAN operations, datastore SQL, arbitrary resource/file downloads, WordPress JSON pages, and credentials are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'torontoopendata-package-search',
      method: 'GET',
      urlPattern: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Toronto Open Data CKAN package_search endpoint.',
      observedOn: '2026-05-09',
      sampleSources: ['https://open.toronto.ca/', 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search?q=transportation&rows=1'],
      consumedBy: ['public-apis apis run torontoopendata.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'torontoopendata-package-show',
      method: 'GET',
      urlPattern: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Toronto Open Data CKAN package_show endpoint.',
      observedOn: '2026-05-09',
      sampleSources: [`https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=${TORONTO_OPEN_DATA_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run torontoopendata.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id or name is required by CKAN.'],
    },
  ],
}
