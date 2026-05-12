import { z } from 'zod'
import { listUmeaOpenDataDatasets } from '../../application/usecases/umeaOpenData.js'
import {
  UMEA_OPEN_DATA_DEFAULT_LANGUAGE,
  UMEA_OPEN_DATA_DEFAULT_LIMIT,
  UMEA_OPEN_DATA_DEFAULT_OFFSET,
  UMEA_OPEN_DATA_DEFAULT_QUERY,
  normalizeUmeaOpenDataDatasetsInput,
  type UmeaOpenDataDatasetsInput,
} from '../../infrastructure/openApis/umeaOpenDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
  language: z.string().optional(),
}) satisfies z.ZodType<UmeaOpenDataDatasetsInput>

const datasetsOperation: PublicApiOperationDefinition<UmeaOpenDataDatasetsInput> = {
  id: 'umeaopendata.datasets',
  providerId: 'umeaopendata',
  name: 'Dataset Search',
  commandPath: ['umeaopendata', 'datasets'],
  rpcMethod: 'umeaopendata.datasets',
  description: 'Search Umeå Open Data datasets through the no-auth Opendatasoft Explore API.',
  category: 'open-data',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Dataset full-text search, default ${UMEA_OPEN_DATA_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The Umeå catalog is broad; text search keeps output focused and useful in a terminal.',
      defaultValue: UMEA_OPEN_DATA_DEFAULT_QUERY,
    },
    {
      name: 'language',
      flag: '--language <en|sv>',
      description: `Metadata language, default ${UMEA_OPEN_DATA_DEFAULT_LANGUAGE}`,
      exposure: 'advanced',
      group: 'query',
      reason: 'Opendatasoft supports English and Swedish metadata; exposing the language keeps localized titles explicit without changing endpoints.',
      defaultValue: UMEA_OPEN_DATA_DEFAULT_LANGUAGE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to request, default/cap ${UMEA_OPEN_DATA_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Opendatasoft non-grouped catalog pages cap at 100 rows; CLI mirrors that maximum for readable output and cache size.',
      valueType: 'integer',
      defaultValue: String(UMEA_OPEN_DATA_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: `Result offset, default ${UMEA_OPEN_DATA_DEFAULT_OFFSET}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Opendatasoft uses offset pagination; exposing a bounded offset enables deterministic page traversal without raw export downloads.',
      valueType: 'integer',
      defaultValue: String(UMEA_OPEN_DATA_DEFAULT_OFFSET),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listUmeaOpenDataDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUmeaOpenDataDatasetsInput(params),
  resultKind: 'umeaopendata.datasets',
  defaultFormat: 'text',
}

export const umeaOpenDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'umeaopendata',
    name: 'Umeå Open Data',
    description: 'No-auth Opendatasoft Explore API dataset catalog search for Umeå Open Data.',
    publicApisCategory: 'Open Data',
    homepageUrl: 'https://opendata.umea.se/',
    docsUrl: 'https://opendata.umea.se/api-console/explore/v2.1/',
    auth: {
      mode: 'none',
      notes: ['Umeå Open Data Opendatasoft Explore v2.1 catalog endpoints are public read-only JSON endpoints and live probes require no API key.'],
    },
    tags: ['open-data', 'umea', 'sweden', 'opendatasoft', 'datasets', 'no-auth'],
    freePlanNotes: [
      'Dataset search defaults/caps at 100 rows for one bounded Opendatasoft catalog page.',
      'This pass exposes catalog metadata search only; raw record queries, export downloads, attachments, and arbitrary dataset resource downloads are intentionally not exposed.',
    ],
  },
  operations: [datasetsOperation],
  endpoints: [
    {
      id: 'umeaopendata-explore-swagger',
      method: 'GET',
      urlPattern: 'https://opendata.umea.se/api/explore/v2.1/swagger.json',
      category: 'public-apis:open-data',
      evidenceStatus: 'confirmed',
      description: 'Official Opendatasoft Explore v2.1 OpenAPI description for Umeå Open Data.',
      observedOn: '2026-05-09',
      sampleSources: ['https://opendata.umea.se/api/', 'https://opendata.umea.se/api/explore/v2.1/swagger.json'],
      consumedBy: [],
      notes: ['No API key observed; Swagger/OpenAPI document describes GET-only JSON Explore API endpoints.'],
    },
    {
      id: 'umeaopendata-catalog-datasets',
      method: 'GET',
      urlPattern: 'https://opendata.umea.se/api/explore/v2.1/catalog/datasets',
      category: 'public-apis:open-data',
      evidenceStatus: 'confirmed',
      description: 'Opendatasoft Explore v2.1 catalog dataset search for Umeå Open Data.',
      observedOn: '2026-05-09',
      sampleSources: ['https://opendata.umea.se/api/explore/v2.1/catalog/datasets?where=search(%22transport%22)&limit=2&offset=0&lang=en'],
      consumedBy: ['public-apis apis run umeaopendata.datasets'],
      notes: ['No API key observed; response returns application/json, CORS wildcard, and X-RateLimit headers.'],
    },
  ],
}
