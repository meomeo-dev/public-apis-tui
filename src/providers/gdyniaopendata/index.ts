import { z } from 'zod'
import { searchGdyniaOpenDataDatasets, showGdyniaOpenDataDataset } from '../../application/usecases/gdyniaOpenData.js'
import {
  GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID,
  GDYNIA_OPEN_DATA_DEFAULT_QUERY,
  GDYNIA_OPEN_DATA_SEARCH_DEFAULT_LIMIT,
  normalizeGdyniaOpenDataPackageInput,
  normalizeGdyniaOpenDataSearchInput,
  type GdyniaOpenDataPackageInput,
  type GdyniaOpenDataSearchInput,
} from '../../infrastructure/openApis/gdyniaOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<GdyniaOpenDataSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<GdyniaOpenDataPackageInput>

const searchOperation: PublicApiOperationDefinition<GdyniaOpenDataSearchInput> = {
  id: 'gdyniaopendata.search',
  providerId: 'gdyniaopendata',
  name: 'Dataset Search',
  commandPath: ['gdyniaopendata', 'search'],
  rpcMethod: 'gdyniaopendata.search',
  description: 'Search Gdynia Open Data datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${GDYNIA_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a Gdynia CKAN package UUID or package name.',
      defaultValue: GDYNIA_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default ${GDYNIA_OPEN_DATA_SEARCH_DEFAULT_LIMIT}, cap 1000`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI bounds CKAN package_search rows to avoid unbounded catalog output.',
      valueType: 'integer',
      defaultValue: String(GDYNIA_OPEN_DATA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchGdyniaOpenDataDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGdyniaOpenDataSearchInput(params),
  resultKind: 'gdyniaopendata.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<GdyniaOpenDataPackageInput> = {
  id: 'gdyniaopendata.dataset',
  providerId: 'gdyniaopendata',
  name: 'Dataset Detail',
  commandPath: ['gdyniaopendata', 'dataset'],
  rpcMethod: 'gdyniaopendata.dataset',
  description: 'Read one Gdynia Open Data CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <id>',
      description: `CKAN package UUID or name, default Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport ${GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID or package name; default documents a stable Gdynia transport dataset.',
      defaultValue: GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showGdyniaOpenDataDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGdyniaOpenDataPackageInput(params),
  resultKind: 'gdyniaopendata.dataset',
  defaultFormat: 'text',
}

export const gdyniaOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gdyniaopendata',
    name: 'Gdynia Open Data',
    description: 'No-auth Gdynia CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://otwartedane.gdynia.pl/en/api_doc.html',
    docsUrl: 'https://otwartedane.gdynia.pl/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['Gdynia Open Data CKAN package_search and package_show are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['government', 'gdynia', 'poland', 'ckan', 'datasets', 'open-data', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults to 100 rows and is capped at 1000 rows for bounded CLI output.',
      'Dataset detail defaults to the Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport package for a stable catalog metadata example.',
      'Mutating CKAN operations, datastore SQL, raw resource downloads, and catalog file downloads are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'gdyniaopendata-package-search',
      method: 'GET',
      urlPattern: 'https://otwartedane.gdynia.pl/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Gdynia Open Data CKAN package_search endpoint.',
      observedOn: '2026-05-08',
      sampleSources: ['https://otwartedane.gdynia.pl/en/api_doc.html', 'https://otwartedane.gdynia.pl/api/3/action/package_search?q=transport&rows=3'],
      consumedBy: ['public-apis apis run gdyniaopendata.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'gdyniaopendata-package-show',
      method: 'GET',
      urlPattern: 'https://otwartedane.gdynia.pl/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Gdynia Open Data CKAN package_show endpoint.',
      observedOn: '2026-05-08',
      sampleSources: [`https://otwartedane.gdynia.pl/api/3/action/package_show?id=${GDYNIA_OPEN_DATA_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run gdyniaopendata.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id or name is required by CKAN.'],
    },
  ],
}
