import {
  TLE_BASE_URL,
  TLE_DEFAULT_PAGE,
  TLE_DEFAULT_SEARCH,
  TLE_DOCS_URL,
  TLE_PAGE_SIZE,
  TleClient,
  type TleCollectionView,
  type TleRecord,
} from '../../infrastructure/openApis/tleClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const TLE_MAX_PAGE = 2000
export const TLE_MIN_SEARCH_LENGTH = 2
export const TLE_MAX_SEARCH_LENGTH = 80
export const TLE_DEFAULT_SATELLITE_ID = 25544

export type TleSearchInput = {
  search?: string | undefined
  page?: number | undefined
}

export type TleSatelliteInput = {
  satelliteId?: number | undefined
}

export type TleSearchQuery = {
  search?: string | undefined
  page: number
  pageSize: typeof TLE_PAGE_SIZE
}

export type TleSatelliteQuery = {
  satelliteId: number
}

export type TleOrbitalSummary = {
  classification: string
  internationalDesignator: string
  epochYear: string
  epochDay: string
  inclinationDegrees: number
  rightAscensionDegrees: number
  eccentricity: number
  argumentOfPerigeeDegrees: number
  meanAnomalyDegrees: number
  meanMotionRevsPerDay: number
  revolutionNumber: number
}

export type TleSatellite = TleRecord & {
  orbital: TleOrbitalSummary
}

export type TleApiMeta = {
  provider: 'tle'
  endpoint: string
  docsUrl: typeof TLE_DOCS_URL
  apiUrl: typeof TLE_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  dataSource: 'CelesTrak'
  boundary: string
  pageSize: typeof TLE_PAGE_SIZE
}

export type TlePagination = {
  totalItems: number
  returned: number
  page: number
  pageSize: typeof TLE_PAGE_SIZE
  totalPages: number
  hasMore: boolean
  view: TleCollectionView
}

export type TleSearchResult = {
  kind: 'tle.search'
  api: TleApiMeta
  query: TleSearchQuery
  pagination: TlePagination
  satellites: TleSatellite[]
}

export type TleSatelliteResult = {
  kind: 'tle.satellite'
  api: TleApiMeta
  query: TleSatelliteQuery
  satellite: TleSatellite
}

export async function searchTle(
  input: TleSearchInput = {},
): Promise<TleSearchResult> {
  const query = normalizeTleSearchInput(input)
  const response = await new TleClient().search(query)
  const satellites = response.members.map(projectSatellite)
  return {
    kind: 'tle.search',
    api: createApiMeta('GET /api/tle/'),
    query,
    pagination: createPagination(
      query,
      response.totalItems,
      satellites.length,
      response.view,
    ),
    satellites,
  }
}

export async function getTleSatellite(
  input: TleSatelliteInput = {},
): Promise<TleSatelliteResult> {
  const query = normalizeTleSatelliteInput(input)
  const record = await new TleClient().getSatellite(query.satelliteId)
  const satellite = projectSatellite(record)
  return {
    kind: 'tle.satellite',
    api: createApiMeta('GET /api/tle/{satelliteId}'),
    query,
    satellite,
  }
}

export function normalizeTleSearchInput(
  input: TleSearchInput = {},
): TleSearchQuery {
  return {
    ...normalizeOptionalSearch(input.search),
    page: normalizeInteger(
      input.page ?? TLE_DEFAULT_PAGE,
      '--page',
      1,
      TLE_MAX_PAGE,
    ),
    pageSize: TLE_PAGE_SIZE,
  }
}

export function normalizeTleSatelliteInput(
  input: TleSatelliteInput = {},
): TleSatelliteQuery {
  return {
    satelliteId: normalizeInteger(
      input.satelliteId ?? TLE_DEFAULT_SATELLITE_ID,
      '--satellite-id',
      1,
      999999,
    ),
  }
}

function createApiMeta(endpoint: string): TleApiMeta {
  return {
    provider: 'tle',
    endpoint,
    docsUrl: TLE_DOCS_URL,
    apiUrl: TLE_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    dataSource: 'CelesTrak',
    boundary: [
      'Read-only TLE API JSON endpoints only; no Google Maps UI, browser',
      'clickstream, scraping, arbitrary route proxying, bulk CelesTrak',
      'downloads, binary payloads, or base64 payloads.',
    ].join(' '),
    pageSize: TLE_PAGE_SIZE,
  }
}

function createPagination(
  query: TleSearchQuery,
  totalItems: number,
  returned: number,
  view: TleCollectionView,
): TlePagination {
  return {
    totalItems,
    returned,
    page: query.page,
    pageSize: TLE_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalItems / TLE_PAGE_SIZE)),
    hasMore: view.next !== undefined,
    view,
  }
}

function projectSatellite(record: TleRecord): TleSatellite {
  return {
    ...record,
    orbital: parseOrbitalSummary(record.line1, record.line2),
  }
}

function parseOrbitalSummary(line1: string, line2: string): TleOrbitalSummary {
  return {
    classification: slice(line1, 7, 8),
    internationalDesignator: [
      slice(line1, 9, 11),
      slice(line1, 11, 14),
      slice(line1, 14, 17),
    ].filter(Boolean).join('-'),
    epochYear: slice(line1, 18, 20),
    epochDay: slice(line1, 20, 32),
    inclinationDegrees: parseTleNumber(slice(line2, 8, 16), 'inclination'),
    rightAscensionDegrees: parseTleNumber(slice(line2, 17, 25), 'right ascension'),
    eccentricity: parseTleNumber(`0.${slice(line2, 26, 33)}`, 'eccentricity'),
    argumentOfPerigeeDegrees: parseTleNumber(slice(line2, 34, 42), 'perigee'),
    meanAnomalyDegrees: parseTleNumber(slice(line2, 43, 51), 'mean anomaly'),
    meanMotionRevsPerDay: parseTleNumber(slice(line2, 52, 63), 'mean motion'),
    revolutionNumber: parseTleInteger(slice(line2, 63, 68), 'revolution number'),
  }
}

function slice(value: string, start: number, end: number): string {
  return value.slice(start, end).trim()
}

function parseTleNumber(value: string, name: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `TLE ${name} was not numeric.`, {
      value,
    })
  }
  return parsed
}

function parseTleInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `TLE ${name} was not numeric.`, {
      value,
    })
  }
  return parsed
}

function normalizeOptionalSearch(
  value: string | undefined,
): { search?: string | undefined } {
  if (value === undefined) return { search: TLE_DEFAULT_SEARCH }
  const search = value.trim()
  if (
    search.length < TLE_MIN_SEARCH_LENGTH ||
    search.length > TLE_MAX_SEARCH_LENGTH
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        `TLE --search must be ${TLE_MIN_SEARCH_LENGTH}`,
        `-${TLE_MAX_SEARCH_LENGTH} characters.`,
      ].join(''),
      { search: value },
    )
  }
  if (!/^[A-Za-z0-9 ._()-]+$/u.test(search)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'TLE --search contains unsupported characters.',
      { search: value },
    )
  }
  return { search }
}

function normalizeInteger(
  value: number,
  name: string,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `TLE ${name} must be an integer from ${min} to ${max}.`,
      { value },
    )
  }
  return value
}
