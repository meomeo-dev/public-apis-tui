import {
  LaunchLibrary2Client,
  type LaunchLibrary2Event,
  type LaunchLibrary2Launch,
  type LaunchLibrary2ListParams,
} from '../../infrastructure/openApis/launchLibrary2Client.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LAUNCH_LIBRARY2_DEFAULT_LIMIT = 10
export const LAUNCH_LIBRARY2_MAX_LIMIT = 100
export const LAUNCH_LIBRARY2_MAX_OFFSET = 10000
export const LAUNCH_LIBRARY2_DEFAULT_LAUNCH_ORDERING = 'net'
export const LAUNCH_LIBRARY2_DEFAULT_EVENT_ORDERING = 'date'

const LAUNCH_ORDERINGS = ['net', '-net', 'last_updated', '-last_updated'] as const
const EVENT_ORDERINGS = ['date', '-date', 'last_updated', '-last_updated'] as const

export type LaunchLibrary2LaunchesInput = {
  search?: string | undefined
  lsp?: string | undefined
  start?: string | undefined
  end?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  ordering?: string | undefined
}

export type LaunchLibrary2EventsInput = {
  search?: string | undefined
  start?: string | undefined
  end?: string | undefined
  hideRecentPrevious?: boolean | undefined
  limit?: number | undefined
  offset?: number | undefined
  ordering?: string | undefined
}

export type LaunchLibrary2LaunchesQuery = LaunchLibrary2ListParams & {
  kind: 'launches'
}

export type LaunchLibrary2EventsQuery = LaunchLibrary2ListParams & {
  kind: 'events'
}

export type LaunchLibrary2LaunchesResult = {
  kind: 'launchlibrary2.launches'
  api: LaunchLibrary2ApiMeta
  query: LaunchLibrary2LaunchesQuery
  pagination: LaunchLibrary2Pagination
  launches: LaunchLibrary2Launch[]
}

export type LaunchLibrary2EventsResult = {
  kind: 'launchlibrary2.events'
  api: LaunchLibrary2ApiMeta
  query: LaunchLibrary2EventsQuery
  pagination: LaunchLibrary2Pagination
  events: LaunchLibrary2Event[]
}

type LaunchLibrary2ApiMeta = {
  provider: 'launchlibrary2'
  endpoint: string
  docsUrl: 'https://thespacedevs.com/llapi'
  schemaUrl: 'https://ll.thespacedevs.com/2.3.0/schema/'
  apiUrl: 'https://ll.thespacedevs.com/2.3.0/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  version: '2.3.0'
  rateLimitPolicy: string
  boundary: string
  limitPolicy: string
}

type LaunchLibrary2Pagination = {
  total: number
  returned: number
  offset: number
  limit: number
  maxLimit: number
  hasMore: boolean
  next?: string | undefined
  previous?: string | undefined
}

export async function listLaunchLibrary2Launches(
  input: LaunchLibrary2LaunchesInput = {},
): Promise<LaunchLibrary2LaunchesResult> {
  const query = normalizeLaunchLibrary2LaunchesInput(input)
  const response = await new LaunchLibrary2Client().listUpcomingLaunches(query)
  return {
    kind: 'launchlibrary2.launches',
    api: createApiMeta('GET /2.3.0/launches/upcoming/'),
    query,
    pagination: createPagination(query, response),
    launches: response.results,
  }
}

export async function listLaunchLibrary2Events(
  input: LaunchLibrary2EventsInput = {},
): Promise<LaunchLibrary2EventsResult> {
  const query = normalizeLaunchLibrary2EventsInput(input)
  const response = await new LaunchLibrary2Client().listUpcomingEvents(query)
  return {
    kind: 'launchlibrary2.events',
    api: createApiMeta('GET /2.3.0/events/upcoming/'),
    query,
    pagination: createPagination(query, response),
    events: response.results,
  }
}

export function normalizeLaunchLibrary2LaunchesInput(
  input: LaunchLibrary2LaunchesInput = {},
): LaunchLibrary2LaunchesQuery {
  return {
    kind: 'launches',
    limit: normalizeInteger(input.limit, 'limit', 1, LAUNCH_LIBRARY2_MAX_LIMIT),
    offset: normalizeInteger(input.offset, 'offset', 0, LAUNCH_LIBRARY2_MAX_OFFSET),
    ordering: normalizeOrdering(
      input.ordering,
      LAUNCH_ORDERINGS,
      LAUNCH_LIBRARY2_DEFAULT_LAUNCH_ORDERING,
      '--ordering',
    ),
    ...normalizeOptionalText(input.search, 'search', 2, 120),
    ...normalizeOptionalTextAs(input.lsp, 'lsp', 2, 120),
    ...normalizeOptionalDateTime(input.start, 'start'),
    ...normalizeOptionalDateTime(input.end, 'end'),
  }
}

export function normalizeLaunchLibrary2EventsInput(
  input: LaunchLibrary2EventsInput = {},
): LaunchLibrary2EventsQuery {
  return {
    kind: 'events',
    limit: normalizeInteger(input.limit, 'limit', 1, LAUNCH_LIBRARY2_MAX_LIMIT),
    offset: normalizeInteger(input.offset, 'offset', 0, LAUNCH_LIBRARY2_MAX_OFFSET),
    ordering: normalizeOrdering(
      input.ordering,
      EVENT_ORDERINGS,
      LAUNCH_LIBRARY2_DEFAULT_EVENT_ORDERING,
      '--ordering',
    ),
    ...normalizeOptionalText(input.search, 'search', 2, 120),
    ...normalizeOptionalDateTime(input.start, 'start'),
    ...normalizeOptionalDateTime(input.end, 'end'),
    ...(input.hideRecentPrevious !== undefined
      ? { hideRecentPrevious: input.hideRecentPrevious }
      : {}),
  }
}

function createApiMeta(endpoint: string): LaunchLibrary2ApiMeta {
  return {
    provider: 'launchlibrary2',
    endpoint,
    docsUrl: 'https://thespacedevs.com/llapi',
    schemaUrl: 'https://ll.thespacedevs.com/2.3.0/schema/',
    apiUrl: 'https://ll.thespacedevs.com/2.3.0/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    version: '2.3.0',
    rateLimitPolicy: [
      'Non-authenticated requests are free but rate-limited to 15 calls per',
      'hour. API keys are optional for higher limits and are not exposed here.',
    ].join(' '),
    boundary: [
      'Read-only LL2 v2.3.0 JSON endpoints only; no API key, account, OAuth,',
      'cookies, browser clickstream, ICS feed parsing, image download, webhook,',
      'or arbitrary OpenAPI route proxying.',
    ].join(' '),
    limitPolicy: [
      `The OpenAPI schema documents max limit ${LAUNCH_LIBRARY2_MAX_LIMIT};`,
      `the CLI defaults to ${LAUNCH_LIBRARY2_DEFAULT_LIMIT} for terminal`,
      'readability and quota-conscious no-auth use.',
    ].join(' '),
  }
}

function createPagination(
  query: { limit: number; offset: number },
  response: {
    count: number
    next?: string | undefined
    previous?: string | undefined
    results: unknown[]
  },
): LaunchLibrary2Pagination {
  return {
    total: response.count,
    returned: response.results.length,
    offset: query.offset,
    limit: query.limit,
    maxLimit: LAUNCH_LIBRARY2_MAX_LIMIT,
    hasMore: query.offset + response.results.length < response.count,
    ...(response.next !== undefined ? { next: response.next } : {}),
    ...(response.previous !== undefined ? { previous: response.previous } : {}),
  }
}

function normalizeInteger(
  value: number | undefined,
  name: string,
  min: number,
  max: number,
): number {
  const normalized = value ?? (name === 'limit' ? LAUNCH_LIBRARY2_DEFAULT_LIMIT : 0)
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Launch Library 2 --${toKebabCase(name)} must be between ${min} and ${max}.`,
      { [name]: value },
    )
  }
  return normalized
}

function normalizeOrdering<TOrdering extends string>(
  value: string | undefined,
  allowed: readonly TOrdering[],
  defaultValue: TOrdering,
  label: string,
): TOrdering {
  const normalized = value ?? defaultValue
  if (allowed.includes(normalized as TOrdering)) return normalized as TOrdering
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Launch Library 2 ${label} must be one of ${allowed.join(', ')}.`,
    { value },
  )
}

function normalizeOptionalText(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
): { search?: string | undefined } {
  const text = normalizeText(value, name, min, max)
  return text === undefined ? {} : { search: text }
}

function normalizeOptionalTextAs(
  value: string | undefined,
  name: 'lsp',
  min: number,
  max: number,
): { lsp?: string | undefined } {
  const text = normalizeText(value, name, min, max)
  return text === undefined ? {} : { lsp: text }
}

function normalizeText(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Launch Library 2 --${toKebabCase(name)} must be ${min}-${max} characters.`,
      { [name]: value },
    )
  }
  return normalized
}

function normalizeOptionalDateTime(
  value: string | undefined,
  name: 'start' | 'end',
): { start?: string | undefined; end?: string | undefined } {
  if (value === undefined) return {}
  const normalized = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?Z?)?$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Launch Library 2 --${name} must be YYYY-MM-DD or UTC ISO date-time.`,
      { [name]: value },
    )
  }
  return name === 'start' ? { start: normalized } : { end: normalized }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)
}
