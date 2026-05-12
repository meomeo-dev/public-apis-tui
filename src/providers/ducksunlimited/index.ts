import { z } from 'zod'
import { listDucksUnlimitedChapters, type DucksUnlimitedChaptersInput } from '../../application/usecases/ducksUnlimited.js'
import { DUCKS_UNLIMITED_DEFAULT_LIMIT, DUCKS_UNLIMITED_MAX_LIMIT, normalizeDucksUnlimitedChaptersInput } from '../../infrastructure/openApis/ducksUnlimitedClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const chaptersParamsSchema = z.object({
  state: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().int().optional(),
  includeGeometry: z.coerce.boolean().optional(),
}) satisfies z.ZodType<DucksUnlimitedChaptersInput>

const chaptersOperation: PublicApiOperationDefinition<DucksUnlimitedChaptersInput> = {
  id: 'ducksunlimited.chapters',
  providerId: 'ducksunlimited',
  name: 'University Chapters',
  commandPath: ['ducksunlimited', 'chapters'],
  rpcMethod: 'ducksunlimited.chapters',
  description: 'List Ducks Unlimited university chapter locations from the public ArcGIS FeatureServer.',
  category: 'geocoding',
  options: [
    {
      name: 'state',
      flag: '--state <code>',
      description: 'Optional two-letter US state filter, for example TX',
      exposure: 'primary',
      group: 'filters',
      reason: 'State is a high-value safe filter that avoids exposing raw ArcGIS SQL.',
    },
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Optional chapter, city, or chapter-id text search',
      exposure: 'primary',
      group: 'query',
      reason: 'Text search covers common lookup needs while keeping the raw SQL surface hidden.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to request, default ${DUCKS_UNLIMITED_DEFAULT_LIMIT}, cap ${DUCKS_UNLIMITED_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The upstream maxRecordCount is 1000; CLI caps at 100 for readable terminal output and offline cache size.',
      valueType: 'integer',
      defaultValue: String(DUCKS_UNLIMITED_DEFAULT_LIMIT),
    },
    {
      name: 'includeGeometry',
      flag: '--include-geometry <true|false>',
      description: 'Include longitude/latitude point geometry, default false',
      exposure: 'advanced',
      group: 'content',
      reason: 'Coordinates are useful but more location-sensitive, so they are opt-in rather than default text output.',
      valueType: 'boolean',
      defaultValue: 'false',
    },
  ],
  paramsSchema: chaptersParamsSchema,
  execute: params => listDucksUnlimitedChapters(params),
  normalizeParams: params => chaptersParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeDucksUnlimitedChaptersInput(params),
  resultKind: 'ducksunlimited.chapters',
  defaultFormat: 'text',
}

export const ducksUnlimitedProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ducksunlimited',
    name: 'Ducks Unlimited',
    description: 'No-auth Ducks Unlimited university chapter locations via ArcGIS Hub and FeatureServer JSON.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://gis.ducks.org/datasets/du-university-chapters/api',
    docsUrl: 'https://gis.ducks.org/datasets/du-university-chapters/api',
    auth: {
      mode: 'none',
      notes: ['Implemented ArcGIS Hub and FeatureServer reads require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['geocoding', 'arcgis', 'feature-server', 'ducks-unlimited', 'university-chapters', 'locations', 'json', 'no-auth'],
    freePlanNotes: [
      'Official Hub API page exposes the DU University Chapters dataset and service URL without authentication.',
      'Dataset license is Creative Commons Attribution-NonCommercial 4.0 International; CLI notes this noncommercial license in JSON metadata.',
      'Raw ArcGIS SQL is intentionally not exposed; CLI supports curated state/text/limit filters only.',
    ],
  },
  operations: [chaptersOperation],
  endpoints: [
    {
      id: 'ducksunlimited-university-chapters-query',
      method: 'GET',
      urlPattern: 'https://services2.arcgis.com/5I7u4SJE1vUr79JC/arcgis/rest/services/UniversityChapters_Public/FeatureServer/0/query',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'ArcGIS FeatureServer query endpoint for Ducks Unlimited university chapter point locations.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [
        'https://gis.ducks.org/datasets/du-university-chapters/api',
        'https://gis.ducks.org/api/search/v1/collections/dataset/items?limit=5&q=DU%20University%20Chapters',
        'https://services2.arcgis.com/5I7u4SJE1vUr79JC/arcgis/rest/services/UniversityChapters_Public/FeatureServer/0/query?f=json&where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=5',
      ],
      consumedBy: ['public-apis apis run ducksunlimited.chapters'],
      notes: ['No authentication required.', 'CLI exposes curated filters and avoids raw SQL.', 'Geometry is opt-in via --include-geometry.'],
    },
  ],
}

export type { DucksUnlimitedChaptersInput } from '../../application/usecases/ducksUnlimited.js'
