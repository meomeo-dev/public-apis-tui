import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CHURCH_CALENDAR_DEFAULT_BASE_URL = 'http://calapi.inadiutorium.cz'
export const CHURCH_CALENDAR_DEFAULT_LANGUAGE = 'en'
export const CHURCH_CALENDAR_DEFAULT_CALENDAR = 'general-en'
export const CHURCH_CALENDAR_DEFAULT_LIMIT = 31
export const CHURCH_CALENDAR_MAX_LIMIT = 31

const supportedLanguages = ['cs', 'en', 'fr', 'it', 'la'] as const
const supportedCalendars = [
  'general-en',
  'general-la',
  'general-fr',
  'general-it',
  'czech',
  'czech-cechy',
  'czech-morava',
  'czech-pha',
  'czech-ltm',
  'czech-hk',
  'czech-cb',
  'czech-plz',
  'czech-olm',
  'czech-brn',
  'czech-oo',
  'default',
] as const

export type ChurchCalendarLanguage = typeof supportedLanguages[number]
export type ChurchCalendarId = typeof supportedCalendars[number]

export type ChurchCalendarCalendarQuery = {
  language: ChurchCalendarLanguage
}

export type ChurchCalendarDayQuery = {
  date: string
  language: ChurchCalendarLanguage
  calendar: ChurchCalendarId
}

export type ChurchCalendarMonthQuery = {
  year: number
  month: number
  language: ChurchCalendarLanguage
  calendar: ChurchCalendarId
  limit: number
}

export type ChurchCalendarDescription = {
  id: string
  title?: string | undefined
  language?: string | undefined
}

export type ChurchCalendarCelebration = {
  title: string
  colour?: string | undefined
  rank?: string | undefined
  rankNum?: number | undefined
}

export type ChurchCalendarDay = {
  date: string
  season?: string | undefined
  seasonWeek?: number | undefined
  weekday?: string | undefined
  celebrations: ChurchCalendarCelebration[]
}

export type ChurchCalendarClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ChurchCalendarClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ChurchCalendarClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? CHURCH_CALENDAR_DEFAULT_BASE_URL,
    )
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listCalendars(
    query: ChurchCalendarCalendarQuery,
  ): Promise<ChurchCalendarDescription[]> {
    const ids = await this.fetchJson(this.createUrl(query.language, 'calendars'))
    if (!Array.isArray(ids)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Church Calendar calendars response was not an array.',
      )
    }
    return ids
      .filter((id): id is string => typeof id === 'string')
      .map(id => ({ id }))
  }

  async day(query: ChurchCalendarDayQuery): Promise<ChurchCalendarDay> {
    const [year, month, day] = parseDateParts(query.date)
    const path = [
      'calendars',
      query.calendar,
      String(year),
      String(month),
      String(day),
    ].join('/')
    const value = await this.fetchJson(this.createUrl(query.language, path))
    if (!isRecord(value)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Church Calendar day response was not an object.',
      )
    }
    return parseDay(value)
  }

  async month(query: ChurchCalendarMonthQuery): Promise<ChurchCalendarDay[]> {
    const path = [
      'calendars',
      query.calendar,
      String(query.year),
      String(query.month),
    ].join('/')
    const days = await this.fetchJson(this.createUrl(query.language, path))
    if (!Array.isArray(days)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Church Calendar month response was not an array.',
      )
    }
    return days.filter(isRecord).map(parseDay).slice(0, query.limit)
  }

  private createUrl(language: ChurchCalendarLanguage, path: string): URL {
    return new URL(`/api/v0/${language}/${path}`, this.baseUrl)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Church Calendar request failed: ${String(error)}`,
        { provider: 'churchcalendar', url: url.toString() },
      )
    }

    const body = await response.text()
    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Church Calendar is currently returning a Cloudflare challenge HTML',
          'page instead of the documented JSON API response; retry later or',
          'use cached/offline data.',
        ].join(' '),
        {
          provider: 'churchcalendar',
          status: response.status,
          url: url.toString(),
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }
    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        body.trim() || `Church Calendar request failed with HTTP ${response.status}.`,
        {
          provider: 'churchcalendar',
          status: response.status,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }

    try {
      return JSON.parse(body) as unknown
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Church Calendar response was not JSON: ${String(error)}`,
        {
          provider: 'churchcalendar',
          url: url.toString(),
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }
  }
}

export function normalizeChurchCalendarLanguage(
  value: string | undefined,
): ChurchCalendarLanguage {
  const language = value?.trim() || CHURCH_CALENDAR_DEFAULT_LANGUAGE
  if (!isSupportedLanguage(language)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Church Calendar --language must be one of ${supportedLanguages.join(', ')}.`,
      { language: value },
    )
  }
  return language
}

export function normalizeChurchCalendarId(
  value: string | undefined,
): ChurchCalendarId {
  const calendar = value?.trim() || CHURCH_CALENDAR_DEFAULT_CALENDAR
  if (!isSupportedCalendar(calendar)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Church Calendar --calendar must be a documented calendar id.',
      { calendar: value, supportedCalendars },
    )
  }
  return calendar
}

export function normalizeChurchCalendarDate(value: string | undefined): string {
  const date = value?.trim() || getTodayDate()
  parseDateParts(date)
  return date
}

export function normalizeChurchCalendarYear(value: number | undefined): number {
  const year = value ?? new Date().getUTCFullYear()
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Church Calendar --year must be an integer from 1970 to 9999.',
      { year: value },
    )
  }
  return year
}

export function normalizeChurchCalendarMonth(
  value: number | undefined,
): number {
  const month = value ?? (new Date().getUTCMonth() + 1)
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Church Calendar --month must be an integer from 1 to 12.',
      { month: value },
    )
  }
  return month
}

export function normalizeChurchCalendarLimit(
  value: number | undefined,
): number {
  const limit = value ?? CHURCH_CALENDAR_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > CHURCH_CALENDAR_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Church Calendar --limit must be an integer from 1 to',
        `${CHURCH_CALENDAR_MAX_LIMIT}.`,
      ].join(' '),
      { limit: value },
    )
  }
  return limit
}

export function listChurchCalendarLanguages(): string[] {
  return [...supportedLanguages]
}

export function listChurchCalendarIds(): string[] {
  return [...supportedCalendars]
}

function parseDay(value: Record<string, unknown>): ChurchCalendarDay {
  if (typeof value.date !== 'string') {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Church Calendar day response is missing date.',
    )
  }
  const celebrations = Array.isArray(value.celebrations)
    ? value.celebrations.filter(isRecord).map(parseCelebration)
    : []
  return {
    date: value.date,
    ...(typeof value.season === 'string' ? { season: value.season } : {}),
    ...(typeof value.season_week === 'number'
      ? { seasonWeek: value.season_week }
      : {}),
    ...(typeof value.weekday === 'string' ? { weekday: value.weekday } : {}),
    celebrations,
  }
}

function parseCelebration(
  value: Record<string, unknown>,
): ChurchCalendarCelebration {
  return {
    title: typeof value.title === 'string' ? value.title : '',
    ...(typeof value.colour === 'string' ? { colour: value.colour } : {}),
    ...(typeof value.rank === 'string' ? { rank: value.rank } : {}),
    ...(typeof value.rank_num === 'number' ? { rankNum: value.rank_num } : {}),
  }
}

function parseDateParts(value: string): [number, number, number] {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Church Calendar --date must be YYYY-MM-DD.',
      { date: value },
    )
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Church Calendar --date must be a real Gregorian date.',
      { date: value },
    )
  }
  const [year, month, day] = value.split('-').map(part => Number(part))
  return [year ?? 0, month ?? 0, day ?? 0]
}

function isSupportedLanguage(value: string): value is ChurchCalendarLanguage {
  return supportedLanguages.includes(value as ChurchCalendarLanguage)
}

function isSupportedCalendar(value: string): value is ChurchCalendarId {
  return supportedCalendars.includes(value as ChurchCalendarId)
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const bodyLower = body.toLowerCase()
  return (
    mitigated === 'challenge' ||
    (server.includes('cloudflare') &&
      contentType.includes('text/html') &&
      (response.status === 403 || response.status === 429) &&
      (bodyLower.includes('<title>just a moment...</title>') ||
        bodyLower.includes('cloudflare')))
  )
}
