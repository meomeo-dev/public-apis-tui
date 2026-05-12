import { z } from 'zod'
import {
  searchGbifOccurrences,
  searchGbifSpecies,
  normalizeGbifOccurrencesInput,
  normalizeGbifSpeciesInput,
  type GbifOccurrencesInput,
  type GbifSpeciesInput,
} from '../../application/usecases/gbif.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const speciesParamsSchema = z.object({
  query: z.string().min(1).optional(),
  rank: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  higherTaxonKey: z.number().int().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<GbifSpeciesInput>

const occurrencesParamsSchema = z.object({
  scientificName: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  year: z.string().min(1).optional(),
  basisOfRecord: z.string().min(1).optional(),
  hasCoordinate: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
}) satisfies z.ZodType<GbifOccurrencesInput>

const speciesOperation: PublicApiOperationDefinition<GbifSpeciesInput> = {
  id: 'gbif.species',
  providerId: 'gbif',
  name: 'Species search',
  commandPath: ['gbif', 'species'],
  rpcMethod: 'gbif.species',
  description: 'Search GBIF taxonomic species usage metadata.',
  category: 'science',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Taxon search text, default Quercus robur',
      exposure: 'primary',
      group: 'query',
      reason: 'GBIF species search documents q as the primary name query.',
      defaultValue: 'Quercus robur',
    },
    {
      name: 'rank',
      flag: '--rank <rank>',
      description: 'Optional taxonomic rank filter such as SPECIES',
      exposure: 'primary',
      group: 'filters',
      reason: 'Rank is a high-signal documented taxonomy filter.',
    },
    {
      name: 'status',
      flag: '--status <status>',
      description: 'Optional taxonomic status filter such as ACCEPTED',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Status narrows accepted names or synonyms without raw dumps.',
    },
    {
      name: 'higherTaxonKey',
      flag: '--higher-taxon-key <key>',
      description: 'Optional parent taxon key',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Parent taxon scoping is documented but secondary to text search.',
      valueType: 'integer',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Results to request/show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'GBIF search can be large; CLI keeps pages bounded.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Result offset for paging, CLI cap 10000',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset enables repeatable pagination and offline replay.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: speciesParamsSchema,
  execute: params => searchGbifSpecies(params),
  normalizeParams: params => normalizeGbifSpeciesInput(
    speciesParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeGbifSpeciesInput(params),
  resultKind: 'gbif.species',
  defaultFormat: 'text',
}

const occurrencesOperation: PublicApiOperationDefinition<GbifOccurrencesInput> = {
  id: 'gbif.occurrences',
  providerId: 'gbif',
  name: 'Occurrence search',
  commandPath: ['gbif', 'occurrences'],
  rpcMethod: 'gbif.occurrences',
  description: 'Search GBIF occurrence records with bounded summary output.',
  category: 'science',
  options: [
    {
      name: 'scientificName',
      flag: '--scientific-name <name>',
      description: 'Scientific name, default Quercus robur',
      exposure: 'primary',
      group: 'query',
      reason: 'Scientific name is the safest precise occurrence search input.',
      defaultValue: 'Quercus robur',
    },
    {
      name: 'country',
      flag: '--country <ISO2>',
      description: 'Optional ISO 3166-1 alpha-2 country filter',
      exposure: 'primary',
      group: 'filters',
      reason: 'Country filtering keeps occurrence result sets focused.',
    },
    {
      name: 'year',
      flag: '--year <year>',
      description: 'Optional four-digit event year',
      exposure: 'primary',
      group: 'filters',
      reason: 'Year is a common documented occurrence filter.',
    },
    {
      name: 'basisOfRecord',
      flag: '--basis-of-record <type>',
      description: 'Optional basis of record such as HUMAN_OBSERVATION',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Basis of record is useful after choosing a taxon and country.',
    },
    {
      name: 'hasCoordinate',
      flag: '--has-coordinate <true|false>',
      description: 'Filter records with coordinates',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Coordinate filtering is useful but may exclude valid records.',
      valueType: 'boolean',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Results to request/show, default 10, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Occurrence search payloads are large, so output is capped.',
      valueType: 'integer',
      defaultValue: '10',
    },
    {
      name: 'offset',
      flag: '--offset <count>',
      description: 'Result offset for paging, CLI cap 10000',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Offset enables repeatable pagination and offline replay.',
      valueType: 'integer',
      defaultValue: '0',
    },
  ],
  paramsSchema: occurrencesParamsSchema,
  execute: params => searchGbifOccurrences(params),
  normalizeParams: params => normalizeGbifOccurrencesInput(
    occurrencesParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeGbifOccurrencesInput(params),
  resultKind: 'gbif.occurrences',
  defaultFormat: 'text',
}

export const gbifProvider: PublicApiProviderModule = {
  manifest: {
    id: 'gbif',
    name: 'GBIF',
    description: [
      'No-auth HTTPS JSON API for biodiversity taxonomy and occurrence',
      'metadata from the Global Biodiversity Information Facility.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://www.gbif.org/',
    docsUrl: 'https://techdocs.gbif.org/en/openapi/',
    auth: {
      mode: 'none',
      notes: [
        'Official API docs state most use requires no authentication.',
        'POST/PUT/DELETE, downloads, and some authenticated surfaces are not used.',
      ],
    },
    tags: [
      'science',
      'biodiversity',
      'taxonomy',
      'occurrences',
      'species',
      'json',
      'no-auth',
    ],
    freePlanNotes: [
      'Search APIs may be rate limited; CLI defaults to 10 and caps pages at 50.',
      'Only read-only GET JSON search endpoints are exposed.',
      [
        'Website scraping, bulk downloads, image APIs, and mutating registry',
        'APIs are excluded.',
      ].join(' '),
    ],
  },
  operations: [speciesOperation, occurrencesOperation],
  endpoints: [
    {
      id: 'gbif-species-search',
      method: 'GET',
      urlPattern: 'https://api.gbif.org/v1/species/search',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-10',
      description: 'GBIF Species API search endpoint for taxonomic usage metadata.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://techdocs.gbif.org/en/openapi/',
        'https://techdocs.gbif.org/openapi/checklistbank.json',
        'https://api.gbif.org/v1/species/search?q=Quercus%20robur&limit=2',
      ],
      consumedBy: ['public-apis apis run gbif.species'],
      notes: [
        'No authentication required for this read-only GET search.',
        'CLI exposes a curated bounded subset of documented query parameters.',
      ],
    },
    {
      id: 'gbif-occurrence-search',
      method: 'GET',
      urlPattern: 'https://api.gbif.org/v1/occurrence/search',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-10',
      description: 'GBIF Occurrence API search endpoint for occurrence records.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://techdocs.gbif.org/en/openapi/',
        'https://techdocs.gbif.org/openapi/occurrence.json',
        [
          'https://api.gbif.org/v1/occurrence/search',
          '?scientificName=Quercus%20robur&country=GB&limit=2',
        ].join(''),
      ],
      consumedBy: ['public-apis apis run gbif.occurrences'],
      notes: [
        'No authentication required for this read-only GET search.',
        'CLI projects bounded summaries and excludes occurrence downloads.',
      ],
    },
  ],
}

export type {
  GbifOccurrencesInput,
  GbifSpeciesInput,
} from '../../application/usecases/gbif.js'
