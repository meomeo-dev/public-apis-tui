import { z } from 'zod'
import { searchGdanskOpenDataDatasets, showGdanskOpenDataDataset } from '../../application/usecases/gdanskOpenData.js'
import {
  GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID,
  GDANSK_OPEN_DATA_DEFAULT_QUERY,
  GDANSK_OPEN_DATA_SEARCH_DEFAULT_LIMIT,
  normalizeGdanskOpenDataPackageInput,
  normalizeGdanskOpenDataSearchInput,
  type GdanskOpenDataPackageInput,
  type GdanskOpenDataSearchInput,
} from '../../infrastructure/openApis/gdanskOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<GdanskOpenDataSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<GdanskOpenDataPackageInput>

const searchOperation: PublicApiOperationDefinition<GdanskOpenDataSearchInput> = {
  id: 'gdanskopendata.search',
  providerId: 'gdanskopendata',
  name: 'Dataset Search',
  commandPath: ['gdanskopendata', 'search'],
  rpcMethod: 'gdanskopendata.search',
  description: 'Search Gdańsk Open Data datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${GDANSK_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a Gdańsk CKAN package UUID or package name.',
      defaultValue: GDANSK_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default ${GDANSK_OPEN_DATA_SEARCH_DEFAULT_LIMIT}, cap 1000`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI bounds CKAN package_search rows to avoid unbounded catalog output.',
      valueType: 'integer',
      defaultValue: String(GDANSK_OPEN_DATA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchGdanskOpenDataDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGdanskOpenDataSearchInput(params),
  resultKind: 'gdanskopendata.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<GdanskOpenDataPackageInput> = {
  id: 'gdanskopendata.dataset',
  providerId: 'gdanskopendata',
  name: 'Dataset Detail',
  commandPath: ['gdanskopendata', 'dataset'],
  rpcMethod: 'gdanskopendata.dataset',
  description: 'Read one Gdańsk Open Data CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <id>',
      description: `CKAN package UUID or name, default Baza noclegowa w Gdańsku ${GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID or package name; default documents the Gdańsk portal sample package.',
      defaultValue: GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showGdanskOpenDataDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGdanskOpenDataPackageInput(params),
  resultKind: 'gdanskopendata.dataset',
  defaultFormat: 'text',
}

export const gdanskOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gdanskopendata',
    name: 'Gdańsk Open Data',
    description: 'No-auth Gdańsk CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://ckan.multimediagdansk.pl/en',
    docsUrl: 'https://ckan.multimediagdansk.pl/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['Gdańsk Open Data CKAN package_search and package_show are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['government', 'gdansk', 'poland', 'ckan', 'datasets', 'open-data', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults to 100 rows and is capped at 1000 rows for bounded CLI output.',
      'Dataset detail defaults to the Baza noclegowa w Gdańsku package for a stable catalog metadata example.',
      'Mutating CKAN operations, datastore SQL, raw resource downloads, and catalog file downloads are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'gdanskopendata-package-search',
      method: 'GET',
      urlPattern: 'https://ckan.multimediagdansk.pl/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Gdańsk Open Data CKAN package_search endpoint.',
      observedOn: '2026-05-08',
      sampleSources: ['https://ckan.multimediagdansk.pl/en', 'https://ckan.multimediagdansk.pl/api/3/action/package_search?q=transport&rows=3'],
      consumedBy: ['public-apis apis run gdanskopendata.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'gdanskopendata-package-show',
      method: 'GET',
      urlPattern: 'https://ckan.multimediagdansk.pl/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Gdańsk Open Data CKAN package_show endpoint.',
      observedOn: '2026-05-08',
      sampleSources: [`https://ckan.multimediagdansk.pl/api/3/action/package_show?id=${GDANSK_OPEN_DATA_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run gdanskopendata.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id or name is required by CKAN.'],
    },
  ],
}
