import { z } from 'zod'
import {
  normalizeIdigbioMediaInput,
  normalizeIdigbioRecordsInput,
  searchIdigbioMedia,
  searchIdigbioRecords,
  type IdigbioMediaInput,
  type IdigbioRecordsInput,
} from '../../application/usecases/idigbio.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const recordsParamsSchema = z.object({
  scientificName: z.string().optional(),
  family: z.string().optional(),
  country: z.string().optional(),
  hasImage: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<IdigbioRecordsInput>

const mediaParamsSchema = z.object({
  scientificName: z.string().optional(),
  mediaType: z.string().optional(),
  hasSpecimen: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<IdigbioMediaInput>

const recordsOperation: PublicApiOperationDefinition<IdigbioRecordsInput> = {
  id: 'idigbio.records',
  providerId: 'idigbio',
  name: 'Records',
  commandPath: ['idigbio', 'records'],
  rpcMethod: 'idigbio.records',
  description: 'Search iDigBio specimen records with bounded JSON output.',
  category: 'science',
  options: [
    {
      name: 'scientificName',
      flag: '--scientific-name <name>',
      description: 'Scientific name, default Quercus robur',
      exposure: 'primary',
      group: 'query',
      reason: 'Scientific name is a high-signal documented record query field.',
      defaultValue: 'Quercus robur',
    },
    {
      name: 'family',
      flag: '--family <name>',
      description: 'Optional family filter such as Fagaceae',
      exposure: 'primary',
      group: 'filters',
      reason: 'Family filtering is documented and keeps result sets focused.',
    },
    {
      name: 'country',
      flag: '--country <name>',
      description: 'Optional country filter such as United States',
      exposure: 'primary',
      group: 'filters',
      reason: 'Country filtering narrows specimen result sets for terminal use.',
    },
    {
      name: 'hasImage',
      flag: '--has-image <true|false>',
      description: 'Filter records by image availability',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Image availability is useful but image downloads are excluded.',
      valueType: 'boolean',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Results to request/show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'iDigBio search can return very large result sets.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Result offset for paging, CLI cap 10000',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset enables repeatable paging and offline replay.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: recordsParamsSchema,
  execute: params => searchIdigbioRecords(params),
  normalizeParams: params => normalizeIdigbioRecordsInput(
    recordsParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeIdigbioRecordsInput(params),
  resultKind: 'idigbio.records',
  defaultFormat: 'text',
}

const mediaOperation: PublicApiOperationDefinition<IdigbioMediaInput> = {
  id: 'idigbio.media',
  providerId: 'idigbio',
  name: 'Media',
  commandPath: ['idigbio', 'media'],
  rpcMethod: 'idigbio.media',
  description: 'Search iDigBio media metadata and return file URLs only.',
  category: 'science',
  options: [
    {
      name: 'scientificName',
      flag: '--scientific-name <name>',
      description: 'Related record scientific name, default Quercus robur',
      exposure: 'primary',
      group: 'query',
      reason: 'Record query scoping keeps media searches useful and bounded.',
      defaultValue: 'Quercus robur',
    },
    {
      name: 'mediaType',
      flag: '--media-type <type>',
      description: 'Optional media type such as images',
      exposure: 'primary',
      group: 'filters',
      reason: 'Media type narrows metadata without fetching binary files.',
      defaultValue: 'images',
    },
    {
      name: 'hasSpecimen',
      flag: '--has-specimen <true|false>',
      description: 'Filter media linked to specimen records',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Specimen linkage is documented and useful for collection context.',
      valueType: 'boolean',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Results to request/show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Media metadata result sets can be large and binary is excluded.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Result offset for paging, CLI cap 10000',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset enables repeatable paging and offline replay.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: mediaParamsSchema,
  execute: params => searchIdigbioMedia(params),
  normalizeParams: params => normalizeIdigbioMediaInput(
    mediaParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeIdigbioMediaInput(params),
  resultKind: 'idigbio.media',
  defaultFormat: 'text',
}

export const idigbioProvider: PublicApiProviderModule = {
  manifest: {
    id: 'idigbio',
    name: 'iDigBio',
    description: [
      'No-auth HTTPS JSON search API for specimen records and media metadata',
      'from the Integrated Digitized Biocollections aggregator.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://www.idigbio.org/',
    docsUrl: 'https://github.com/idigbio/idigbio-search-api/wiki',
    auth: {
      mode: 'none',
      notes: ['Official search API docs describe public GET read operations.'],
    },
    tags: [
      'science',
      'biodiversity',
      'specimens',
      'collections',
      'media-metadata',
      'json',
      'no-auth',
    ],
    freePlanNotes: [
      'Docs ask API users to join a mailing list for change notifications.',
      'Only bounded read-only GET JSON search endpoints are exposed.',
      [
        'Map tiles, PNG rendering, POST, browser map clicks, and media',
        'downloads are excluded.',
      ].join(' '),
    ],
  },
  operations: [recordsOperation, mediaOperation],
  endpoints: [
    {
      id: 'idigbio-records-search',
      method: 'GET',
      urlPattern: 'https://search.idigbio.org/v2/search/records/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'iDigBio documented specimen record search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/idigbio/idigbio-search-api/wiki',
        'https://search.idigbio.org/v2/search/records/?limit=1',
      ],
      consumedBy: ['public-apis apis run idigbio.records'],
      notes: [
        'No authentication required for documented GET search.',
        'CLI exposes a curated subset of iDigBio Query Format fields.',
      ],
    },
    {
      id: 'idigbio-media-search',
      method: 'GET',
      urlPattern: 'https://search.idigbio.org/v2/search/media/',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'iDigBio documented media metadata search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/idigbio/idigbio-search-api/wiki',
        'https://search.idigbio.org/v2/search/media/?limit=1',
      ],
      consumedBy: ['public-apis apis run idigbio.media'],
      notes: [
        'No authentication required for documented GET media metadata search.',
        'CLI surfaces URLs and metadata only; it does not download media files.',
      ],
    },
  ],
}

export type {
  IdigbioMediaInput,
  IdigbioRecordsInput,
} from '../../application/usecases/idigbio.js'
