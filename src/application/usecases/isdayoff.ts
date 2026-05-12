import {
  ISDAYOFF_BASE_URL,
  ISDAYOFF_COUNTRIES,
  ISDAYOFF_DB_URL,
  ISDAYOFF_DEFAULT_COUNTRY,
  ISDAYOFF_DOCS_URL,
  ISDAYOFF_MAX_RANGE_DAYS,
  IsdayoffClient,
  addIsoDays,
  diffIsoDays,
  toIsoDate,
  type IsdayoffCountry,
  type IsdayoffDayStatus,
} from '../../infrastructure/openApis/isdayoffClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ISDAYOFF_DEFAULT_DAYS = 14
export const ISDAYOFF_DEFAULT_DATE_LABEL = 'today'
export const ISDAYOFF_DEFAULT_PRE = true
export const ISDAYOFF_DEFAULT_SIX_DAY = false
export const ISDAYOFF_DEFAULT_HOLIDAY = false

export type IsdayoffDayInput = {
  date?: string | undefined
  countryCode?: string | undefined
  includeShortened?: boolean | undefined
  sixDay?: boolean | undefined
  markHoliday?: boolean | undefined
}

export type IsdayoffRangeInput = IsdayoffDayInput & {
  from?: string | undefined
  to?: string | undefined
  days?: number | undefined
}

export type IsdayoffCommonQuery = {
  countryCode: IsdayoffCountry
  includeShortened: boolean
  sixDay: boolean
  markHoliday: boolean
}

export type IsdayoffDayQuery = IsdayoffCommonQuery & {
  date: string
}

export type IsdayoffRangeQuery = IsdayoffCommonQuery & {
  from: string
  to: string
  days: number
}

export type IsdayoffApiMeta = {
  provider: 'isdayoff'
  endpoint: string
  docsUrl: typeof ISDAYOFF_DOCS_URL
  databaseUrl: typeof ISDAYOFF_DB_URL
  baseUrl: typeof ISDAYOFF_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS text/plain status API'
  supportedCountries: IsdayoffCountry[]
  defaultCountryCode: typeof ISDAYOFF_DEFAULT_COUNTRY
  defaultDate: typeof ISDAYOFF_DEFAULT_DATE_LABEL
  defaultRangeDays: typeof ISDAYOFF_DEFAULT_DAYS
  rangeDayCap: typeof ISDAYOFF_MAX_RANGE_DAYS
  boundary: string
  freshness: string
}

export type IsdayoffDayResult = {
  kind: 'isdayoff.day'
  api: IsdayoffApiMeta & {
    endpoint: 'GET /api/getdata?year={YYYY}&month={MM}&day={DD}'
  }
  query: IsdayoffDayQuery
  status: IsdayoffDayStatus
}

export type IsdayoffRangeResult = {
  kind: 'isdayoff.range'
  api: IsdayoffApiMeta & {
    endpoint: 'GET /api/getdata?date1={YYYYMMDD}&date2={YYYYMMDD}'
  }
  query: IsdayoffRangeQuery
  count: number
  totals: {
    workingDays: number
    nonWorkingDays: number
    shortenedDays: number
    holidays: number
  }
  days: IsdayoffDayStatus[]
}

export async function getIsdayoffDay(
  input: IsdayoffDayInput = {},
): Promise<IsdayoffDayResult> {
  const query = normalizeIsdayoffDayInput(input)
  const status = await new IsdayoffClient().day(query)
  return {
    kind: 'isdayoff.day',
    api: createApiMeta('GET /api/getdata?year={YYYY}&month={MM}&day={DD}'),
    query,
    status,
  }
}

export async function listIsdayoffRange(
  input: IsdayoffRangeInput = {},
): Promise<IsdayoffRangeResult> {
  const query = normalizeIsdayoffRangeInput(input)
  const days = await new IsdayoffClient().range(query)
  return {
    kind: 'isdayoff.range',
    api: createApiMeta(
      'GET /api/getdata?date1={YYYYMMDD}&date2={YYYYMMDD}',
    ),
    query,
    count: days.length,
    totals: summarizeDays(days),
    days,
  }
}

export function normalizeIsdayoffDayInput(
  input: IsdayoffDayInput = {},
): IsdayoffDayQuery {
  return {
    ...normalizeCommonInput(input),
    date: normalizeIsoDate(input.date, getIsdayoffDefaultDate()),
  }
}

export function normalizeIsdayoffRangeInput(
  input: IsdayoffRangeInput = {},
): IsdayoffRangeQuery {
  const common = normalizeCommonInput(input)
  const from = normalizeIsoDate(input.from, getIsdayoffDefaultDate())
  const to = input.to === undefined || input.to.trim() === ''
    ? addIsoDays(from, normalizeRangeDays(input.days) - 1)
    : normalizeIsoDate(input.to, from)
  const days = diffIsoDays(from, to) + 1
  if (days < 1 || days > ISDAYOFF_MAX_RANGE_DAYS) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `isDayOff range must contain 1 to ${ISDAYOFF_MAX_RANGE_DAYS} days.`,
      { from, to, days },
    )
  }
  return { ...common, from, to, days }
}

export function getIsdayoffDefaultDate(today = new Date()): string {
  return toIsoDate(today)
}

function normalizeCommonInput(input: IsdayoffDayInput): IsdayoffCommonQuery {
  return {
    countryCode: normalizeCountryCode(input.countryCode),
    includeShortened: input.includeShortened ?? ISDAYOFF_DEFAULT_PRE,
    sixDay: input.sixDay ?? ISDAYOFF_DEFAULT_SIX_DAY,
    markHoliday: input.markHoliday ?? ISDAYOFF_DEFAULT_HOLIDAY,
  }
}

function normalizeIsoDate(value: string | undefined, fallback: string): string {
  const date = value?.trim() || fallback
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'isDayOff date must use YYYY-MM-DD format.',
      { date: value },
    )
  }
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || toIsoDate(parsed) !== date) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'isDayOff date must be a real Gregorian date.',
      { date: value },
    )
  }
  return date
}

function normalizeCountryCode(value: string | undefined): IsdayoffCountry {
  const countryCode = (value ?? ISDAYOFF_DEFAULT_COUNTRY).trim().toLowerCase()
  if (ISDAYOFF_COUNTRIES.includes(countryCode as IsdayoffCountry)) {
    return countryCode as IsdayoffCountry
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `isDayOff --country-code must be one of ${ISDAYOFF_COUNTRIES.join(', ')}.`,
    { countryCode: value },
  )
}

function normalizeRangeDays(value: number | undefined): number {
  if (value === undefined) return ISDAYOFF_DEFAULT_DAYS
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > ISDAYOFF_MAX_RANGE_DAYS
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `isDayOff --days must be an integer from 1 to ${ISDAYOFF_MAX_RANGE_DAYS}.`,
      { days: value },
    )
  }
  return value
}

function createApiMeta(endpoint: IsdayoffDayResult['api']['endpoint']):
IsdayoffDayResult['api']
function createApiMeta(endpoint: IsdayoffRangeResult['api']['endpoint']):
IsdayoffRangeResult['api']
function createApiMeta(
  endpoint:
    | IsdayoffDayResult['api']['endpoint']
    | IsdayoffRangeResult['api']['endpoint'],
): IsdayoffDayResult['api'] | IsdayoffRangeResult['api'] {
  return {
    provider: 'isdayoff',
    endpoint,
    docsUrl: ISDAYOFF_DOCS_URL,
    databaseUrl: ISDAYOFF_DB_URL,
    baseUrl: ISDAYOFF_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS text/plain status API',
    supportedCountries: [...ISDAYOFF_COUNTRIES],
    defaultCountryCode: ISDAYOFF_DEFAULT_COUNTRY,
    defaultDate: ISDAYOFF_DEFAULT_DATE_LABEL,
    defaultRangeDays: ISDAYOFF_DEFAULT_DAYS,
    rangeDayCap: ISDAYOFF_MAX_RANGE_DAYS,
    boundary: [
      'Documented getdata text status API only; no browser scraping,',
      'HTML-as-data, arbitrary path proxying, aliases, delimiter passthrough,',
      'upload/delete/share behavior, account flows, or raw text dumps.',
    ].join(' '),
    freshness: [
      'Provider database coverage varies by country and year; see official',
      'database page and validate business-critical decisions locally.',
    ].join(' '),
  }
}

function summarizeDays(days: IsdayoffDayStatus[]): IsdayoffRangeResult['totals'] {
  return {
    workingDays: days.filter(day => day.isWorkingDay).length,
    nonWorkingDays: days.filter(day => day.isNonWorkingDay).length,
    shortenedDays: days.filter(day => day.isShortenedDay).length,
    holidays: days.filter(day => day.isHoliday).length,
  }
}
