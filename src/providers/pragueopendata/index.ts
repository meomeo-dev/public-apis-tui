import { z } from 'zod'
import { listPragueOpenDataDatasets, showPragueOpenDataDataset } from '../../application/usecases/pragueOpenData.js'
import {
  PRAGUE_OPEN_DATA_DATASETS_DEFAULT_LIMIT,
  PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI,
  PRAGUE_OPEN_DATA_DEFAULT_QUERY,
  normalizePragueOpenDataDatasetInput,
  normalizePragueOpenDataDatasetsInput,
  type PragueOpenDataDatasetInput,
  type PragueOpenDataDatasetsInput,
} from '../../infrastructure/openApis/pragueOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<PragueOpenDataDatasetsInput>

const datasetParamsSchema = z.object({
  datasetIri: z.string().optional(),
}) satisfies z.ZodType<PragueOpenDataDatasetInput>

const datasetsOperation: PublicApiOperationDefinition<PragueOpenDataDatasetsInput> = {
  id: 'pragueopendata.datasets',
  providerId: 'pragueopendata',
  name: 'Dataset Search',
  commandPath: ['pragueopendata', 'datasets'],
  rpcMethod: 'pragueopendata.datasets',
  description: 'Fetch and locally filter bounded Prague Open Data LKOD dataset metadata through public JSON-LD catalog IRIs.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Text to match within the bounded dataset metadata fetch, default ${PRAGUE_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Prague LKOD exposes a public catalog IRI list; query filters the bounded metadata fetch before choosing a dataset IRI.',
      defaultValue: PRAGUE_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Catalog dataset metadata documents to fetch before local filtering, default ${PRAGUE_OPEN_DATA_DATASETS_DEFAULT_LIMIT}, cap 389`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The CLI bounds JSON-LD dataset fan-out before local filtering to avoid unbounded public catalog traversal.',
      valueType: 'integer',
      defaultValue: String(PRAGUE_OPEN_DATA_DATASETS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listPragueOpenDataDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePragueOpenDataDatasetsInput(params),
  resultKind: 'pragueopendata.datasets',
  defaultFormat: 'text',
}

const datasetOperation: PublicApiOperationDefinition<PragueOpenDataDatasetInput> = {
  id: 'pragueopendata.dataset',
  providerId: 'pragueopendata',
  name: 'Dataset Detail',
  commandPath: ['pragueopendata', 'dataset'],
  rpcMethod: 'pragueopendata.dataset',
  description: 'Read one Prague Open Data LKOD JSON-LD dataset metadata document.',
  category: 'government',
  options: [
    {
      name: 'datasetIri',
      flag: '--dataset-iri <iri>',
      description: `Prague LKOD dataset IRI, default Jízdní řády ${PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Dataset detail reads require a public LKOD dataset IRI under api.lkod.cz; default documents a stable Prague transit metadata entry.',
      defaultValue: PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI,
    },
  ],
  paramsSchema: datasetParamsSchema,
  execute: params => showPragueOpenDataDataset(params),
  normalizeParams: params => datasetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePragueOpenDataDatasetInput(params),
  resultKind: 'pragueopendata.dataset',
  defaultFormat: 'text',
}

export const pragueOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'pragueopendata',
    name: 'Prague Open Data',
    description: 'No-auth Prague LKOD JSON-LD catalog and dataset metadata.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://opendata.praha.eu/',
    docsUrl: 'https://opendata.praha.eu/about-lkod',
    auth: {
      mode: 'none',
      notes: ['Prague Open Data public LKOD catalog and dataset JSON-LD endpoints returned application/ld+json without API keys or session cookies in live probes.'],
    },
    tags: ['government', 'prague', 'czechia', 'lkod', 'json-ld', 'datasets', 'open-data', 'no-auth'],
    freePlanNotes: [
      'Dataset list defaults to 20 fetched metadata documents before local filtering and is capped at the observed public catalog size.',
      'Dataset detail defaults to the Jízdní řády public transit metadata entry for a stable JSON-LD example.',
      'Admin endpoints, raw distribution downloads, browser-rendered search, and mutating operations are intentionally not exposed.',
    ],
  },
  operations: [datasetsOperation, datasetOperation],
  endpoints: [
    {
      id: 'pragueopendata-catalog',
      method: 'GET',
      urlPattern: 'https://api.lkod.cz/lod/03bdf7d6-a255-4e22-83f9-4b17b6822602/catalog',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Prague Open Data LKOD catalog JSON-LD endpoint containing public dataset IRIs.',
      observedOn: '2026-05-09',
      sampleSources: ['https://opendata.praha.eu/about-lkod', 'https://api.lkod.cz/lod/03bdf7d6-a255-4e22-83f9-4b17b6822602/catalog'],
      consumedBy: ['public-apis apis run pragueopendata.datasets'],
      notes: ['No authentication required for public read-only JSON-LD catalog calls; no browser clickstream or scraping required.'],
    },
    {
      id: 'pragueopendata-dataset',
      method: 'GET',
      urlPattern: 'https://api.lkod.cz/lod/03bdf7d6-a255-4e22-83f9-4b17b6822602/catalog/{dataset-id}',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Prague Open Data LKOD dataset JSON-LD metadata endpoint.',
      observedOn: '2026-05-09',
      sampleSources: [PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI],
      consumedBy: ['public-apis apis run pragueopendata.dataset'],
      notes: ['No authentication required for public read-only dataset metadata; raw distribution downloads are not fetched by the provider.'],
    },
  ],
}
