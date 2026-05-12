import { z } from 'zod'
import { searchBerlinOpenDataDatasets, showBerlinOpenDataDataset } from '../../application/usecases/berlinOpenData.js'
import {
  BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID,
  BERLIN_OPEN_DATA_DEFAULT_QUERY,
  BERLIN_OPEN_DATA_SEARCH_DEFAULT_LIMIT,
  normalizeBerlinOpenDataPackageInput,
  normalizeBerlinOpenDataSearchInput,
  type BerlinOpenDataPackageInput,
  type BerlinOpenDataSearchInput,
} from '../../infrastructure/openApis/berlinOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<BerlinOpenDataSearchInput>

const datasetParamsSchema = z.object({
  packageId: z.string().optional(),
}) satisfies z.ZodType<BerlinOpenDataPackageInput>

const searchOperation: PublicApiOperationDefinition<BerlinOpenDataSearchInput> = {
  id: 'berlinopendata.search',
  providerId: 'berlinopendata',
  name: 'Dataset Search',
  commandPath: ['berlinopendata', 'search'],
  rpcMethod: 'berlinopendata.search',
  description: 'Search Berlin Open Data datasets through the no-auth CKAN Action API.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${BERLIN_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset search is the safest entrypoint before selecting a Berlin CKAN package UUID or package name.',
      defaultValue: BERLIN_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default ${BERLIN_OPEN_DATA_SEARCH_DEFAULT_LIMIT}, cap 1000`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI bounds CKAN package_search rows to avoid unbounded catalog output.',
      valueType: 'integer',
      defaultValue: String(BERLIN_OPEN_DATA_SEARCH_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchBerlinOpenDataDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBerlinOpenDataSearchInput(params),
  resultKind: 'berlinopendata.search',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<BerlinOpenDataPackageInput> = {
  id: 'berlinopendata.dataset',
  providerId: 'berlinopendata',
  name: 'Dataset Detail',
  commandPath: ['berlinopendata', 'dataset'],
  rpcMethod: 'berlinopendata.dataset',
  description: 'Read one Berlin Open Data CKAN dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'packageId',
      flag: '--package-id <id>',
      description: `CKAN package UUID or name, default daten.berlin.de Metadaten ${BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a CKAN package UUID or package name; default documents the Berlin portal metadata package.',
      defaultValue: BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showBerlinOpenDataDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBerlinOpenDataPackageInput(params),
  resultKind: 'berlinopendata.dataset',
  defaultFormat: 'text',
}

export const berlinOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'berlinopendata',
    name: 'Berlin Open Data',
    description: 'No-auth Berlin CKAN dataset search and dataset detail.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://daten.berlin.de/',
    docsUrl: 'https://daten.berlin.de/datensaetze/daten-berlin-de-metadaten',
    auth: {
      mode: 'none',
      notes: ['Berlin Open Data CKAN package_search and package_show are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['government', 'berlin', 'germany', 'ckan', 'datasets', 'open-data', 'no-auth', 'json'],
    freePlanNotes: [
      'Dataset search defaults to 100 rows and is capped at 1000 rows for bounded CLI output.',
      'Dataset detail defaults to the daten.berlin.de Metadaten package for a stable catalog metadata example.',
      'Mutating CKAN operations, authenticated status_show/admin calls, raw SQL, and catalog file downloads are intentionally not exposed.',
    ],
  },
  operations: [searchOperation, datasetOperation],
  endpoints: [
    {
      id: 'berlinopendata-package-search',
      method: 'GET',
      urlPattern: 'https://datenregister.berlin.de/api/3/action/package_search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Berlin Open Data CKAN package_search endpoint.',
      observedOn: '2026-05-08',
      sampleSources: ['https://daten.berlin.de/datensaetze/daten-berlin-de-metadaten', 'https://datenregister.berlin.de/api/3/action/package_search?q=verkehr&rows=3'],
      consumedBy: ['public-apis apis run berlinopendata.search'],
      notes: ['No authentication required for read-only public CKAN calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'berlinopendata-package-show',
      method: 'GET',
      urlPattern: 'https://datenregister.berlin.de/api/3/action/package_show',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Berlin Open Data CKAN package_show endpoint.',
      observedOn: '2026-05-08',
      sampleSources: [`https://datenregister.berlin.de/api/3/action/package_show?id=${BERLIN_OPEN_DATA_DEFAULT_PACKAGE_ID}`],
      consumedBy: ['public-apis apis run berlinopendata.dataset'],
      notes: ['No authentication required for read-only public CKAN calls; package id or name is required by CKAN.'],
    },
  ],
}
