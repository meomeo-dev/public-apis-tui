import {
  ICSDB_LOCALES,
  ICSDB_RAW_BASE_URL,
  ICSDB_REPOSITORY_URL,
  ICSDB_TREE_URL,
  IcsdbClient,
  type IcsdbCalendarRecord,
  type IcsdbEvent,
  type IcsdbLocale,
} from '../../infrastructure/openApis/icsdbClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ICSDB_DEFAULT_LOCALE: IcsdbLocale = 'en-US'
export const ICSDB_DEFAULT_SLUG = 'us-all'
export const ICSDB_DEFAULT_LIMIT = 20
export const ICSDB_MAX_LIMIT = 100
export const ICSDB_MAX_QUERY_LENGTH = 80
export const ICSDB_MAX_SLUG_LENGTH = 120

const ICSDB_SLUG_PATTERN = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/u

export type IcsdbCalendarsInput = {
  locale?: string | undefined
  query?: string | undefined
  limit?: number | undefined
}

export type IcsdbEventsInput = {
  locale?: string | undefined
  slug?: string | undefined
  query?: string | undefined
  limit?: number | undefined
}

export type IcsdbCalendarsQuery = {
  locale: IcsdbLocale
  query?: string | undefined
  limit: number
}

export type IcsdbEventsQuery = IcsdbCalendarsQuery & {
  slug: string
}

export type IcsdbApiMeta = {
  provider: 'icsdb'
  endpoint: string
  docsUrl: typeof ICSDB_REPOSITORY_URL
  repositoryUrl: typeof ICSDB_REPOSITORY_URL
  treeUrl: typeof ICSDB_TREE_URL
  rawBaseUrl: typeof ICSDB_RAW_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS GitHub API + raw ICS text'
  supportedLocales: IcsdbLocale[]
  limitCap: typeof ICSDB_MAX_LIMIT
  boundary: string
  freshness: string
}

export type IcsdbCalendarSummary = {
  locale: IcsdbLocale
  slug: string
  title: string
  fileName: string
  sourceUrl: string
}

export type IcsdbProjectedEvent = IcsdbEvent

export type IcsdbCalendarsResult = {
  kind: 'icsdb.calendars'
  api: IcsdbApiMeta & {
    endpoint: 'GET GitHub tree build/{locale}/*.ics'
  }
  query: IcsdbCalendarsQuery
  count: number
  totalCalendars: number
  calendars: IcsdbCalendarSummary[]
}

export type IcsdbEventsResult = {
  kind: 'icsdb.events'
  api: IcsdbApiMeta & {
    endpoint: 'GET raw build/{locale}/{slug}-nonworkingdays.ics'
  }
  query: IcsdbEventsQuery
  calendar: {
    locale: IcsdbLocale
    slug: string
    title?: string | undefined
    sourceUrl: string
    productId?: string | undefined
    method?: string | undefined
    timezone?: string | undefined
  }
  count: number
  totalEvents: number
  events: IcsdbProjectedEvent[]
}

export async function listIcsdbCalendars(
  input: IcsdbCalendarsInput = {},
): Promise<IcsdbCalendarsResult> {
  const query = normalizeIcsdbCalendarsInput(input)
  const calendars = await new IcsdbClient().listCalendars(query.locale)
  const filtered = filterCalendars(calendars, query.query)
  const limited = filtered.slice(0, query.limit).map(projectCalendarRecord)
  return {
    kind: 'icsdb.calendars',
    api: createApiMeta('GET GitHub tree build/{locale}/*.ics'),
    query,
    count: limited.length,
    totalCalendars: filtered.length,
    calendars: limited,
  }
}

export async function getIcsdbEvents(
  input: IcsdbEventsInput = {},
): Promise<IcsdbEventsResult> {
  const query = normalizeIcsdbEventsInput(input)
  const client = new IcsdbClient()
  const calendar = await client.calendarEvents(query.locale, query.slug)
  const events = filterEvents(calendar.events, query.query)
  return {
    kind: 'icsdb.events',
    api: createApiMeta('GET raw build/{locale}/{slug}-nonworkingdays.ics'),
    query,
    calendar: {
      locale: query.locale,
      slug: query.slug,
      ...(calendar.title !== undefined ? { title: calendar.title } : {}),
      sourceUrl: client.sourceUrl(query.locale, query.slug),
      ...(calendar.productId !== undefined ? { productId: calendar.productId } : {}),
      ...(calendar.method !== undefined ? { method: calendar.method } : {}),
      ...(calendar.timezone !== undefined ? { timezone: calendar.timezone } : {}),
    },
    count: Math.min(events.length, query.limit),
    totalEvents: events.length,
    events: events.slice(0, query.limit),
  }
}

export function normalizeIcsdbCalendarsInput(
  input: IcsdbCalendarsInput = {},
): IcsdbCalendarsQuery {
  return {
    locale: normalizeIcsdbLocale(input.locale),
    query: normalizeIcsdbOptionalQuery(input.query),
    limit: normalizeIcsdbLimit(input.limit),
  }
}

export function normalizeIcsdbEventsInput(
  input: IcsdbEventsInput = {},
): IcsdbEventsQuery {
  return {
    ...normalizeIcsdbCalendarsInput(input),
    slug: normalizeIcsdbSlug(input.slug),
  }
}

export function normalizeIcsdbLocale(value: string | undefined): IcsdbLocale {
  const locale = value?.trim() || ICSDB_DEFAULT_LOCALE
  if (ICSDB_LOCALES.includes(locale as IcsdbLocale)) {
    return locale as IcsdbLocale
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `icsdb --locale must be one of ${ICSDB_LOCALES.join(', ')}.`,
    { locale: value },
  )
}

export function normalizeIcsdbSlug(value: string | undefined): string {
  const slug = (value ?? ICSDB_DEFAULT_SLUG).trim().toLowerCase()
  if (slug.length < 1 || slug.length > ICSDB_MAX_SLUG_LENGTH) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `icsdb --slug must be between 1 and ${ICSDB_MAX_SLUG_LENGTH} characters.`,
      { slug: value },
    )
  }
  if (!ICSDB_SLUG_PATTERN.test(slug)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'icsdb --slug supports lowercase letters, digits, spaces, and',
        'hyphens only; do not include paths, URLs, or file extensions.',
      ].join(' '),
      { slug: value },
    )
  }
  return slug
}

function normalizeIcsdbLimit(value: number | undefined): number {
  if (value === undefined) return ICSDB_DEFAULT_LIMIT
  if (!Number.isInteger(value) || value < 1 || value > ICSDB_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `icsdb --limit must be an integer from 1 to ${ICSDB_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return value
}

function normalizeIcsdbOptionalQuery(value: string | undefined): string | undefined {
  const query = value?.trim()
  if (query === undefined || query === '') return undefined
  if (query.length > ICSDB_MAX_QUERY_LENGTH) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `icsdb --query must be ${ICSDB_MAX_QUERY_LENGTH} characters or fewer.`,
      { query: value },
    )
  }
  return query
}

function createApiMeta(endpoint: IcsdbCalendarsResult['api']['endpoint']):
IcsdbCalendarsResult['api']
function createApiMeta(endpoint: IcsdbEventsResult['api']['endpoint']):
IcsdbEventsResult['api']
function createApiMeta(
  endpoint:
    | IcsdbCalendarsResult['api']['endpoint']
    | IcsdbEventsResult['api']['endpoint'],
): IcsdbCalendarsResult['api'] | IcsdbEventsResult['api'] {
  return {
    provider: 'icsdb',
    endpoint,
    docsUrl: ICSDB_REPOSITORY_URL,
    repositoryUrl: ICSDB_REPOSITORY_URL,
    treeUrl: ICSDB_TREE_URL,
    rawBaseUrl: ICSDB_RAW_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS GitHub API + raw ICS text',
    supportedLocales: [...ICSDB_LOCALES],
    limitCap: ICSDB_MAX_LIMIT,
    boundary: [
      'Official GitHub repository, GitHub tree API, and raw build ICS files',
      'only; no GitHub HTML scraping, arbitrary URL proxying, uploads,',
      'deletes, browser clickstream, binary payloads, or raw ICS dumps.',
    ].join(' '),
    freshness: [
      'Repository metadata currently shows historical generated static files;',
      'validate holiday-critical decisions against official local sources.',
    ].join(' '),
  }
}

function filterCalendars(
  calendars: IcsdbCalendarRecord[],
  query: string | undefined,
): IcsdbCalendarRecord[] {
  if (query === undefined) return calendars
  const needle = query.toLowerCase()
  return calendars.filter(calendar => (
    calendar.slug.includes(needle) ||
    calendar.title.toLowerCase().includes(needle) ||
    calendar.fileName.toLowerCase().includes(needle)
  ))
}

function filterEvents(events: IcsdbEvent[], query: string | undefined): IcsdbEvent[] {
  if (query === undefined) return events
  const needle = query.toLowerCase()
  return events.filter(event => (
    event.summary.toLowerCase().includes(needle) ||
    event.categories.some(category => category.toLowerCase().includes(needle))
  ))
}

function projectCalendarRecord(
  calendar: IcsdbCalendarRecord,
): IcsdbCalendarSummary {
  return {
    locale: calendar.locale,
    slug: calendar.slug,
    title: calendar.title,
    fileName: calendar.fileName,
    sourceUrl: calendar.sourceUrl,
  }
}
