import { z } from 'zod'
import {
  ITIS_DEFAULT_LIMIT,
  ITIS_DEFAULT_SEARCH,
  ITIS_DEFAULT_TSN,
  ITIS_MAX_LIMIT,
  ITIS_MAX_OFFSET,
  getItisRecord,
  normalizeItisRecordInput,
  normalizeItisSearchInput,
  searchItisScientificNames,
  type ItisRecordInput,
  type ItisSearchInput,
} from '../../application/usecases/itis.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<ItisSearchInput>

const recordParamsSchema = z.object({
  tsn: z.string().optional(),
  commonLimit: z.number().int().optional(),
  synonymLimit: z.number().int().optional(),
}) satisfies z.ZodType<ItisRecordInput>

const searchOperation: PublicApiOperationDefinition<ItisSearchInput> = {
  id: 'itis.search',
  providerId: 'itis',
  name: 'Scientific name search',
  commandPath: ['itis', 'search'],
  rpcMethod: 'itis.search',
  description: 'Search ITIS taxonomy records by scientific name.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Scientific name search text, default ${ITIS_DEFAULT_SEARCH}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented searchByScientificName srchKey parameter.',
      valueType: 'string',
      defaultValue: ITIS_DEFAULT_SEARCH,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to show, 1-${ITIS_MAX_LIMIT}, default ${ITIS_DEFAULT_LIMIT}.`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Caps readable terminal output and persisted cache payloads.',
      valueType: 'integer',
      defaultValue: String(ITIS_DEFAULT_LIMIT),
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: `Rows to skip, 0-${ITIS_MAX_OFFSET}, default 0.`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Supports repeatable pagination over the returned name list.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchItisScientificNames(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeItisSearchInput(params),
  resultKind: 'itis.search',
  defaultFormat: 'text',
}

const recordOperation: PublicApiOperationDefinition<ItisRecordInput> = {
  id: 'itis.record',
  providerId: 'itis',
  name: 'Full record by TSN',
  commandPath: ['itis', 'record'],
  rpcMethod: 'itis.record',
  description: 'Fetch an ITIS full taxonomy record by Taxonomic Serial Number.',
  category: 'science',
  options: [
    {
      name: 'tsn',
      flag: '--tsn <digits>',
      description: `ITIS Taxonomic Serial Number, default ${ITIS_DEFAULT_TSN}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented getFullRecordFromTSN tsn parameter.',
      valueType: 'string',
      defaultValue: ITIS_DEFAULT_TSN,
    },
    {
      name: 'commonLimit',
      flag: '--common-limit <count>',
      description: 'Common names to show, 0-20, default 5.',
      exposure: 'primary',
      group: 'presentation',
      reason: 'Keeps long common-name lists readable in terminal output.',
      valueType: 'integer',
      defaultValue: '5',
    },
    {
      name: 'synonymLimit',
      flag: '--synonym-limit <count>',
      description: 'Synonyms to show, 0-30, default 10.',
      exposure: 'primary',
      group: 'presentation',
      reason: 'Keeps long synonym lists readable in terminal output.',
      valueType: 'integer',
      defaultValue: '10',
    },
  ],
  paramsSchema: recordParamsSchema,
  execute: params => getItisRecord(params),
  normalizeParams: params => recordParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeItisRecordInput(params),
  resultKind: 'itis.record',
  defaultFormat: 'text',
}

export const itisProvider: PublicApiProviderModule = {
  manifest: {
    id: 'itis',
    name: 'ITIS',
    description: [
      'No-auth HTTPS JSON access to Integrated Taxonomic Information System',
      'scientific names and TSN taxonomy records.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://www.itis.gov/',
    docsUrl: 'https://www.itis.gov/ws_description.html',
    auth: {
      mode: 'none',
      notes: [
        [
          'Selected JSON service endpoints return taxonomy data without API',
          'key, OAuth, cookies, account setup, or browser session requirements.',
        ].join(' '),
      ],
    },
    tags: ['science', 'taxonomy', 'biodiversity', 'species', 'no-auth', 'json'],
    freePlanNotes: [
      'No API key or quota signup is documented for selected JSON service calls.',
      'Responses use text/json content type and JSON bodies.',
      [
        'The CLI exposes curated search and full-record operations only, not',
        'arbitrary web-service route proxying or bulk database downloads.',
      ].join(' '),
    ],
  },
  operations: [searchOperation, recordOperation],
  endpoints: [
    {
      id: 'itis-search-scientific-name',
      method: 'GET',
      urlPattern: 'https://www.itis.gov/ITISWebService/jsonservice/searchByScientificName*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'ITIS scientific-name JSON search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.itis.gov/ws_description.html',
        'https://www.itis.gov/ITISWebService/jsonservice/searchByScientificName?srchKey=Quercus%20robur',
      ],
      consumedBy: ['public-apis apis run itis.search'],
      notes: [
        'No authentication required in live probes.',
        'CLI exposes only scientific-name search, not arbitrary ITIS methods.',
      ],
    },
    {
      id: 'itis-full-record',
      method: 'GET',
      urlPattern: 'https://www.itis.gov/ITISWebService/jsonservice/getFullRecordFromTSN*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'ITIS full taxonomy record by TSN JSON endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.itis.gov/ws_description.html',
        'https://www.itis.gov/ITISWebService/jsonservice/getFullRecordFromTSN?tsn=19405',
      ],
      consumedBy: ['public-apis apis run itis.record'],
      notes: [
        'No authentication required in live probes.',
        'CLI projects bounded record summaries and official report links.',
      ],
    },
  ],
}

export type { ItisRecordInput, ItisSearchInput } from '../../application/usecases/itis.js'
