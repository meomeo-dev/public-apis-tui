import { z } from 'zod'
import { searchHelsinkiOpenDataDatasets, showHelsinkiOpenDataDataset } from '../../application/usecases/helsinkiOpenData.js'
import {
  HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID,
  HELSINKI_OPEN_DATA_DEFAULT_QUERY,
  HELSINKI_OPEN_DATA_SEARCH_DEFAULT_LIMIT,
  normalizeHelsinkiOpenDataPackageInput,
  normalizeHelsinkiOpenDataSearchInput,
  type HelsinkiOpenDataPackageInput,
  type HelsinkiOpenDataSearchInput,
} from '../../infrastructure/openApis/helsinkiOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<HelsinkiOpenDataSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<HelsinkiOpenDataPackageInput>

const searchOperation: PublicApiOperationDefinition<HelsinkiOpenDataSearchInput> = {
  id: 'helsinkiopendata.search',
  providerId: 'helsinkiopendata',
  name: 'Dataset Search',
  commandPath: ['helsinkiopendata', 'search'],
  rpcMethod: 'helsinkiopendata.search',
  description: 'Search Helsinki Region Infoshare datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${HELSINKI_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a HRI CKAN package UUID or package name.',
      defaultValue: HELSINKI_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default ${HELSINKI_OPEN_DATA_SEARCH_DEFAULT_LIMIT}, cap 1000`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI bounds CKAN package_search rows to avoid unbounded catalog output.',
      valueType: 'integer',
      defaultValue: String(HELSINKI_OPEN_DATA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchHelsinkiOpenDataDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHelsinkiOpenDataSearchInput(params),
  resultKind: 'helsinkiopendata.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<HelsinkiOpenDataPackageInput> = {
  id: 'helsinkiopendata.dataset',
  providerId: 'helsinkiopendata',
  name: 'Dataset Detail',
  commandPath: ['helsinkiopendata', 'dataset'],
  rpcMethod: 'helsinkiopendata.dataset',
  description: 'Read one Helsinki Region Infoshare CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <id>',
      description: `CKAN package UUID or name, default Helsingin liikennemittausten tilastorajapinta ${HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID or package name; default documents a stable Helsinki traffic-measurement dataset.',
      defaultValue: HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showHelsinkiOpenDataDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHelsinkiOpenDataPackageInput(params),
  resultKind: 'helsinkiopendata.dataset',
  defaultFormat: 'text',
}

export const helsinkiOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'helsinkiopendata',
    name: 'Helsinki Region Infoshare',
    description: 'No-auth HRI CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://hri.fi/en_gb/',
    docsUrl: 'https://hri.fi/data/api/3/action/help_show?name=package_search',
    auth: {
      mode: 'none',
      notes: ['Helsinki Region Infoshare CKAN package_search and package_show are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['government', 'helsinki', 'finland', 'ckan', 'datasets', 'open-data', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults to 100 rows and is capped at 1000 rows for bounded CLI output.',
      'Dataset detail defaults to the Helsingin liikennemittausten tilastorajapinta package for a stable catalog metadata example.',
      'Mutating CKAN operations, datastore SQL, raw resource downloads, and catalog file downloads are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'helsinkiopendata-package-search',
      method: 'GET',
      urlPattern: 'https://hri.fi/data/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Helsinki Region Infoshare CKAN package_search endpoint.',
      observedOn: '2026-05-08',
      sampleSources: ['https://hri.fi/en_gb/', 'https://hri.fi/data/api/3/action/package_search?q=transport&rows=3'],
      consumedBy: ['public-apis apis run helsinkiopendata.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'helsinkiopendata-package-show',
      method: 'GET',
      urlPattern: 'https://hri.fi/data/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Helsinki Region Infoshare CKAN package_show endpoint.',
      observedOn: '2026-05-08',
      sampleSources: [`https://hri.fi/data/api/3/action/package_show?id=${HELSINKI_OPEN_DATA_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run helsinkiopendata.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id or name is required by CKAN.'],
    },
  ],
}
