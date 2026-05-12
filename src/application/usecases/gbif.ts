import {
  GBIF_DEFAULT_LIMIT,
  GBIF_DEFAULT_OCCURRENCE_NAME,
  GBIF_DEFAULT_SPECIES_QUERY,
  GBIF_MAX_LIMIT,
  GBIF_MAX_OFFSET,
  GbifClient,
  type GbifOccurrenceRecord,
  type GbifOccurrenceSearchQuery,
  type GbifSpeciesSearchQuery,
  type GbifSpeciesUsage,
} from '../../infrastructure/openApis/gbifClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type GbifSpeciesInput = {
  query?: string | undefined
  rank?: string | undefined
  status?: string | undefined
  higherTaxonKey?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type GbifOccurrencesInput = {
  scientificName?: string | undefined
  country?: string | undefined
  year?: string | undefined
  basisOfRecord?: string | undefined
  hasCoordinate?: boolean | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type GbifApiMeta = {
  provider: 'gbif'
  endpoint: 'GET /v1/species/search' | 'GET /v1/occurrence/search'
  docsUrl: 'https://techdocs.gbif.org/en/openapi/'
  apiUrl: 'https://api.gbif.org/v1'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  rateLimitPolicy: string
  boundary: string
  limitCap: number
  offsetCap: number
}

export type GbifSpeciesSummary = {
  key?: number | undefined
  nubKey?: number | undefined
  scientificName?: string | undefined
  canonicalName?: string | undefined
  rank?: string | undefined
  taxonomicStatus?: string | undefined
  kingdom?: string | undefined
  family?: string | undefined
  genus?: string | undefined
  species?: string | undefined
  nameType?: string | undefined
  synonym?: boolean | undefined
  numOccurrences?: number | undefined
}

export type GbifOccurrenceSummary = {
  key?: number | undefined
  gbifID?: string | undefined
  scientificName?: string | undefined
  acceptedScientificName?: string | undefined
  country?: string | undefined
  countryCode?: string | undefined
  eventDate?: string | undefined
  year?: number | undefined
  basisOfRecord?: string | undefined
  datasetKey?: string | undefined
  datasetTitle?: string | undefined
  publishingOrgKey?: string | undefined
  license?: string | undefined
  coordinates?: {
    latitude: number
    longitude: number
  } | undefined
  issues: string[]
  mediaCount: number
}

export type GbifSpeciesResult = {
  kind: 'gbif.species'
  api: GbifApiMeta
  query: GbifSpeciesSearchQuery
  pagination: {
    total: number
    returned: number
    limit: number
    offset: number
    nextOffset?: number | undefined
    endOfRecords?: boolean | undefined
    maxLimit: number
    maxOffset: number
  }
  count: number
  species: GbifSpeciesSummary[]
}

export type GbifOccurrencesResult = {
  kind: 'gbif.occurrences'
  api: GbifApiMeta
  query: GbifOccurrenceSearchQuery
  pagination: {
    total: number
    returned: number
    limit: number
    offset: number
    nextOffset?: number | undefined
    endOfRecords?: boolean | undefined
    maxLimit: number
    maxOffset: number
  }
  count: number
  occurrences: GbifOccurrenceSummary[]
}

export async function searchGbifSpecies(
  input: GbifSpeciesInput = {},
): Promise<GbifSpeciesResult> {
  const query = normalizeGbifSpeciesInput(input)
  const client = new GbifClient()
  const page = await client.searchSpecies(query)
  const species = page.results.map(projectSpecies)
  return {
    kind: 'gbif.species',
    api: createApiMeta('GET /v1/species/search'),
    query,
    pagination: createPagination({
      total: page.count,
      returned: species.length,
      limit: page.limit,
      offset: page.offset,
      endOfRecords: page.endOfRecords,
    }),
    count: species.length,
    species,
  }
}

export async function searchGbifOccurrences(
  input: GbifOccurrencesInput = {},
): Promise<GbifOccurrencesResult> {
  const query = normalizeGbifOccurrencesInput(input)
  const client = new GbifClient()
  const page = await client.searchOccurrences(query)
  const occurrences = page.results.map(projectOccurrence)
  return {
    kind: 'gbif.occurrences',
    api: createApiMeta('GET /v1/occurrence/search'),
    query,
    pagination: createPagination({
      total: page.count,
      returned: occurrences.length,
      limit: page.limit,
      offset: page.offset,
      endOfRecords: page.endOfRecords,
    }),
    count: occurrences.length,
    occurrences,
  }
}

export function normalizeGbifSpeciesInput(
  input: GbifSpeciesInput = {},
): GbifSpeciesSearchQuery {
  return {
    query: normalizeText(input.query, 'query', GBIF_DEFAULT_SPECIES_QUERY),
    rank: normalizeOptionalText(input.rank, 'rank', 40),
    status: normalizeOptionalText(input.status, 'status', 40),
    higherTaxonKey: normalizeOptionalPositiveInteger(
      input.higherTaxonKey,
      'higher-taxon-key',
    ),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeGbifOccurrencesInput(
  input: GbifOccurrencesInput = {},
): GbifOccurrenceSearchQuery {
  return {
    scientificName: normalizeText(
      input.scientificName,
      'scientific-name',
      GBIF_DEFAULT_OCCURRENCE_NAME,
    ),
    country: normalizeCountry(input.country),
    year: normalizeYear(input.year),
    basisOfRecord: normalizeOptionalText(input.basisOfRecord, 'basis-of-record', 50),
    hasCoordinate: input.hasCoordinate,
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

function createApiMeta(endpoint: GbifApiMeta['endpoint']): GbifApiMeta {
  return {
    provider: 'gbif',
    endpoint,
    docsUrl: 'https://techdocs.gbif.org/en/openapi/',
    apiUrl: 'https://api.gbif.org/v1',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    rateLimitPolicy: (
      'GBIF documents rate limits for search APIs; CLI defaults to small ' +
      'bounded pages and supports persistence/offline replay.'
    ),
    boundary: (
      'Read-only GET JSON search only; downloads, registry writes, image ' +
      'APIs, POST/PUT/DELETE, and www.gbif.org scraping are not exposed.'
    ),
    limitCap: GBIF_MAX_LIMIT,
    offsetCap: GBIF_MAX_OFFSET,
  }
}

function createPagination(input: {
  total: number
  returned: number
  limit: number
  offset: number
  endOfRecords?: boolean | undefined
}): GbifSpeciesResult['pagination'] {
  const nextOffset = input.offset + input.returned
  const hasNext = input.returned > 0 && nextOffset < input.total
  return {
    total: input.total,
    returned: input.returned,
    limit: input.limit,
    offset: input.offset,
    ...(hasNext ? { nextOffset } : {}),
    ...(input.endOfRecords !== undefined ? { endOfRecords: input.endOfRecords } : {}),
    maxLimit: GBIF_MAX_LIMIT,
    maxOffset: GBIF_MAX_OFFSET,
  }
}

function projectSpecies(value: GbifSpeciesUsage): GbifSpeciesSummary {
  return omitUndefined({
    key: value.key,
    nubKey: value.nubKey,
    scientificName: value.scientificName,
    canonicalName: value.canonicalName,
    rank: value.rank,
    taxonomicStatus: value.taxonomicStatus,
    kingdom: value.kingdom,
    family: value.family,
    genus: value.genus,
    species: value.species,
    nameType: value.nameType,
    synonym: value.synonym,
    numOccurrences: value.numOccurrences,
  })
}

function projectOccurrence(value: GbifOccurrenceRecord): GbifOccurrenceSummary {
  const latitude = value.decimalLatitude
  const longitude = value.decimalLongitude
  return omitUndefined({
    key: value.key,
    gbifID: value.gbifID,
    scientificName: value.scientificName,
    acceptedScientificName: value.acceptedScientificName,
    country: value.country,
    countryCode: value.countryCode,
    eventDate: value.eventDate,
    year: value.year,
    basisOfRecord: value.basisOfRecord,
    datasetKey: value.datasetKey,
    datasetTitle: value.datasetTitle,
    publishingOrgKey: value.publishingOrgKey,
    license: value.license,
    coordinates: typeof latitude === 'number' && typeof longitude === 'number'
      ? { latitude, longitude }
      : undefined,
    issues: value.issues ?? [],
    mediaCount: value.media?.length ?? 0,
  })
}

function normalizeText(
  value: string | undefined,
  label: string,
  defaultValue: string,
): string {
  const text = value?.trim() || defaultValue
  if (text.length > 200) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GBIF --${label} must be 200 characters or fewer.`,
      { [label]: value },
    )
  }
  return text
}

function normalizeOptionalText(
  value: string | undefined,
  label: string,
  maxLength: number,
): string | undefined {
  const text = value?.trim()
  if (text === undefined || text === '') {
    return undefined
  }
  if (text.length > maxLength) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GBIF --${label} must be ${maxLength} characters or fewer.`,
      { [label]: value },
    )
  }
  return text
}

function normalizeCountry(value: string | undefined): string | undefined {
  const country = value?.trim()
  if (country === undefined || country === '') {
    return undefined
  }
  if (!/^[A-Za-z]{2}$/u.test(country)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'GBIF --country must be an ISO 3166-1 alpha-2 country code.',
      { country: value },
    )
  }
  return country.toUpperCase()
}

function normalizeYear(value: string | undefined): string | undefined {
  const year = normalizeOptionalText(value, 'year', 15)
  if (year === undefined) {
    return undefined
  }
  if (!/^\d{4}(?:,\d{4})*$/u.test(year) && !/^\d{4},\d{4}$/u.test(year)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'GBIF --year must be a four-digit year or provider year range.',
      { year: value },
    )
  }
  return year
}

function normalizeOptionalPositiveInteger(
  value: number | undefined,
  label: string,
): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GBIF --${label} must be a positive integer.`,
      { [label]: value },
    )
  }
  return value
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? GBIF_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > GBIF_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GBIF --limit must be an integer from 1 to ${GBIF_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (!Number.isInteger(offset) || offset < 0 || offset > GBIF_MAX_OFFSET) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GBIF --offset must be an integer from 0 to ${GBIF_MAX_OFFSET}.`,
      { offset: value },
    )
  }
  return offset
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
