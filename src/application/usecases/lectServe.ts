import {
  LECTSERVE_LECTIONARIES,
  LectServeClient,
  type LectServeDaily,
  type LectServeDatePayload,
  type LectServeDateQuery,
  type LectServeLectionary,
  type LectServeSunday,
  type LectServeSundayQuery,
} from '../../infrastructure/openApis/lectServeClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LECTSERVE_DEFAULT_LECTIONARY: LectServeLectionary = 'acna'

export type LectServeDateInput = {
  date?: string | undefined
  lectionary?: string | undefined
}

export type LectServeSundayInput = {
  lectionary?: string | undefined
}

export type LectServeDateResult = {
  kind: 'lectserve.date'
  api: LectServeApiMeta
  query: LectServeDateQuery
  sections: LectServeSections
  sunday?: LectServeSunday | undefined
  daily?: LectServeDaily | undefined
  redLetter?: LectServeSunday | undefined
}

export type LectServeSundayResult = {
  kind: 'lectserve.sunday'
  api: LectServeApiMeta
  query: LectServeSundayQuery & { scope: 'upcoming-server-relative-sunday' }
  sunday: LectServeSunday
}

type LectServeApiMeta = {
  provider: 'lectserve'
  endpoint: string
  docsUrl: 'https://www.lectserve.com/api'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON'
  alphaStatus: string
  supportedLectionaries: LectServeLectionary[]
  boundary: string
}

type LectServeSections = {
  hasSunday: boolean
  hasDaily: boolean
  hasRedLetter: boolean
}

export async function getLectServeDate(
  input: LectServeDateInput = {},
): Promise<LectServeDateResult> {
  const query = normalizeLectServeDateInput(input)
  const payload = await new LectServeClient().date(query)
  return {
    kind: 'lectserve.date',
    api: createApiMeta('GET /date/{yyyy-mm-dd}'),
    query,
    sections: createSections(payload),
    ...(payload.sunday !== undefined ? { sunday: payload.sunday } : {}),
    ...(payload.daily !== undefined ? { daily: payload.daily } : {}),
    ...(payload.redLetter !== undefined ? { redLetter: payload.redLetter } : {}),
  }
}

export async function getLectServeSunday(
  input: LectServeSundayInput = {},
): Promise<LectServeSundayResult> {
  const query = normalizeLectServeSundayInput(input)
  const sunday = await new LectServeClient().sunday(query)
  return {
    kind: 'lectserve.sunday',
    api: createApiMeta('GET /sunday'),
    query: { ...query, scope: 'upcoming-server-relative-sunday' },
    sunday,
  }
}

export function normalizeLectServeDateInput(
  input: LectServeDateInput = {},
): LectServeDateQuery {
  return {
    date: normalizeLectServeDate(input.date),
    lectionary: normalizeLectServeLectionary(input.lectionary),
  }
}

export function normalizeLectServeSundayInput(
  input: LectServeSundayInput = {},
): LectServeSundayQuery {
  return {
    lectionary: normalizeLectServeLectionary(input.lectionary),
  }
}

function createApiMeta(endpoint: string): LectServeApiMeta {
  return {
    provider: 'lectserve',
    endpoint,
    docsUrl: 'https://www.lectserve.com/api',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON',
    alphaStatus: [
      'Official docs describe LectServe as alpha quality; endpoint and JSON',
      'payload changes are possible.',
    ].join(' '),
    supportedLectionaries: [...LECTSERVE_LECTIONARIES],
    boundary: [
      'Documented JSON endpoints only; no /today server-time shortcut, no',
      'undocumented /sunday/{date}, no BibleGateway content fetching, no',
      'browser scraping, no mutating behavior, and no raw payload dumping.',
    ].join(' '),
  }
}

function createSections(payload: LectServeDatePayload): LectServeSections {
  return {
    hasSunday: payload.sunday !== undefined,
    hasDaily: payload.daily !== undefined,
    hasRedLetter: payload.redLetter !== undefined,
  }
}

function normalizeLectServeLectionary(
  value: string | undefined,
): LectServeLectionary {
  const lectionary = value?.trim().toLowerCase() || LECTSERVE_DEFAULT_LECTIONARY
  if (LECTSERVE_LECTIONARIES.includes(lectionary as LectServeLectionary)) {
    return lectionary as LectServeLectionary
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `LectServe --lectionary must be one of ${LECTSERVE_LECTIONARIES.join(', ')}.`,
    { lectionary: value },
  )
}

function normalizeLectServeDate(value: string | undefined): string {
  const date = value?.trim() || getUtcTodayDate()
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'LectServe --date must use YYYY-MM-DD.',
      { date: value },
    )
  }
  const parsed = new Date(`${date}T00:00:00Z`)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'LectServe --date must be a real Gregorian date.',
      { date: value },
    )
  }
  return date
}

function getUtcTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}
