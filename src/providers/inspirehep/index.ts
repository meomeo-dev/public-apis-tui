import { z } from 'zod'
import {
  normalizeInspireHepRecordInput,
  normalizeInspireHepSearchInput,
  searchInspireHep,
  getInspireHepRecord,
  type InspireHepRecordInput,
  type InspireHepSearchInput,
} from '../../application/usecases/inspireHep.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  sort: z.string().optional(),
  limit: z.number().int().optional(),
  page: z.number().int().optional(),
  abstractLength: z.number().int().optional(),
}) satisfies z.ZodType<InspireHepSearchInput>

const recordParamsSchema = z.object({
  recid: z.number().int().optional(),
  abstractLength: z.number().int().optional(),
}) satisfies z.ZodType<InspireHepRecordInput>

const searchOperation: PublicApiOperationDefinition<InspireHepSearchInput> = {
  id: 'inspirehep.search',
  providerId: 'inspirehep',
  name: 'Literature search',
  commandPath: ['inspirehep', 'search'],
  rpcMethod: 'inspirehep.search',
  description: 'Search INSPIRE HEP literature metadata through no-auth JSON.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <query>',
      description: 'INSPIRE literature query, default higgs',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented literature endpoint is query-driven.',
      defaultValue: 'higgs',
    },
    {
      name: 'sort',
      flag: '--sort <mostrecent|mostcited>',
      description: 'Optional literature sort order',
      exposure: 'primary',
      group: 'filters',
      reason: 'Docs define these literature sort orders for search results.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Results to request/show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'INSPIRE can return large result sets; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: '1-based result page, default 1, CLI cap 400',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Page supports documented pagination without raw URL proxying.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'abstractLength',
      flag: '--abstract-length <count>',
      description: 'Maximum abstract characters, default 500, 0 hides abstracts',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Abstracts can be long; bounded text keeps output/cache readable.',
      valueType: 'integer',
      defaultValue: '500',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchInspireHep(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeInspireHepSearchInput(params),
  resultKind: 'inspirehep.search',
  defaultFormat: 'text',
}

const recordOperation: PublicApiOperationDefinition<InspireHepRecordInput> = {
  id: 'inspirehep.record',
  providerId: 'inspirehep',
  name: 'Literature record',
  commandPath: ['inspirehep', 'record'],
  rpcMethod: 'inspirehep.record',
  description: 'Fetch one INSPIRE HEP literature JSON record by recid.',
  category: 'science',
  options: [
    {
      name: 'recid',
      flag: '--recid <id>',
      description: 'INSPIRE literature record id, default 4328',
      exposure: 'primary',
      group: 'query',
      reason: 'Internal literature record ids are documented GET identifiers.',
      valueType: 'integer',
      defaultValue: '4328',
    },
    {
      name: 'abstractLength',
      flag: '--abstract-length <count>',
      description: 'Maximum abstract characters, default 500, 0 hides abstract',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Single-record abstracts can be long in terminal output.',
      valueType: 'integer',
      defaultValue: '500',
    },
  ],
  paramsSchema: recordParamsSchema,
  execute: params => getInspireHepRecord(params),
  normalizeParams: params => recordParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeInspireHepRecordInput(params),
  resultKind: 'inspirehep.record',
  defaultFormat: 'text',
}

export const inspireHepProvider: PublicApiProviderModule = {
  manifest: {
    id: 'inspirehep',
    name: 'INSPIRE HEP',
    description: [
      'No-auth HTTPS JSON metadata API for high-energy physics literature',
      'search and record lookup.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://inspirehep.net/',
    docsUrl: 'https://github.com/inspirehep/rest-api-doc',
    auth: {
      mode: 'none',
      notes: ['Official REST docs describe read-only GET JSON operations.'],
    },
    tags: [
      'science',
      'physics',
      'literature',
      'metadata',
      'citations',
      'json',
      'no-auth',
    ],
    freePlanNotes: [
      'Official rate limit is 15 requests per 5 seconds per IP address.',
      [
        'Most metadata is CC0, but restrictions apply to some fields and',
        'bulk email collection is forbidden.',
      ].join(' '),
      [
        'CLI exposes literature JSON metadata only; bibliography POST,',
        'BibTeX/LaTeX/CV rendering, downloads, and email harvesting are',
        'excluded.',
      ].join(' '),
    ],
  },
  operations: [searchOperation, recordOperation],
  endpoints: [
    {
      id: 'inspirehep-literature-search',
      method: 'GET',
      urlPattern: 'regex:^https://inspirehep\\.net/api/literature(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'INSPIRE HEP documented literature search endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/inspirehep/rest-api-doc',
        'https://inspirehep.net/api/literature?q=higgs&size=1',
      ],
      consumedBy: ['public-apis apis run inspirehep.search'],
      notes: [
        'No authentication required for documented GET literature search.',
        'CLI uses the fields parameter to avoid large raw metadata payloads.',
      ],
    },
    {
      id: 'inspirehep-literature-record',
      method: 'GET',
      urlPattern: 'regex:^https://inspirehep\\.net/api/literature/[0-9]+(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'INSPIRE HEP documented literature record endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/inspirehep/rest-api-doc',
        'https://inspirehep.net/api/literature/4328',
      ],
      consumedBy: ['public-apis apis run inspirehep.record'],
      notes: [
        'No authentication required for documented GET record lookup.',
        'Alternative BibTeX/LaTeX/CV formats are intentionally not exposed.',
      ],
    },
  ],
}

export type {
  InspireHepRecordInput,
  InspireHepSearchInput,
} from '../../application/usecases/inspireHep.js'
