import {
  USGS_EARTHQUAKE_APPLICATION_URL,
  USGS_EARTHQUAKE_BASE_URL,
  USGS_EARTHQUAKE_DEFAULT_EVENT_ID,
  USGS_EARTHQUAKE_DEFAULT_LIMIT,
  USGS_EARTHQUAKE_DEFAULT_MIN_MAGNITUDE,
  USGS_EARTHQUAKE_DEFAULT_OFFSET,
  USGS_EARTHQUAKE_DEFAULT_ORDER_BY,
  USGS_EARTHQUAKE_DOCS_URL,
  USGS_EARTHQUAKE_MAX_LIMIT,
  USGS_EARTHQUAKE_ORDER_BY,
  UsgsEarthquakeClient,
  type UsgsEarthquakeCollection,
  type UsgsEarthquakeFeature,
  type UsgsEarthquakeOrderBy,
} from '../../infrastructure/openApis/usgsEarthquakeClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const USGS_EARTHQUAKE_MAX_OFFSET = 20_000
export const USGS_EARTHQUAKE_MIN_MAGNITUDE = -1
export const USGS_EARTHQUAKE_MAX_MAGNITUDE = 10
export const USGS_EARTHQUAKE_MIN_YEAR = 1900
export const USGS_EARTHQUAKE_MAX_YEAR = 2100

export type UsgsEarthquakeSearchInput = {
  minMagnitude?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
  orderBy?: string | undefined
  startTime?: string | undefined
  endTime?: string | undefined
}

export type UsgsEarthquakeEventInput = {
  eventId?: string | undefined
}

export type UsgsEarthquakeSearchQuery = {
  minMagnitude: number
  limit: number
  offset: number
  orderBy: UsgsEarthquakeOrderBy
  startTime?: string | undefined
  endTime?: string | undefined
}

export type UsgsEarthquakeEventQuery = {
  eventId: string
}

type UsgsEarthquakeEndpoint = 'GET /query' | 'GET /query?eventid={eventId}'

type UsgsEarthquakeApiMeta = {
  provider: 'usgsearthquake'
  endpoint: UsgsEarthquakeEndpoint
  docsUrl: typeof USGS_EARTHQUAKE_DOCS_URL
  applicationUrl: typeof USGS_EARTHQUAKE_APPLICATION_URL
  apiUrl: typeof USGS_EARTHQUAKE_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS GeoJSON REST'
  rateLimit: string
  cachePolicy: string
  reliability: string
  boundary: string
  excluded: string[]
}

type Pagination = {
  returned: number
  limit: number
  offset: number
  nextOffset?: number | undefined
  maxLimit: number
}

export type UsgsEarthquakeSearchResult = {
  kind: 'usgsearthquake.search'
  api: UsgsEarthquakeApiMeta
  query: UsgsEarthquakeSearchQuery
  metadata: Omit<UsgsEarthquakeCollection, 'events'>
  pagination: Pagination
  count: number
  events: UsgsEarthquakeFeature[]
}

export type UsgsEarthquakeEventResult = {
  kind: 'usgsearthquake.event'
  api: UsgsEarthquakeApiMeta
  query: UsgsEarthquakeEventQuery
  event: UsgsEarthquakeFeature
}

export async function searchUsgsEarthquakes(
  input: UsgsEarthquakeSearchInput = {},
): Promise<UsgsEarthquakeSearchResult> {
  const query = normalizeUsgsEarthquakeSearchInput(input)
  const response = await new UsgsEarthquakeClient().search(query)
  const nextOffset = response.events.length >= query.limit
    ? query.offset + query.limit
    : undefined
  const { events, ...metadata } = response
  return {
    kind: 'usgsearthquake.search',
    api: createApiMeta('GET /query'),
    query,
    metadata,
    pagination: {
      returned: response.events.length,
      limit: query.limit,
      offset: query.offset,
      ...(nextOffset !== undefined ? { nextOffset } : {}),
      maxLimit: USGS_EARTHQUAKE_MAX_LIMIT,
    },
    count: response.events.length,
    events,
  }
}

export async function getUsgsEarthquakeEvent(
  input: UsgsEarthquakeEventInput = {},
): Promise<UsgsEarthquakeEventResult> {
  const query = normalizeUsgsEarthquakeEventInput(input)
  const event = await new UsgsEarthquakeClient().event(query)
  return {
    kind: 'usgsearthquake.event',
    api: createApiMeta('GET /query?eventid={eventId}'),
    query,
    event,
  }
}

export function normalizeUsgsEarthquakeSearchInput(
  input: UsgsEarthquakeSearchInput = {},
): UsgsEarthquakeSearchQuery {
  const startTime = input.startTime === undefined
    ? undefined
    : normalizeIsoDate(input.startTime, 'USGS Earthquake --start-time')
  const endTime = input.endTime === undefined
    ? undefined
    : normalizeIsoDate(input.endTime, 'USGS Earthquake --end-time')
  if (
    startTime !== undefined &&
    endTime !== undefined &&
    new Date(`${startTime}T00:00:00.000Z`).getTime() >
      new Date(`${endTime}T00:00:00.000Z`).getTime()
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'USGS Earthquake --start-time must be before or equal to --end-time.',
      { startTime: input.startTime, endTime: input.endTime },
    )
  }
  return {
    minMagnitude: normalizeMagnitude(
      input.minMagnitude ?? USGS_EARTHQUAKE_DEFAULT_MIN_MAGNITUDE,
    ),
    limit: normalizeInteger(
      input.limit ?? USGS_EARTHQUAKE_DEFAULT_LIMIT,
      'USGS Earthquake --limit',
      1,
      USGS_EARTHQUAKE_MAX_LIMIT,
    ),
    offset: normalizeInteger(
      input.offset ?? USGS_EARTHQUAKE_DEFAULT_OFFSET,
      'USGS Earthquake --offset',
      1,
      USGS_EARTHQUAKE_MAX_OFFSET,
    ),
    orderBy: normalizeOrderBy(input.orderBy),
    ...(startTime !== undefined ? { startTime } : {}),
    ...(endTime !== undefined ? { endTime } : {}),
  }
}

export function normalizeUsgsEarthquakeEventInput(
  input: UsgsEarthquakeEventInput = {},
): UsgsEarthquakeEventQuery {
  return {
    eventId: normalizeEventId(
      input.eventId ?? USGS_EARTHQUAKE_DEFAULT_EVENT_ID,
    ),
  }
}

function createApiMeta(endpoint: UsgsEarthquakeEndpoint): UsgsEarthquakeApiMeta {
  return {
    provider: 'usgsearthquake',
    endpoint,
    docsUrl: USGS_EARTHQUAKE_DOCS_URL,
    applicationUrl: USGS_EARTHQUAKE_APPLICATION_URL,
    apiUrl: USGS_EARTHQUAKE_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS GeoJSON REST',
    rateLimit: [
      'Official docs recommend real-time GeoJSON feeds for display workloads;',
      'CLI uses bounded query requests with local limit cap 50.',
    ].join(' '),
    cachePolicy: [
      'Live headers observed public cache-control max-age=60 for docs and',
      'query JSON responses.',
    ].join(' '),
    reliability: [
      'Near-real-time earthquake data can be revised; validate emergency,',
      'hazard, insurance, or operational decisions against official USGS',
      'products and local authorities.',
    ].join(' '),
    boundary: [
      'Read-only FDSN event GeoJSON only; no maps, HTML event pages, product',
      'attachments, downloads, WADL proxying, browser clickstream, upload,',
      'delete, arbitrary FDSN parameter passthrough, binary payloads, or',
      'base64 payloads.',
    ].join(' '),
    excluded: [
      'HTML event pages and map UI',
      'application.wadl and arbitrary method proxying',
      'product attachment downloads and Shakemap binary assets',
      'real-time feed mirroring or unbounded bulk catalog export',
      'non-earthquake event-type passthrough in the visible contract',
    ],
  }
}

function normalizeMagnitude(value: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < USGS_EARTHQUAKE_MIN_MAGNITUDE ||
    value > USGS_EARTHQUAKE_MAX_MAGNITUDE
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        `USGS Earthquake --min-magnitude must be from`,
        `${USGS_EARTHQUAKE_MIN_MAGNITUDE} to`,
        `${USGS_EARTHQUAKE_MAX_MAGNITUDE}.`,
      ].join(' '),
      { minMagnitude: value },
    )
  }
  return value
}

function normalizeOrderBy(value: string | undefined): UsgsEarthquakeOrderBy {
  const orderBy = (value ?? USGS_EARTHQUAKE_DEFAULT_ORDER_BY).trim()
  if (USGS_EARTHQUAKE_ORDER_BY.includes(orderBy as UsgsEarthquakeOrderBy)) {
    return orderBy as UsgsEarthquakeOrderBy
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `USGS Earthquake --order-by must be one of ${USGS_EARTHQUAKE_ORDER_BY.join(', ')}.`,
    { orderBy: value },
  )
}

function normalizeEventId(value: string): string {
  const eventId = value.trim()
  if (!/^[A-Za-z0-9_.-]{3,80}$/u.test(eventId)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'USGS Earthquake --event-id must be a safe event id.',
      { eventId: value },
    )
  }
  return eventId
}

function normalizeIsoDate(value: string, label: string): string {
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must use YYYY-MM-DD format.`,
      { date: value },
    )
  }
  const parsed = new Date(`${date}T00:00:00.000Z`)
  const year = parsed.getUTCFullYear()
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    year < USGS_EARTHQUAKE_MIN_YEAR ||
    year > USGS_EARTHQUAKE_MAX_YEAR
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be a real date from 1900 to 2100.`,
      { date: value },
    )
  }
  return date
}

function normalizeInteger(
  value: number,
  label: string,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be an integer from ${min} to ${max}.`,
      { value },
    )
  }
  return value
}
