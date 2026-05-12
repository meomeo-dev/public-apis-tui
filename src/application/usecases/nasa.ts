import {
  NasaClient,
  type NasaAssetFile,
  type NasaMediaType,
  type NasaSearchItem,
} from '../../infrastructure/openApis/nasaClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NASA_DEFAULT_QUERY = 'apollo 11'
export const NASA_DEFAULT_MEDIA_TYPE = 'image'
export const NASA_DEFAULT_PAGE = 1
export const NASA_DEFAULT_PAGE_SIZE = 10
export const NASA_MAX_PAGE = 100
export const NASA_MAX_PAGE_SIZE = 50
export const NASA_DEFAULT_ASSET_ID = 'as11-40-5874'

const NASA_MEDIA_TYPES = ['image', 'audio', 'video'] as const

export type NasaSearchInput = {
  query?: string | undefined
  mediaType?: string | undefined
  center?: string | undefined
  yearStart?: number | string | undefined
  yearEnd?: number | string | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export type NasaAssetInput = {
  nasaId?: string | undefined
  limit?: number | undefined
}

export type NasaSearchQuery = {
  query: string
  mediaType: NasaMediaType
  center?: string | undefined
  yearStart?: number | undefined
  yearEnd?: number | undefined
  page: number
  pageSize: number
}

export type NasaAssetQuery = {
  nasaId: string
  limit: number
}

export type NasaSearchResult = {
  kind: 'nasa.search'
  api: NasaApiMeta
  query: NasaSearchQuery
  pagination: {
    totalHits: number
    returned: number
    page: number
    pageSize: number
    maxPageSize: number
    hasMore: boolean
  }
  items: NasaSearchItem[]
}

export type NasaAssetResult = {
  kind: 'nasa.asset'
  api: NasaApiMeta
  query: NasaAssetQuery
  pagination: {
    returned: number
    limit: number
    hasMore: boolean
  }
  files: NasaAssetFile[]
}

type NasaApiMeta = {
  provider: 'nasa'
  endpoint: string
  docsUrl: 'https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf'
  apiUrl: 'https://images-api.nasa.gov'
  blockedApiUrl: 'https://api.nasa.gov'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  keyRequiredBoundary: string
  limitPolicy: string
}

export async function searchNasaImages(
  input: NasaSearchInput = {},
): Promise<NasaSearchResult> {
  const query = normalizeNasaSearchInput(input)
  const response = await new NasaClient().search(query)
  return {
    kind: 'nasa.search',
    api: createApiMeta('GET /search'),
    query,
    pagination: {
      totalHits: response.totalHits,
      returned: response.items.length,
      page: query.page,
      pageSize: query.pageSize,
      maxPageSize: NASA_MAX_PAGE_SIZE,
      hasMore: query.page * query.pageSize < response.totalHits,
    },
    items: response.items,
  }
}

export async function listNasaAsset(
  input: NasaAssetInput = {},
): Promise<NasaAssetResult> {
  const query = normalizeNasaAssetInput(input)
  const response = await new NasaClient().asset({ nasaId: query.nasaId })
  const files = response.files.slice(0, query.limit)
  return {
    kind: 'nasa.asset',
    api: createApiMeta('GET /asset/{nasa_id}'),
    query,
    pagination: {
      returned: files.length,
      limit: query.limit,
      hasMore: response.files.length > files.length,
    },
    files,
  }
}

export function normalizeNasaSearchInput(
  input: NasaSearchInput = {},
): NasaSearchQuery {
  const query = normalizeText({
    label: 'query',
    value: input.query ?? NASA_DEFAULT_QUERY,
    min: 1,
    max: 120,
  })
  const mediaType = normalizeMediaType(input.mediaType)
  const center = normalizeOptionalText({
    label: 'center',
    value: input.center,
    min: 2,
    max: 20,
  })
  const yearStart = normalizeOptionalInteger({
    label: 'yearStart',
    value: input.yearStart,
    min: 1900,
    max: 2100,
  })
  const yearEnd = normalizeOptionalInteger({
    label: 'yearEnd',
    value: input.yearEnd,
    min: 1900,
    max: 2100,
  })
  if (
    yearStart !== undefined &&
    yearEnd !== undefined &&
    yearEnd < yearStart
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'NASA --year-end must be greater than or equal to --year-start.',
      { yearStart, yearEnd },
    )
  }

  return {
    query,
    mediaType,
    ...(center !== undefined ? { center } : {}),
    ...(yearStart !== undefined ? { yearStart } : {}),
    ...(yearEnd !== undefined ? { yearEnd } : {}),
    page: normalizeInteger({
      label: 'page',
      value: input.page,
      defaultValue: NASA_DEFAULT_PAGE,
      min: 1,
      max: NASA_MAX_PAGE,
    }),
    pageSize: normalizeInteger({
      label: 'pageSize',
      value: input.pageSize,
      defaultValue: NASA_DEFAULT_PAGE_SIZE,
      min: 1,
      max: NASA_MAX_PAGE_SIZE,
    }),
  }
}

export function normalizeNasaAssetInput(
  input: NasaAssetInput = {},
): NasaAssetQuery {
  return {
    nasaId: normalizeText({
      label: 'nasaId',
      value: input.nasaId ?? NASA_DEFAULT_ASSET_ID,
      min: 2,
      max: 120,
    }),
    limit: normalizeInteger({
      label: 'limit',
      value: input.limit,
      defaultValue: NASA_DEFAULT_PAGE_SIZE,
      min: 1,
      max: NASA_MAX_PAGE_SIZE,
    }),
  }
}

function createApiMeta(endpoint: string): NasaApiMeta {
  return {
    provider: 'nasa',
    endpoint,
    docsUrl: 'https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf',
    apiUrl: 'https://images-api.nasa.gov',
    blockedApiUrl: 'https://api.nasa.gov',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'NASA Image and Video Library JSON metadata only; no api.nasa.gov',
      'api_key endpoints, browser scraping, HTML parsing, image downloads,',
      'binary/base64 payloads, upload, delete, or account behavior.',
    ].join(' '),
    keyRequiredBoundary: [
      'api.nasa.gov endpoints such as APOD return API_KEY_MISSING without',
      'api_key and are intentionally excluded from this no-auth provider.',
    ].join(' '),
    limitPolicy: [
      `CLI defaults page size to ${NASA_DEFAULT_PAGE_SIZE} and caps live`,
      `results at ${NASA_MAX_PAGE_SIZE} to keep terminal output bounded.`,
    ].join(' '),
  }
}

function normalizeMediaType(value: string | undefined): NasaMediaType {
  const mediaType = (value ?? NASA_DEFAULT_MEDIA_TYPE).trim().toLowerCase()
  if (NASA_MEDIA_TYPES.includes(mediaType as NasaMediaType)) {
    return mediaType as NasaMediaType
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `NASA --media-type must be one of ${NASA_MEDIA_TYPES.join(', ')}.`,
    { mediaType: value },
  )
}

function normalizeInteger(input: {
  label: string
  value: number | undefined
  defaultValue: number
  min: number
  max: number
}): number {
  const value = input.value ?? input.defaultValue
  if (!Number.isInteger(value) || value < input.min || value > input.max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `NASA --${toKebabCase(input.label)} must be between ${
        input.min
      } and ${input.max}.`,
      { [input.label]: input.value },
    )
  }
  return value
}

function normalizeOptionalInteger(input: {
  label: string
  value: number | string | undefined
  min: number
  max: number
}): number | undefined {
  if (input.value === undefined) return undefined
  const value = typeof input.value === 'string'
    ? Number(input.value.trim())
    : input.value
  if (!Number.isInteger(value) || value < input.min || value > input.max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `NASA --${toKebabCase(input.label)} must be between ${
        input.min
      } and ${input.max}.`,
      { [input.label]: input.value },
    )
  }
  return value
}

function normalizeOptionalText(input: {
  label: string
  value: string | undefined
  min: number
  max: number
}): string | undefined {
  if (input.value === undefined) return undefined
  return normalizeText(input as { label: string; value: string; min: number; max: number })
}

function normalizeText(input: {
  label: string
  value: string
  min: number
  max: number
}): string {
  const text = input.value.trim()
  if (text.length < input.min || text.length > input.max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `NASA --${toKebabCase(input.label)} must be ${input.min}-${input.max} characters.`,
      { [input.label]: input.value },
    )
  }
  return text
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)
}
