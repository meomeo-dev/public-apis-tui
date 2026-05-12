import {
  IDIGBIO_DEFAULT_LIMIT,
  IDIGBIO_DEFAULT_QUERY,
  IDIGBIO_MAX_LIMIT,
  IDIGBIO_MAX_OFFSET,
  IdigbioClient,
  type IdigbioSearchItem,
  type IdigbioSearchQuery,
} from '../../infrastructure/openApis/idigbioClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type IdigbioRecordsInput = {
  scientificName?: string | undefined
  family?: string | undefined
  country?: string | undefined
  hasImage?: boolean | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type IdigbioMediaInput = {
  scientificName?: string | undefined
  mediaType?: string | undefined
  hasSpecimen?: boolean | undefined
  limit?: number | undefined
  offset?: number | undefined
}

type IdigbioApiMeta = {
  provider: 'idigbio'
  endpoint: 'GET /v2/search/records/' | 'GET /v2/search/media/'
  docsUrl: 'https://github.com/idigbio/idigbio-search-api/wiki'
  apiUrl: 'https://search.idigbio.org/v2'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  queryFormat: string
  limitCap: number
  offsetCap: number
}

export type IdigbioRecordsResult = {
  kind: 'idigbio.records'
  api: IdigbioApiMeta
  query: IdigbioSearchQuery & {
    scientificName?: string | undefined
    family?: string | undefined
    country?: string | undefined
    hasImage?: boolean | undefined
  }
  pagination: IdigbioPagination
  count: number
  lastModified?: string | undefined
  records: Array<Record<string, unknown>>
}

export type IdigbioMediaResult = {
  kind: 'idigbio.media'
  api: IdigbioApiMeta
  query: IdigbioSearchQuery & {
    scientificName?: string | undefined
    mediaType?: string | undefined
    hasSpecimen?: boolean | undefined
  }
  pagination: IdigbioPagination
  count: number
  lastModified?: string | undefined
  media: Array<Record<string, unknown>>
}

type IdigbioPagination = {
  total: number
  returned: number
  limit: number
  offset: number
  nextOffset?: number | undefined
  maxLimit: number
  maxOffset: number
}

export async function searchIdigbioRecords(
  input: IdigbioRecordsInput = {},
): Promise<IdigbioRecordsResult> {
  const query = normalizeIdigbioRecordsInput(input)
  const page = await new IdigbioClient().searchRecords(query)
  const records = page.items.map(projectRecord)
  return {
    kind: 'idigbio.records',
    api: createApiMeta('GET /v2/search/records/'),
    query,
    pagination: createPagination({
      total: page.itemCount,
      returned: records.length,
      limit: query.limit,
      offset: query.offset,
    }),
    count: records.length,
    lastModified: page.lastModified,
    records,
  }
}

export async function searchIdigbioMedia(
  input: IdigbioMediaInput = {},
): Promise<IdigbioMediaResult> {
  const query = normalizeIdigbioMediaInput(input)
  const page = await new IdigbioClient().searchMedia(query)
  const media = page.items.map(projectMedia)
  return {
    kind: 'idigbio.media',
    api: createApiMeta('GET /v2/search/media/'),
    query,
    pagination: createPagination({
      total: page.itemCount,
      returned: media.length,
      limit: query.limit,
      offset: query.offset,
    }),
    count: media.length,
    lastModified: page.lastModified,
    media,
  }
}

export function normalizeIdigbioRecordsInput(
  input: IdigbioRecordsInput = {},
): IdigbioRecordsResult['query'] {
  const scientificName = normalizeOptionalText(
    input.scientificName,
    'scientific-name',
    120,
  ) ?? IDIGBIO_DEFAULT_QUERY
  const family = normalizeOptionalText(input.family, 'family', 80)
  const country = normalizeOptionalText(input.country, 'country', 80)
  const rq = omitUndefined({
    scientificname: scientificName,
    family,
    country,
    hasImage: input.hasImage,
  })
  return {
    rq,
    scientificName,
    family,
    country,
    hasImage: input.hasImage,
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeIdigbioMediaInput(
  input: IdigbioMediaInput = {},
): IdigbioMediaResult['query'] {
  const scientificName = normalizeOptionalText(
    input.scientificName,
    'scientific-name',
    120,
  ) ?? IDIGBIO_DEFAULT_QUERY
  const mediaType = normalizeOptionalText(input.mediaType, 'media-type', 40)
    ?? 'images'
  const rq = { scientificname: scientificName }
  const mq = omitUndefined({
    mediatype: mediaType,
    hasSpecimen: input.hasSpecimen,
  })
  return {
    rq,
    ...(Object.keys(mq).length > 0 ? { mq } : {}),
    scientificName,
    mediaType,
    hasSpecimen: input.hasSpecimen,
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

function createApiMeta(endpoint: IdigbioApiMeta['endpoint']): IdigbioApiMeta {
  return {
    provider: 'idigbio',
    endpoint,
    docsUrl: 'https://github.com/idigbio/idigbio-search-api/wiki',
    apiUrl: 'https://search.idigbio.org/v2',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: (
      'Read-only GET JSON search only; POST, map creation, map tiles, PNG ' +
      'rendering, browser map clicks, and image downloads are not exposed.'
    ),
    queryFormat: 'iDigBio Query Format JSON encoded in GET query parameters.',
    limitCap: IDIGBIO_MAX_LIMIT,
    offsetCap: IDIGBIO_MAX_OFFSET,
  }
}

function createPagination(input: {
  total: number
  returned: number
  limit: number
  offset: number
}): IdigbioPagination {
  const nextOffset = input.offset + input.returned
  return {
    total: input.total,
    returned: input.returned,
    limit: input.limit,
    offset: input.offset,
    ...(input.returned > 0 && nextOffset < input.total ? { nextOffset } : {}),
    maxLimit: IDIGBIO_MAX_LIMIT,
    maxOffset: IDIGBIO_MAX_OFFSET,
  }
}

function projectRecord(item: IdigbioSearchItem): Record<string, unknown> {
  const data = item.data
  const indexTerms = item.indexTerms
  return omitUndefined({
    uuid: item.uuid,
    type: item.type,
    etag: item.etag,
    scientificName: readString(indexTerms, 'scientificname')
      ?? readString(data, 'dwc:scientificName'),
    family: readString(indexTerms, 'family') ?? readString(data, 'dwc:family'),
    country: readString(indexTerms, 'country') ?? readString(data, 'dwc:country'),
    stateProvince: readString(indexTerms, 'stateprovince')
      ?? readString(data, 'dwc:stateProvince'),
    county: readString(indexTerms, 'county') ?? readString(data, 'dwc:county'),
    locality: readString(indexTerms, 'locality') ?? readString(data, 'dwc:locality'),
    eventDate: readString(indexTerms, 'eventdate')
      ?? readString(data, 'dwc:eventDate'),
    basisOfRecord: readString(indexTerms, 'basisofrecord')
      ?? readString(data, 'dwc:basisOfRecord'),
    institutionCode: readString(data, 'dwc:institutionCode')
      ?? readString(indexTerms, 'institutioncode'),
    collectionCode: readString(data, 'dwc:collectionCode')
      ?? readString(indexTerms, 'collectioncode'),
    catalogNumber: readString(data, 'dwc:catalogNumber')
      ?? readString(indexTerms, 'catalognumber'),
    coordinates: readCoordinates(indexTerms, data),
    hasImage: readBoolean(indexTerms, 'hasImage')
      ?? readBoolean(indexTerms, 'hasimage'),
    mediaRecords: readStringArray(indexTerms, 'mediarecords'),
  })
}

function projectMedia(item: IdigbioSearchItem): Record<string, unknown> {
  const data = item.data
  const indexTerms = item.indexTerms
  return omitUndefined({
    uuid: item.uuid,
    type: item.type,
    etag: item.etag,
    title: readString(data, 'dcterms:title')
      ?? readString(data, 'dc:title')
      ?? readString(data, 'ac:caption'),
    description: readString(data, 'dcterms:description'),
    mediaType: readString(indexTerms, 'mediatype')
      ?? readString(data, 'dc:type')
      ?? readString(data, 'dcterms:type'),
    format: readString(indexTerms, 'format') ?? readString(data, 'dc:format'),
    rights: readString(indexTerms, 'rights')
      ?? readString(data, 'dcterms:rights')
      ?? readString(data, 'dc:rights'),
    accessUri: readString(data, 'ac:accessURI')
      ?? readString(data, 'dcterms:identifier'),
    attributionUrl: readString(data, 'ac:attributionLinkURL'),
    recordset: readString(indexTerms, 'recordset'),
    recordUuids: readStringArray(indexTerms, 'records'),
    hasSpecimen: readBoolean(indexTerms, 'hasSpecimen')
      ?? readBoolean(indexTerms, 'hasspecimen'),
  })
}

function readCoordinates(
  indexTerms: Record<string, unknown>,
  data: Record<string, unknown>,
): { latitude: number; longitude: number } | undefined {
  const geopoint = indexTerms.geopoint
  if (isRecord(geopoint)) {
    const lat = readNumberLike(geopoint, 'lat')
    const lon = readNumberLike(geopoint, 'lon')
    if (lat !== undefined && lon !== undefined) {
      return { latitude: lat, longitude: lon }
    }
  }
  const latitude = readNumberLike(data, 'dwc:decimalLatitude')
  const longitude = readNumberLike(data, 'dwc:decimalLongitude')
  return latitude !== undefined && longitude !== undefined
    ? { latitude, longitude }
    : undefined
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? IDIGBIO_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > IDIGBIO_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `iDigBio --limit must be an integer from 1 to ${IDIGBIO_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (!Number.isInteger(offset) || offset < 0 || offset > IDIGBIO_MAX_OFFSET) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `iDigBio --offset must be an integer from 0 to ${IDIGBIO_MAX_OFFSET}.`,
      { offset: value },
    )
  }
  return offset
}

function normalizeOptionalText(
  value: string | undefined,
  label: string,
  maxLength: number,
): string | undefined {
  const text = value?.trim()
  if (text === undefined || text === '') return undefined
  if (text.length > maxLength) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `iDigBio --${label} must be ${maxLength} characters or fewer.`,
      { [label]: value },
    )
  }
  return text
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  return typeof record[key] === 'boolean' ? record[key] : undefined
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = record[key]
  if (!Array.isArray(value)) return undefined
  const strings = value.filter(entry => typeof entry === 'string')
  return strings.length > 0 ? strings : undefined
}

function readNumberLike(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
