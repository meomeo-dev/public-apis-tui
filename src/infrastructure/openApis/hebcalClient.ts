import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HEBCAL_DEFAULT_BASE_URL = 'https://www.hebcal.com'
export const HEBCAL_DEFAULT_DATE_LABEL = 'today'
export const HEBCAL_DEFAULT_CALENDAR_DAYS = 7
export const HEBCAL_MAX_CALENDAR_DAYS = 180

export type HebcalConvertQuery = {
  date: string
  strict: boolean
}

export type HebcalCalendarQuery = {
  start: string
  end: string
  days: number
  israel: boolean
  major: boolean
  minor: boolean
  roshChodesh: boolean
  modern: boolean
  shabbat: boolean
}

export type HebcalConvertResult = {
  gregorianDate: string
  hebrewDate: string
  hebrewText: string
  events: string[]
  sourceUrl?: string | undefined
}

export type HebcalCalendarEvent = {
  title: string
  date: string
  category?: string | undefined
  subcat?: string | undefined
  hebrew?: string | undefined
  link?: string | undefined
  memo?: string | undefined
}

export type HebcalCalendarResult = {
  title?: string | undefined
  location?: Record<string, unknown> | undefined
  events: HebcalCalendarEvent[]
}

export class HebcalClient {
  constructor(private readonly baseUrl = HEBCAL_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async convert(query: HebcalConvertQuery): Promise<HebcalConvertResult> {
    const url = this.createUrl('/converter', {
      cfg: 'json',
      date: query.date,
      g2h: '1',
      strict: query.strict ? '1' : '0',
    })
    const data = await this.fetchJson(url)
    return parseConvert(data, url.toString())
  }

  async calendar(query: HebcalCalendarQuery): Promise<HebcalCalendarResult> {
    const url = this.createUrl('/hebcal', {
      v: '1',
      cfg: 'json',
      start: query.start,
      end: query.end,
      maj: query.major ? 'on' : 'off',
      min: query.minor ? 'on' : 'off',
      nx: query.roshChodesh ? 'on' : 'off',
      mod: query.modern ? 'on' : 'off',
      s: query.shabbat ? 'on' : 'off',
      i: query.israel ? 'on' : 'off',
    })
    const data = await this.fetchJson(url)
    return parseCalendar(data)
  }

  private createUrl(pathname: string, params: Record<string, string>): URL {
    const url = new URL(pathname, normalizeBaseUrl(this.baseUrl))
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hebcal request failed: ${String(error)}`, {
        provider: 'hebcal',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hebcal request failed with HTTP ${response.status}.`, {
        provider: 'hebcal',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hebcal response was not JSON: ${String(error)}`, {
        provider: 'hebcal',
        url: url.toString(),
      })
    }
  }
}

export function normalizeHebcalConvertQuery(input: { date?: string | undefined; strict?: boolean | undefined } = {}): HebcalConvertQuery {
  const date = normalizeDate(input.date, 'date') ?? getTodayDate()
  return {
    date,
    strict: input.strict ?? true,
  }
}

export function normalizeHebcalCalendarQuery(input: {
  start?: string | undefined
  end?: string | undefined
  days?: number | undefined
  israel?: boolean | undefined
  major?: boolean | undefined
  minor?: boolean | undefined
  roshChodesh?: boolean | undefined
  modern?: boolean | undefined
  shabbat?: boolean | undefined
} = {}): HebcalCalendarQuery {
  const start = normalizeDate(input.start, 'start') ?? getTodayDate()
  const days = normalizeDays(input.days)
  const end = normalizeDate(input.end, 'end') ?? addUtcDays(start, days - 1)
  return {
    start,
    end,
    days: countInclusiveDays(start, end),
    israel: input.israel ?? false,
    major: input.major ?? true,
    minor: input.minor ?? true,
    roshChodesh: input.roshChodesh ?? true,
    modern: input.modern ?? true,
    shabbat: input.shabbat ?? true,
  }
}

function parseConvert(value: unknown, sourceUrl: string): HebcalConvertResult {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hebcal converter response was not an object.')
  }
  const gregorianDate = typeof value.gy === 'number' && typeof value.gm === 'number' && typeof value.gd === 'number'
    ? formatDateParts(value.gy, value.gm, value.gd)
    : undefined
  if (gregorianDate === undefined || typeof value.hebrew !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hebcal converter response is missing date fields.')
  }

  return {
    gregorianDate,
    hebrewDate: [value.hy, value.hm, value.hd].map(part => String(part ?? '')).filter(part => part !== '').join(' '),
    hebrewText: value.hebrew,
    events: Array.isArray(value.events) ? value.events.filter((event): event is string => typeof event === 'string') : [],
    sourceUrl,
  }
}

function parseCalendar(value: unknown): HebcalCalendarResult {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hebcal calendar response is missing items.')
  }

  return {
    ...(typeof value.title === 'string' ? { title: value.title } : {}),
    ...(isRecord(value.location) ? { location: value.location } : {}),
    events: value.items.filter(isRecord).flatMap(parseCalendarEvent),
  }
}

function parseCalendarEvent(value: Record<string, unknown>): HebcalCalendarEvent[] {
  if (typeof value.title !== 'string' || typeof value.date !== 'string') {
    return []
  }
  return [{
    title: value.title,
    date: value.date,
    ...(typeof value.category === 'string' ? { category: value.category } : {}),
    ...(typeof value.subcat === 'string' ? { subcat: value.subcat } : {}),
    ...(typeof value.hebrew === 'string' ? { hebrew: value.hebrew } : {}),
    ...(typeof value.link === 'string' ? { link: value.link } : {}),
    ...(typeof value.memo === 'string' ? { memo: value.memo } : {}),
  }]
}

function normalizeDate(value: string | undefined, label: string): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Hebcal ${label} must be YYYY-MM-DD.`, { [label]: value })
  }
  return value
}

function normalizeDays(value: number | undefined): number {
  if (value === undefined) {
    return HEBCAL_DEFAULT_CALENDAR_DAYS
  }
  if (!Number.isInteger(value) || value < 1 || value > HEBCAL_MAX_CALENDAR_DAYS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Hebcal days must be between 1 and ${HEBCAL_MAX_CALENDAR_DAYS}.`, {
      days: value,
      max: HEBCAL_MAX_CALENDAR_DAYS,
    })
  }
  return value
}

function countInclusiveDays(start: string, end: string): number {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)
  if (endTime < startTime) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Hebcal end date must be on or after start date.', { start, end })
  }
  const days = Math.floor((endTime - startTime) / 86_400_000) + 1
  if (days > HEBCAL_MAX_CALENDAR_DAYS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Hebcal calendar range must be ${HEBCAL_MAX_CALENDAR_DAYS} days or fewer.`, {
      start,
      end,
      days,
      max: HEBCAL_MAX_CALENDAR_DAYS,
    })
  }
  return days
}

function addUtcDays(date: string, days: number): string {
  const dateValue = new Date(`${date}T00:00:00Z`)
  dateValue.setUTCDate(dateValue.getUTCDate() + days)
  return dateValue.toISOString().slice(0, 10)
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
