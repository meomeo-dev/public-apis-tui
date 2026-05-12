import { z } from 'zod'
import {
  NASA_DEFAULT_ASSET_ID,
  NASA_DEFAULT_MEDIA_TYPE,
  NASA_DEFAULT_PAGE,
  NASA_DEFAULT_PAGE_SIZE,
  NASA_DEFAULT_QUERY,
  NASA_MAX_PAGE,
  NASA_MAX_PAGE_SIZE,
  listNasaAsset,
  normalizeNasaAssetInput,
  normalizeNasaSearchInput,
  searchNasaImages,
  type NasaAssetInput,
  type NasaSearchInput,
} from '../../application/usecases/nasa.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  mediaType: z.string().optional(),
  center: z.string().optional(),
  yearStart: z.union([z.number(), z.string()]).optional(),
  yearEnd: z.union([z.number(), z.string()]).optional(),
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
}) satisfies z.ZodType<NasaSearchInput>

const assetParamsSchema = z.object({
  nasaId: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<NasaAssetInput>

const searchOperation: PublicApiOperationDefinition<NasaSearchInput> = {
  id: 'nasa.search',
  providerId: 'nasa',
  name: 'NASA media search',
  commandPath: ['nasa', 'search'],
  rpcMethod: 'nasa.search',
  description: 'Search NASA Image and Video Library metadata.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search terms, default "${NASA_DEFAULT_QUERY}".`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented Image Library search q parameter.',
      valueType: 'string',
      defaultValue: NASA_DEFAULT_QUERY,
    },
    {
      name: 'mediaType',
      flag: '--media-type <image|audio|video>',
      description: `Media type filter, default ${NASA_DEFAULT_MEDIA_TYPE}.`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Curates the documented media_type values for terminal browsing.',
      valueType: 'string',
      defaultValue: NASA_DEFAULT_MEDIA_TYPE,
    },
    {
      name: 'pageSize',
      flag: '--page-size <count>',
      description: [
        `Items to request, 1-${NASA_MAX_PAGE_SIZE},`,
        `default ${NASA_DEFAULT_PAGE_SIZE}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Uses documented page_size while bounding terminal output.',
      valueType: 'integer',
      defaultValue: String(NASA_DEFAULT_PAGE_SIZE),
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: `Search page, 1-${NASA_MAX_PAGE}, default ${NASA_DEFAULT_PAGE}.`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Maps to documented page pagination for repeatable offline replay.',
      valueType: 'integer',
      defaultValue: String(NASA_DEFAULT_PAGE),
    },
    {
      name: 'center',
      flag: '--center <code>',
      description: 'NASA center filter, for example JSC or GSFC.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to the documented center filter without exposing raw fields.',
      valueType: 'string',
    },
    {
      name: 'yearStart',
      flag: '--year-start <year>',
      description: 'Earliest creation year, 1900-2100.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented year_start for bounded historical searches.',
      valueType: 'integer',
    },
    {
      name: 'yearEnd',
      flag: '--year-end <year>',
      description: 'Latest creation year, 1900-2100.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented year_end for bounded historical searches.',
      valueType: 'integer',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchNasaImages(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNasaSearchInput(params),
  resultKind: 'nasa.search',
  defaultFormat: 'text',
}

const assetOperation: PublicApiOperationDefinition<NasaAssetInput> = {
  id: 'nasa.asset',
  providerId: 'nasa',
  name: 'NASA asset manifest',
  commandPath: ['nasa', 'asset'],
  rpcMethod: 'nasa.asset',
  description: 'List file URLs from a NASA Image Library asset manifest.',
  category: 'science',
  options: [
    {
      name: 'nasaId',
      flag: '--nasa-id <id>',
      description: `NASA asset id, default ${NASA_DEFAULT_ASSET_ID}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented asset manifest nasa_id path parameter.',
      valueType: 'string',
      defaultValue: NASA_DEFAULT_ASSET_ID,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Manifest file URLs to show, 1-${NASA_MAX_PAGE_SIZE},`,
        `default ${NASA_DEFAULT_PAGE_SIZE}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Keeps asset manifests bounded and avoids raw media download.',
      valueType: 'integer',
      defaultValue: String(NASA_DEFAULT_PAGE_SIZE),
    },
  ],
  paramsSchema: assetParamsSchema,
  execute: params => listNasaAsset(params),
  normalizeParams: params => assetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNasaAssetInput(params),
  resultKind: 'nasa.asset',
  defaultFormat: 'text',
}

export const nasaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nasa',
    name: 'NASA',
    description: [
      'No-auth HTTPS JSON metadata access to NASA Image and Video Library',
      'search results and asset manifests.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://images.nasa.gov/',
    docsUrl: 'https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf',
    auth: {
      mode: 'none',
      notes: [
        [
          'Selected images-api.nasa.gov GET endpoints return JSON without',
          'API key, OAuth, account setup, cookies, or browser sessions.',
        ].join(' '),
        'api.nasa.gov endpoints that require api_key are excluded.',
      ],
    },
    tags: ['science', 'space', 'media-metadata', 'nasa', 'no-auth', 'json'],
    freePlanNotes: [
      'No public quota was found for images-api.nasa.gov metadata endpoints.',
      [
        'The CLI exposes metadata and file URLs only; it does not download',
        'images, audio, video, captions, or binary payloads.',
      ].join(' '),
    ],
  },
  operations: [searchOperation, assetOperation],
  endpoints: [
    {
      id: 'nasa-images-search',
      method: 'GET',
      urlPattern: 'https://images-api.nasa.gov/search*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'NASA Image and Video Library search JSON endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf',
        'https://images-api.nasa.gov/search?q=apollo%2011&media_type=image&page_size=2',
      ],
      consumedBy: ['public-apis apis run nasa.search'],
      notes: [
        'No authentication required in live probes.',
        [
          'Excludes api.nasa.gov api_key endpoints, HTML pages, browser',
          'scraping, raw media downloads, binary, and base64 payloads.',
        ].join(' '),
      ],
    },
    {
      id: 'nasa-images-asset',
      method: 'GET',
      urlPattern: 'regex:^https://images-api\\.nasa\\.gov/asset/[^/?]+$',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'NASA Image and Video Library asset manifest JSON endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf',
        'https://images-api.nasa.gov/asset/as11-40-5874',
      ],
      consumedBy: ['public-apis apis run nasa.asset'],
      notes: [
        'No authentication required in live probes.',
        'CLI lists manifest file URLs but does not fetch binary media files.',
      ],
    },
  ],
}

export type {
  NasaAssetInput,
  NasaSearchInput,
} from '../../application/usecases/nasa.js'
