import {
  HebcalClient,
  HEBCAL_DEFAULT_DATE_LABEL,
  HEBCAL_DEFAULT_CALENDAR_DAYS,
  HEBCAL_MAX_CALENDAR_DAYS,
  normalizeHebcalCalendarQuery,
  normalizeHebcalConvertQuery,
  type HebcalCalendarEvent,
} from '../../infrastructure/openApis/hebcalClient.js'

export type HebcalConvertInput = {
  date?: string | undefined
  strict?: boolean | undefined
}

export type HebcalCalendarInput = {
  start?: string | undefined
  end?: string | undefined
  days?: number | undefined
  israel?: boolean | undefined
  major?: boolean | undefined
  minor?: boolean | undefined
  roshChodesh?: boolean | undefined
  modern?: boolean | undefined
  shabbat?: boolean | undefined
}

export async function convertHebcalDate(input: HebcalConvertInput = {}): Promise<Record<string, unknown>> {
  const client = new HebcalClient()
  const query = normalizeHebcalConvertInput(input)
  const conversion = await client.convert(query)
  return {
    kind: 'hebcal.convert',
    api: createApiMeta('GET /converter'),
    query,
    conversion,
  }
}

export async function listHebcalCalendar(input: HebcalCalendarInput = {}): Promise<Record<string, unknown>> {
  const client = new HebcalClient()
  const query = normalizeHebcalCalendarInput(input)
  const calendar = await client.calendar(query)
  const events = calendar.events.map(projectCalendarEvent)
  return {
    kind: 'hebcal.calendar',
    api: createApiMeta('GET /hebcal'),
    query,
    title: calendar.title,
    location: calendar.location,
    count: events.length,
    events,
  }
}

export function normalizeHebcalConvertInput(input: HebcalConvertInput = {}) {
  return normalizeHebcalConvertQuery(input)
}

export function normalizeHebcalCalendarInput(input: HebcalCalendarInput = {}) {
  return normalizeHebcalCalendarQuery(input)
}

function createApiMeta(endpoint: string): Record<string, unknown> {
  return {
    provider: 'hebcal',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://www.hebcal.com/home/developer-apis',
    rateLimit: 'More than 90 requests per 10-second window may be throttled or blocked.',
    defaultConvertDate: HEBCAL_DEFAULT_DATE_LABEL,
    defaultCalendarStart: HEBCAL_DEFAULT_DATE_LABEL,
    defaultCalendarDays: HEBCAL_DEFAULT_CALENDAR_DAYS,
    calendarDaysCap: HEBCAL_MAX_CALENDAR_DAYS,
  }
}

function projectCalendarEvent(event: HebcalCalendarEvent): Record<string, unknown> {
  return {
    title: event.title,
    date: event.date,
    ...(event.category !== undefined ? { category: event.category } : {}),
    ...(event.subcat !== undefined ? { subcat: event.subcat } : {}),
    ...(event.hebrew !== undefined ? { hebrew: event.hebrew } : {}),
    ...(event.link !== undefined ? { link: event.link } : {}),
    ...(event.memo !== undefined ? { memo: event.memo } : {}),
  }
}
