import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const COVID_TRACKING_DEFAULT_BASE_URL = 'https://api.covidtracking.com/v2'
export const COVID_TRACKING_DEFAULT_LIMIT = 420
export const COVID_TRACKING_MAX_LIMIT = 420
export const COVID_TRACKING_DEFAULT_STATE_LIMIT = 56
export const COVID_TRACKING_MAX_STATE_LIMIT = 56
export const COVID_TRACKING_DEFAULT_STATE = 'ca'

export type CovidTrackingUsDailyInput = {
  limit?: number | undefined
}

export type NormalizedCovidTrackingUsDailyInput = {
  limit: number
}

export type CovidTrackingStatesInput = {
  limit?: number | undefined
}

export type NormalizedCovidTrackingStatesInput = {
  limit: number
}

export type CovidTrackingStateDailyInput = {
  state?: string | undefined
  limit?: number | undefined
}

export type NormalizedCovidTrackingStateDailyInput = {
  state: string
  limit: number
}

export type CovidTrackingDailyRow = {
  date: string
  state?: string | undefined
  states?: number | undefined
  casesTotal?: number | undefined
  testingTotal?: number | undefined
  hospitalizedCurrently?: number | undefined
  hospitalizedIcuCurrently?: number | undefined
  hospitalizedVentilatorCurrently?: number | undefined
  deathTotal?: number | undefined
  caseChange?: number | undefined
  deathChange?: number | undefined
  dataQualityGrade?: string | undefined
  updated?: string | undefined
}

export type CovidTrackingState = {
  name: string
  stateCode: string
  fips?: string | undefined
  population?: number | undefined
  totalTestUnits?: string | undefined
  totalTestField?: string | undefined
  sourceUrls: string[]
}

export type CovidTrackingEnvelope<T> = {
  meta: CovidTrackingMeta
  rows: T[]
}

export type CovidTrackingMeta = {
  buildTime?: string | undefined
  license?: string | undefined
  version?: string | undefined
}

export class CovidTrackingClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async readUsDaily(input: NormalizedCovidTrackingUsDailyInput): Promise<CovidTrackingEnvelope<CovidTrackingDailyRow>> {
    const parsed = await this.fetchJson('/us/daily.json')
    return parseDailyEnvelope(parsed, input.limit)
  }

  async listStates(input: NormalizedCovidTrackingStatesInput): Promise<CovidTrackingEnvelope<CovidTrackingState>> {
    const parsed = await this.fetchJson('/states.json')
    return parseStatesEnvelope(parsed, input.limit)
  }

  async readStateDaily(input: NormalizedCovidTrackingStateDailyInput): Promise<CovidTrackingEnvelope<CovidTrackingDailyRow>> {
    const parsed = await this.fetchJson(`/states/${input.state}/daily.json`)
    return parseDailyEnvelope(parsed, input.limit)
  }

  private async fetchJson(pathname: string): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    const url = new URL(`${this.options.baseUrl ?? COVID_TRACKING_DEFAULT_BASE_URL}${pathname}`)
    let lastFailure: RuntimeFailure | undefined
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response: Response
      try {
        response = await fetchImpl(url, { headers: { accept: 'application/json' } })
      } catch (error) {
        lastFailure = new RuntimeFailure('OPEN_API_FAILED', `Covid Tracking Project request failed: ${String(error)}`, {
          provider: 'covidtracking',
          endpoint: url.href,
          attempt,
        })
        continue
      }

      let parsed: unknown
      try {
        parsed = await response.json()
      } catch (error) {
        lastFailure = new RuntimeFailure('OPEN_API_FAILED', `Covid Tracking Project returned a non-JSON response: ${String(error)}`, {
          provider: 'covidtracking',
          endpoint: url.href,
          status: response.status,
          attempt,
        })
        continue
      }

      if (!response.ok) {
        throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Covid Tracking Project request failed with HTTP ${response.status}.`, {
          provider: 'covidtracking',
          endpoint: url.href,
          status: response.status,
          response: parsed,
        })
      }

      return parsed
    }

    throw lastFailure ?? new RuntimeFailure('OPEN_API_FAILED', 'Covid Tracking Project request failed.')
  }
}

export function normalizeCovidTrackingUsDailyInput(input: CovidTrackingUsDailyInput = {}): NormalizedCovidTrackingUsDailyInput {
  return { limit: normalizeLimit(input.limit, COVID_TRACKING_DEFAULT_LIMIT, COVID_TRACKING_MAX_LIMIT) }
}

export function normalizeCovidTrackingStatesInput(input: CovidTrackingStatesInput = {}): NormalizedCovidTrackingStatesInput {
  return { limit: normalizeLimit(input.limit, COVID_TRACKING_DEFAULT_STATE_LIMIT, COVID_TRACKING_MAX_STATE_LIMIT) }
}

export function normalizeCovidTrackingStateDailyInput(input: CovidTrackingStateDailyInput = {}): NormalizedCovidTrackingStateDailyInput {
  const state = (input.state ?? COVID_TRACKING_DEFAULT_STATE).trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(state)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--state must be a two-letter state code.')
  }
  return { state, limit: normalizeLimit(input.limit, COVID_TRACKING_DEFAULT_LIMIT, COVID_TRACKING_MAX_LIMIT) }
}

function parseDailyEnvelope(value: unknown, limit: number): CovidTrackingEnvelope<CovidTrackingDailyRow> {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Covid Tracking Project daily response had an unexpected schema.')
  }
  return {
    meta: parseMeta(value.meta),
    rows: value.data.slice(0, limit).filter(isRecord).map(parseDailyRow),
  }
}

function parseDailyRow(value: Record<string, unknown>): CovidTrackingDailyRow {
  const date = optionalString(value.date)
  if (date === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Covid Tracking Project daily row was missing date.')
  }
  const casesTotal = readMetricValue(value, ['cases', 'total'])
  const testingTotal = readMetricValue(value, ['testing', 'total']) ?? readMetricValue(value, ['tests', 'pcr', 'total'])
  const deathTotal = readMetricValue(value, ['outcomes', 'death', 'total'])
  return {
    date,
    state: optionalString(value.state),
    states: readNumber(value.states),
    casesTotal,
    testingTotal,
    hospitalizedCurrently: readMetricValue(value, ['outcomes', 'hospitalized', 'currently']),
    hospitalizedIcuCurrently: readMetricValue(value, ['outcomes', 'hospitalized', 'in_icu', 'currently']),
    hospitalizedVentilatorCurrently: readMetricValue(value, ['outcomes', 'hospitalized', 'on_ventilator', 'currently']),
    deathTotal,
    caseChange: readMetricCalculated(value, ['cases', 'total'], 'change_from_prior_day'),
    deathChange: readMetricCalculated(value, ['outcomes', 'death', 'total'], 'change_from_prior_day'),
    dataQualityGrade: readPathString(value, ['meta', 'data_quality_grade']),
    updated: readPathString(value, ['meta', 'updated']),
  }
}

function parseStatesEnvelope(value: unknown, limit: number): CovidTrackingEnvelope<CovidTrackingState> {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Covid Tracking Project states response had an unexpected schema.')
  }
  return {
    meta: parseMeta(value.meta),
    rows: value.data.slice(0, limit).filter(isRecord).map(parseState),
  }
}

function parseState(value: Record<string, unknown>): CovidTrackingState {
  const name = optionalString(value.name)
  const stateCode = optionalString(value.state_code)
  if (name === undefined || stateCode === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Covid Tracking Project state row was missing name or state_code.')
  }
  const preferredTotalTest = readPathRecord(value, ['covid_tracking_project', 'preferred_total_test'])
  return {
    name,
    stateCode,
    fips: optionalString(value.fips),
    population: readPathNumber(value, ['census', 'population']),
    totalTestUnits: optionalString(preferredTotalTest?.units),
    totalTestField: optionalString(preferredTotalTest?.field),
    sourceUrls: Array.isArray(value.sites) ? value.sites.filter(isRecord).map(site => optionalString(site.url)).filter((url): url is string => url !== undefined) : [],
  }
}

function parseMeta(value: unknown): CovidTrackingMeta {
  if (!isRecord(value)) {
    return {}
  }
  return {
    buildTime: optionalString(value.build_time),
    license: optionalString(value.license),
    version: optionalString(value.version),
  }
}

function readMetricValue(value: Record<string, unknown>, path: string[]): number | undefined {
  return readPathNumber(value, [...path, 'value'])
}

function readMetricCalculated(value: Record<string, unknown>, path: string[], field: string): number | undefined {
  return readPathNumber(value, [...path, 'calculated', field])
}

function readPathRecord(value: Record<string, unknown>, path: string[]): Record<string, unknown> | undefined {
  const resolved = readPath(value, path)
  return isRecord(resolved) ? resolved : undefined
}

function readPathNumber(value: Record<string, unknown>, path: string[]): number | undefined {
  return readNumber(readPath(value, path))
}

function readPathString(value: Record<string, unknown>, path: string[]): string | undefined {
  return optionalString(readPath(value, path))
}

function readPath(value: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((cursor, key) => (isRecord(cursor) ? cursor[key] : undefined), value)
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const limit = value ?? fallback
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${max}.`)
  }
  return limit
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.error) ?? optionalString(value.message)
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
