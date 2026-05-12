import {
  SpaceXClient,
  type SpaceXCompany,
  type SpaceXLaunch,
  type SpaceXLaunchesQuery,
  type SpaceXLaunchpad,
  type SpaceXLaunchSort,
  type SpaceXQueryPage,
  type SpaceXRocket,
} from '../../infrastructure/openApis/spaceXClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SPACEX_DEFAULT_LIMIT = 10
export const SPACEX_MAX_LIMIT = 50
export const SPACEX_DEFAULT_PAGE = 1
export const SPACEX_MAX_PAGE = 200
export const SPACEX_DEFAULT_LAUNCH_SORT = 'date-desc'
export const SPACEX_DEFAULT_LAUNCHES_NAME = ''
export const SPACEX_MAX_TEXT_LENGTH = 120

const SPACEX_LAUNCH_SORTS = [
  'date-desc',
  'date-asc',
  'flight-desc',
  'flight-asc',
] as const

export type SpaceXCompanyInput = Record<string, never>

export type SpaceXListInput = {
  search?: string | undefined
  active?: boolean | undefined
  status?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type SpaceXLaunchesInput = {
  name?: string | undefined
  upcoming?: boolean | undefined
  success?: boolean | undefined
  rocket?: string | undefined
  launchpad?: string | undefined
  start?: string | undefined
  end?: string | undefined
  sort?: string | undefined
  limit?: number | undefined
  page?: number | undefined
}

export type SpaceXApiMeta = {
  provider: 'spacex'
  endpoint:
    | 'GET /v4/company'
    | 'GET /v4/rockets'
    | 'GET /v4/launchpads'
    | 'POST /v5/launches/query'
  docsUrl: 'https://github.com/r-spacex/SpaceX-API'
  apiUrl: 'https://api.spacexdata.com'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  version: 'REST v4/v5'
  boundary: string
  authBoundary: string
  queryPolicy: string
  excluded: string[]
  limitCap?: number | undefined
}

export type SpaceXLocalListQuery = {
  search: string
  active?: boolean | undefined
  status?: string | undefined
  limit: number
  offset: number
}

export type SpaceXLocalPagination = {
  total: number
  matched: number
  returned: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset?: number | undefined
  maxLimit: number
}

export type SpaceXLaunchesPagination = {
  total: number
  returned: number
  limit: number
  page: number
  totalPages: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage?: number | undefined
  nextPage?: number | undefined
  maxLimit: number
  maxPage: number
}

export type SpaceXCompanyResult = {
  kind: 'spacex.company'
  api: SpaceXApiMeta
  company: SpaceXCompany
}

export type SpaceXRocketsResult = {
  kind: 'spacex.rockets'
  api: SpaceXApiMeta
  query: SpaceXLocalListQuery
  pagination: SpaceXLocalPagination
  count: number
  rockets: SpaceXRocket[]
}

export type SpaceXLaunchpadsResult = {
  kind: 'spacex.launchpads'
  api: SpaceXApiMeta
  query: SpaceXLocalListQuery
  pagination: SpaceXLocalPagination
  count: number
  launchpads: SpaceXLaunchpad[]
}

export type SpaceXLaunchesResult = {
  kind: 'spacex.launches'
  api: SpaceXApiMeta
  query: SpaceXLaunchesQuery
  pagination: SpaceXLaunchesPagination
  count: number
  launches: SpaceXLaunch[]
}

export async function getSpaceXCompany(
  _input: SpaceXCompanyInput = {},
): Promise<SpaceXCompanyResult> {
  const company = await new SpaceXClient().getCompany()
  return {
    kind: 'spacex.company',
    api: createApiMeta('GET /v4/company'),
    company,
  }
}

export async function listSpaceXRockets(
  input: SpaceXListInput = {},
): Promise<SpaceXRocketsResult> {
  const query = normalizeSpaceXRocketsInput(input)
  const rockets = await new SpaceXClient().listRockets()
  const matched = filterRockets(rockets, query)
  const page = matched.slice(query.offset, query.offset + query.limit)
  return {
    kind: 'spacex.rockets',
    api: createApiMeta('GET /v4/rockets'),
    query,
    pagination: createLocalPagination(
      rockets.length,
      matched.length,
      page.length,
      query,
    ),
    count: page.length,
    rockets: page,
  }
}

export async function listSpaceXLaunchpads(
  input: SpaceXListInput = {},
): Promise<SpaceXLaunchpadsResult> {
  const query = normalizeSpaceXLaunchpadsInput(input)
  const launchpads = await new SpaceXClient().listLaunchpads()
  const matched = filterLaunchpads(launchpads, query)
  const page = matched.slice(query.offset, query.offset + query.limit)
  return {
    kind: 'spacex.launchpads',
    api: createApiMeta('GET /v4/launchpads'),
    query,
    pagination: createLocalPagination(
      launchpads.length,
      matched.length,
      page.length,
      query,
    ),
    count: page.length,
    launchpads: page,
  }
}

export async function listSpaceXLaunches(
  input: SpaceXLaunchesInput = {},
): Promise<SpaceXLaunchesResult> {
  const query = normalizeSpaceXLaunchesInput(input)
  const page = await new SpaceXClient().queryLaunches(query)
  return {
    kind: 'spacex.launches',
    api: createApiMeta('POST /v5/launches/query'),
    query,
    pagination: createLaunchesPagination(page),
    count: page.docs.length,
    launches: page.docs,
  }
}

export function normalizeSpaceXCompanyInput(
  _input: Record<string, unknown> = {},
): SpaceXCompanyInput {
  return {}
}

export function normalizeSpaceXRocketsInput(
  input: SpaceXListInput = {},
): SpaceXLocalListQuery {
  return {
    search: normalizeOptionalText(input.search, 'SpaceX --search', 80) ?? '',
    active: input.active,
    limit: normalizeInteger(input.limit, 'SpaceX --limit', 1, SPACEX_MAX_LIMIT),
    offset: normalizeInteger(input.offset, 'SpaceX --offset', 0, 500),
  }
}

export function normalizeSpaceXLaunchpadsInput(
  input: SpaceXListInput = {},
): SpaceXLocalListQuery {
  return {
    search: normalizeOptionalText(input.search, 'SpaceX --search', 80) ?? '',
    status: normalizeOptionalToken(input.status, 'SpaceX --status', 40),
    limit: normalizeInteger(input.limit, 'SpaceX --limit', 1, SPACEX_MAX_LIMIT),
    offset: normalizeInteger(input.offset, 'SpaceX --offset', 0, 500),
  }
}

export function normalizeSpaceXLaunchesInput(
  input: SpaceXLaunchesInput = {},
): SpaceXLaunchesQuery {
  return {
    name: normalizeOptionalText(input.name, 'SpaceX --name', 80),
    upcoming: input.upcoming,
    success: input.success,
    rocket: normalizeOptionalId(input.rocket, 'SpaceX --rocket'),
    launchpad: normalizeOptionalId(input.launchpad, 'SpaceX --launchpad'),
    start: normalizeOptionalDateTime(input.start, 'SpaceX --start'),
    end: normalizeOptionalDateTime(input.end, 'SpaceX --end'),
    sort: normalizeLaunchSort(input.sort),
    limit: normalizeInteger(input.limit, 'SpaceX --limit', 1, SPACEX_MAX_LIMIT),
    page: normalizeInteger(input.page, 'SpaceX --page', 1, SPACEX_MAX_PAGE),
  }
}

function createApiMeta(endpoint: SpaceXApiMeta['endpoint']): SpaceXApiMeta {
  return {
    provider: 'spacex',
    endpoint,
    docsUrl: 'https://github.com/r-spacex/SpaceX-API',
    apiUrl: 'https://api.spacexdata.com',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    version: 'REST v4/v5',
    boundary: [
      'Read-only SpaceX REST JSON metadata only; create/update/delete routes,',
      'spacex-key authenticated mutations, arbitrary Mongo/Mongoose query',
      'passthrough, GraphQL, image downloads, and browser scraping are excluded.',
    ].join(' '),
    authBoundary: [
      'Official company, rockets, launchpads, and launches query docs mark',
      'selected read-only routes as Auth required False; live probes returned',
      'JSON without API keys, OAuth, cookies, account setup, or browser flow.',
    ].join(' '),
    queryPolicy: [
      'CLI exposes fixed filters and constructs bounded provider query bodies;',
      'raw query/options JSON and Mongoose operators are not accepted.',
    ].join(' '),
    excluded: [
      'create, update, and delete routes that require spacex-key',
      'raw Mongo/Mongoose query or options passthrough',
      'GraphQL endpoint at api.spacex.land',
      'image, presskit, or media download workflows',
      'HTML scraping or Chrome clickstream',
    ],
    limitCap: SPACEX_MAX_LIMIT,
  }
}

function filterRockets(
  rockets: SpaceXRocket[],
  query: SpaceXLocalListQuery,
): SpaceXRocket[] {
  return rockets.filter(rocket => {
    if (query.active !== undefined && rocket.active !== query.active) {
      return false
    }
    return matchesSearch(query.search, [
      rocket.name,
      rocket.type,
      rocket.country,
      rocket.company,
      rocket.description,
    ])
  })
}

function filterLaunchpads(
  launchpads: SpaceXLaunchpad[],
  query: SpaceXLocalListQuery,
): SpaceXLaunchpad[] {
  return launchpads.filter(launchpad => {
    if (query.status !== undefined && launchpad.status !== query.status) {
      return false
    }
    return matchesSearch(query.search, [
      launchpad.name,
      launchpad.fullName,
      launchpad.locality,
      launchpad.region,
      launchpad.timezone,
      launchpad.status,
    ])
  })
}

function matchesSearch(
  search: string,
  fields: Array<string | undefined>,
): boolean {
  if (search === '') return true
  const lowered = search.toLowerCase()
  return fields.some(field => field?.toLowerCase().includes(lowered) === true)
}

function createLocalPagination(
  total: number,
  matched: number,
  returned: number,
  query: SpaceXLocalListQuery,
): SpaceXLocalPagination {
  const hasMore = query.offset + returned < matched
  return {
    total,
    matched,
    returned,
    limit: query.limit,
    offset: query.offset,
    hasMore,
    nextOffset: hasMore ? query.offset + returned : undefined,
    maxLimit: SPACEX_MAX_LIMIT,
  }
}

function createLaunchesPagination(
  page: SpaceXQueryPage<SpaceXLaunch>,
): SpaceXLaunchesPagination {
  return {
    total: page.totalDocs,
    returned: page.returned,
    limit: page.limit,
    page: page.page,
    totalPages: page.totalPages,
    hasPrevPage: page.hasPrevPage,
    hasNextPage: page.hasNextPage,
    prevPage: page.prevPage,
    nextPage: page.nextPage,
    maxLimit: SPACEX_MAX_LIMIT,
    maxPage: SPACEX_MAX_PAGE,
  }
}

function normalizeInteger(
  value: number | undefined,
  label: string,
  min: number,
  max: number,
): number {
  const defaultValue = label.includes('--page') ? SPACEX_DEFAULT_PAGE : (
    label.includes('--offset') ? 0 : SPACEX_DEFAULT_LIMIT
  )
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be an integer from ${min} to ${max}.`,
      { value },
    )
  }
  return normalized
}

function normalizeLaunchSort(value: string | undefined): SpaceXLaunchSort {
  const normalized = value ?? SPACEX_DEFAULT_LAUNCH_SORT
  if (SPACEX_LAUNCH_SORTS.includes(normalized as SpaceXLaunchSort)) {
    return normalized as SpaceXLaunchSort
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `SpaceX --sort must be one of ${SPACEX_LAUNCH_SORTS.join(', ')}.`,
    { value },
  )
}

function normalizeOptionalText(
  value: string | undefined,
  label: string,
  max: number,
): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (normalized === '') return undefined
  if (normalized.length > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be at most ${max} characters.`,
      { value },
    )
  }
  if (/[{}[\]$]|(?:^|\s)(?:query|options)\s*:/iu.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must not contain raw query syntax.`,
      { value },
    )
  }
  return normalized
}

function normalizeOptionalToken(
  value: string | undefined,
  label: string,
  max: number,
): string | undefined {
  const normalized = normalizeOptionalText(value, label, max)
  if (normalized === undefined) return undefined
  if (!/^[A-Za-z0-9 _-]+$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must use letters, numbers, spaces, underscores, or hyphens.`,
      { value },
    )
  }
  return normalized
}

function normalizeOptionalId(
  value: string | undefined,
  label: string,
): string | undefined {
  const normalized = normalizeOptionalText(value, label, 40)
  if (normalized === undefined) return undefined
  if (!/^[a-f0-9]{24}$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be a 24 character SpaceX object id.`,
      { value },
    )
  }
  return normalized
}

function normalizeOptionalDateTime(
  value: string | undefined,
  label: string,
): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  const utcDateTimePattern =
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?Z?)?$/u
  if (!utcDateTimePattern.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be YYYY-MM-DD or UTC ISO date-time.`,
      { value },
    )
  }
  return normalized
}
