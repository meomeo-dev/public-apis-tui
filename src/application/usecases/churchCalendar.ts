import {
  CHURCH_CALENDAR_DEFAULT_CALENDAR,
  CHURCH_CALENDAR_DEFAULT_LANGUAGE,
  CHURCH_CALENDAR_MAX_LIMIT,
  ChurchCalendarClient,
  type ChurchCalendarDayQuery,
  type ChurchCalendarMonthQuery,
  listChurchCalendarIds,
  listChurchCalendarLanguages,
  normalizeChurchCalendarDate,
  normalizeChurchCalendarId,
  normalizeChurchCalendarLanguage,
  normalizeChurchCalendarLimit,
  normalizeChurchCalendarMonth,
  normalizeChurchCalendarYear,
  type ChurchCalendarDay,
} from '../../infrastructure/openApis/churchCalendarClient.js'

export type ChurchCalendarDayInput = {
  date?: string | undefined
  language?: string | undefined
  calendar?: string | undefined
}

export type ChurchCalendarMonthInput = {
  year?: number | undefined
  month?: number | undefined
  language?: string | undefined
  calendar?: string | undefined
  limit?: number | undefined
}

export type ChurchCalendarApiMeta = {
  provider: 'churchcalendar'
  endpoint: string
  docsUrl: 'http://calapi.inadiutorium.cz/api-doc'
  swaggerUrl: 'http://calapi.inadiutorium.cz/swagger.yml'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTP JSON'
  supportedLanguages: string[]
  supportedCalendars: string[]
  defaultLanguage: string
  defaultCalendar: string
  limitCap: number
}

export type ChurchCalendarDayResult = {
  kind: 'churchcalendar.day'
  api: ChurchCalendarApiMeta
  query: ChurchCalendarDayQuery
  day: ChurchCalendarDay
}

export type ChurchCalendarMonthResult = {
  kind: 'churchcalendar.month'
  api: ChurchCalendarApiMeta
  query: ChurchCalendarMonthQuery
  count: number
  days: ChurchCalendarDay[]
}

export async function getChurchCalendarDay(
  input: ChurchCalendarDayInput = {},
): Promise<ChurchCalendarDayResult> {
  const query = normalizeChurchCalendarDayInput(input)
  const client = new ChurchCalendarClient()
  const day = await client.day(query)
  return {
    kind: 'churchcalendar.day',
    api: createApiMeta('GET /api/v0/{lang}/calendars/{calendar}/{y}/{m}/{d}'),
    query,
    day,
  }
}

export async function listChurchCalendarMonth(
  input: ChurchCalendarMonthInput = {},
): Promise<ChurchCalendarMonthResult> {
  const query = normalizeChurchCalendarMonthInput(input)
  const client = new ChurchCalendarClient()
  const days = await client.month(query)
  return {
    kind: 'churchcalendar.month',
    api: createApiMeta('GET /api/v0/{lang}/calendars/{calendar}/{year}/{month}'),
    query,
    count: days.length,
    days,
  }
}

export function normalizeChurchCalendarDayInput(
  input: ChurchCalendarDayInput = {},
): ChurchCalendarDayQuery {
  return {
    date: normalizeChurchCalendarDate(input.date),
    language: normalizeChurchCalendarLanguage(input.language),
    calendar: normalizeChurchCalendarId(input.calendar),
  }
}

export function normalizeChurchCalendarMonthInput(
  input: ChurchCalendarMonthInput = {},
): ChurchCalendarMonthQuery {
  return {
    year: normalizeChurchCalendarYear(input.year),
    month: normalizeChurchCalendarMonth(input.month),
    language: normalizeChurchCalendarLanguage(input.language),
    calendar: normalizeChurchCalendarId(input.calendar),
    limit: normalizeChurchCalendarLimit(input.limit),
  }
}

function createApiMeta(endpoint: string): ChurchCalendarApiMeta {
  return {
    provider: 'churchcalendar',
    endpoint,
    docsUrl: 'http://calapi.inadiutorium.cz/api-doc',
    swaggerUrl: 'http://calapi.inadiutorium.cz/swagger.yml',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTP JSON',
    supportedLanguages: listChurchCalendarLanguages(),
    supportedCalendars: listChurchCalendarIds(),
    defaultLanguage: CHURCH_CALENDAR_DEFAULT_LANGUAGE,
    defaultCalendar: CHURCH_CALENDAR_DEFAULT_CALENDAR,
    limitCap: CHURCH_CALENDAR_MAX_LIMIT,
  }
}
