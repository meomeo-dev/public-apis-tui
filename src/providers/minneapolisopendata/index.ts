import { z } from 'zod'
import { listMinneapolisOpenDataDatasets } from '../../application/usecases/minneapolisOpenData.js'
import {
  MINNEAPOLIS_OPEN_DATA_DEFAULT_LIMIT,
  MINNEAPOLIS_OPEN_DATA_DEFAULT_QUERY,
  normalizeMinneapolisOpenDataDatasetsInput,
  type MinneapolisOpenDataDatasetsInput,
} from '../../infrastructure/openApis/minneapolisOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<MinneapolisOpenDataDatasetsInput>

const datasetsOperation: PublicApiOperationDefinition<MinneapolisOpenDataDatasetsInput> = {
  id: 'minneapolisopendata.datasets',
  providerId: 'minneapolisopendata',
  name: 'Dataset Search',
  commandPath: ['minneapolisopendata', 'datasets'],
  rpcMethod: 'minneapolisopendata.datasets',
  description: 'Search Open Data Minneapolis datasets through the no-auth ArcGIS Hub Search API.',
  category: 'open-data',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset search text, default ${MINNEAPOLIS_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The Minneapolis catalog is broad; text search keeps the default output spatially useful and terminal-readable.',
      defaultValue: MINNEAPOLIS_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${MINNEAPOLIS_OPEN_DATA_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'ArcGIS Hub search is rate-limited; 100 is a bounded single-page maximum for readable output and offline caching.',
      valueType: 'integer',
      defaultValue: String(MINNEAPOLIS_OPEN_DATA_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listMinneapolisOpenDataDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeMinneapolisOpenDataDatasetsInput(params),
  resultKind: 'minneapolisopendata.datasets',
  defaultFormat: 'text',
}

export const minneapolisOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'minneapolisopendata',
    name: 'Open Data Minneapolis',
    description: 'No-auth ArcGIS Hub dataset catalog search for Open Data Minneapolis.',
    publicApisCategory: 'Open Data',
    homepageUrl: 'https://opendata.minneapolismn.gov/',
    docsUrl: 'https://opendata.minneapolismn.gov/api/search/v1/collections/dataset/items?limit=3',
    auth: {
      mode: 'none',
      notes: ['Open Data Minneapolis ArcGIS Hub search and DCAT catalog endpoints are public read-only JSON/GeoJSON endpoints and live probes require no API key.'],
    },
    tags: ['open-data', 'minneapolis', 'arcgis-hub', 'datasets', 'spatial-data', 'no-auth', 'geojson'],
    freePlanNotes: [
      'Dataset search defaults/caps at 100 rows for one bounded ArcGIS Hub search page.',
      'This pass exposes catalog metadata only; raw ArcGIS layer queries, feature downloads, and arbitrary resource URLs are intentionally not exposed.',
    ],
  },
  operations: [datasetsOperation],
  endpoints: [
    {
      id: 'minneapolisopendata-hub-dataset-search',
      method: 'GET',
      urlPattern: 'https://opendata.minneapolismn.gov/api/search/v1/collections/dataset/items',
      category: 'public-apis:open-data',
      evidenceStatus: 'confirmed',
      description: 'ArcGIS Hub OGC API Features dataset collection search for Open Data Minneapolis.',
      observedOn: '2026-05-09',
      sampleSources: ['https://opendata.minneapolismn.gov/', 'https://opendata.minneapolismn.gov/api/search/v1/collections/dataset/items?limit=3'],
      consumedBy: ['public-apis apis run minneapolisopendata.datasets'],
      notes: ['No API key observed; response exposes portal_search_throttler rate-limit headers and returns application/geo+json.'],
    },
    {
      id: 'minneapolisopendata-dcat-feed',
      method: 'GET',
      urlPattern: 'https://opendata.minneapolismn.gov/api/feed/dcat-us/1.1.json',
      category: 'public-apis:open-data',
      evidenceStatus: 'confirmed',
      description: 'Open Data Minneapolis public DCAT-US catalog feed.',
      observedOn: '2026-05-09',
      sampleSources: ['https://opendata.minneapolismn.gov/api/feed/dcat-us/1.1.json'],
      consumedBy: [],
      notes: ['Confirmed public JSON catalog feed; not exposed as a separate CLI operation in this pass because ArcGIS Hub search provides bounded queryable metadata.'],
    },
  ],
}
