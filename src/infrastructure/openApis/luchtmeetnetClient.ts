import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LUCHTMEETNET_DEFAULT_BASE_URL = 'https://api.luchtmeetnet.nl/open_api'
export const LUCHTMEETNET_DEFAULT_FORMULA = 'NO2'
export const LUCHTMEETNET_DEFAULT_STATION = 'NL01485'
export const LUCHTMEETNET_DEFAULT_LATITUDE = 51.924452
export const LUCHTMEETNET_DEFAULT_LONGITUDE = 4.458807
export const LUCHTMEETNET_COMPONENTS_DEFAULT_LIMIT = 13
export const LUCHTMEETNET_COMPONENTS_MAX_LIMIT = 13
export const LUCHTMEETNET_MEASUREMENTS_DEFAULT_LIMIT = 167
export const LUCHTMEETNET_MEASUREMENTS_MAX_LIMIT = 167
export const LUCHTMEETNET_CONCENTRATIONS_DEFAULT_LIMIT = 19
export const LUCHTMEETNET_CONCENTRATIONS_MAX_LIMIT = 19

export type LuchtmeetnetComponentsInput = {
  limit?: number | undefined
}

export type NormalizedLuchtmeetnetComponentsInput = {
  limit: number
}

export type LuchtmeetnetMeasurementsInput = {
  stationNumber?: string | undefined
  formula?: string | undefined
  limit?: number | undefined
}

export type NormalizedLuchtmeetnetMeasurementsInput = {
  stationNumber: string
  formula: string
  limit: number
}

export type LuchtmeetnetConcentrationsInput = {
  formula?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  limit?: number | undefined
}

export type NormalizedLuchtmeetnetConcentrationsInput = {
  formula: string
  latitude: number
  longitude: number
  limit: number
}

export type LuchtmeetnetPagination = {
  lastPage?: number | undefined
  firstPage?: number | undefined
  previousPage?: number | undefined
  currentPage?: number | undefined
  nextPage?: number | undefined
  pageList: number[]
}

export type LuchtmeetnetComponent = {
  formula: string
  nameNl?: string | undefined
  nameEn?: string | undefined
}

export type LuchtmeetnetMeasurement = {
  stationNumber?: string | undefined
  value?: number | undefined
  timestampMeasured?: string | undefined
  formula?: string | undefined
}

export type LuchtmeetnetPaged<T> = {
  pagination?: LuchtmeetnetPagination | undefined
  data: T[]
}

export class LuchtmeetnetClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listComponents(input: NormalizedLuchtmeetnetComponentsInput): Promise<LuchtmeetnetPaged<LuchtmeetnetComponent>> {
    const url = this.createUrl('/components')
    url.searchParams.set('page', '1')
    url.searchParams.set('order_by', 'formula')
    const parsed = await this.fetchJson(url)
    const response = parsePagedResponse(parsed, parseComponent)
    return { ...response, data: response.data.slice(0, input.limit) }
  }

  async listMeasurements(input: NormalizedLuchtmeetnetMeasurementsInput): Promise<LuchtmeetnetPaged<LuchtmeetnetMeasurement>> {
    const url = this.createUrl('/measurements')
    url.searchParams.set('station_number', input.stationNumber)
    url.searchParams.set('formula', input.formula)
    url.searchParams.set('page', '1')
    url.searchParams.set('order_by', 'timestamp_measured')
    url.searchParams.set('order_direction', 'desc')
    const parsed = await this.fetchJson(url)
    const response = parsePagedResponse(parsed, parseMeasurement)
    return { ...response, data: response.data.slice(0, input.limit) }
  }

  async listConcentrations(input: NormalizedLuchtmeetnetConcentrationsInput): Promise<LuchtmeetnetPaged<LuchtmeetnetMeasurement>> {
    const url = this.createUrl('/concentrations')
    url.searchParams.set('formula', input.formula.toLowerCase())
    url.searchParams.set('latitude', String(input.latitude))
    url.searchParams.set('longitude', String(input.longitude))
    const parsed = await this.fetchJson(url)
    const response = parsePagedResponse(parsed, parseMeasurement)
    return { ...response, data: response.data.slice(0, input.limit) }
  }

  private createUrl(pathname: string): URL {
    return new URL(`${this.options.baseUrl ?? LUCHTMEETNET_DEFAULT_BASE_URL}${pathname}`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Luchtmeetnet request failed: ${String(error)}`, {
        provider: 'luchtmeetnet',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Luchtmeetnet returned a non-JSON response: ${String(error)}`, {
        provider: 'luchtmeetnet',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Luchtmeetnet request failed with HTTP ${response.status}.`, {
        provider: 'luchtmeetnet',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeLuchtmeetnetComponentsInput(input: LuchtmeetnetComponentsInput = {}): NormalizedLuchtmeetnetComponentsInput {
  return { limit: normalizeLimit(input.limit, LUCHTMEETNET_COMPONENTS_DEFAULT_LIMIT, LUCHTMEETNET_COMPONENTS_MAX_LIMIT) }
}

export function normalizeLuchtmeetnetMeasurementsInput(input: LuchtmeetnetMeasurementsInput = {}): NormalizedLuchtmeetnetMeasurementsInput {
  return {
    stationNumber: normalizeStationNumber(input.stationNumber),
    formula: normalizeFormula(input.formula),
    limit: normalizeLimit(input.limit, LUCHTMEETNET_MEASUREMENTS_DEFAULT_LIMIT, LUCHTMEETNET_MEASUREMENTS_MAX_LIMIT),
  }
}

export function normalizeLuchtmeetnetConcentrationsInput(input: LuchtmeetnetConcentrationsInput = {}): NormalizedLuchtmeetnetConcentrationsInput {
  return {
    formula: normalizeFormula(input.formula),
    latitude: normalizeCoordinate(input.latitude, LUCHTMEETNET_DEFAULT_LATITUDE, 'latitude', -90, 90),
    longitude: normalizeCoordinate(input.longitude, LUCHTMEETNET_DEFAULT_LONGITUDE, 'longitude', -180, 180),
    limit: normalizeLimit(input.limit, LUCHTMEETNET_CONCENTRATIONS_DEFAULT_LIMIT, LUCHTMEETNET_CONCENTRATIONS_MAX_LIMIT),
  }
}

function normalizeStationNumber(value: string | undefined): string {
  const stationNumber = (value ?? LUCHTMEETNET_DEFAULT_STATION).trim().toUpperCase()
  if (!/^[A-Z]{2}\d{5}$/u.test(stationNumber)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--station-number must look like NL01485.')
  }
  return stationNumber
}

function normalizeFormula(value: string | undefined): string {
  const formula = (value ?? LUCHTMEETNET_DEFAULT_FORMULA).trim().toUpperCase()
  if (!/^[A-Z0-9.]{1,12}$/u.test(formula)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--formula must be a component formula such as NO2, PM10, or PM25.')
  }
  return formula
}

function normalizeCoordinate(value: number | undefined, fallback: number, name: string, min: number, max: number): number {
  const coordinate = value ?? fallback
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--${name} must be a number between ${min} and ${max}.`)
  }
  return coordinate
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const limit = value ?? fallback
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${max}.`)
  }
  return limit
}

function parsePagedResponse<T>(value: unknown, parseEntry: (value: Record<string, unknown>) => T): LuchtmeetnetPaged<T> {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Luchtmeetnet response had an unexpected schema.')
  }
  return {
    pagination: isRecord(value.pagination) ? parsePagination(value.pagination) : undefined,
    data: value.data.filter(isRecord).map(parseEntry),
  }
}

function parsePagination(value: Record<string, unknown>): LuchtmeetnetPagination {
  return {
    lastPage: optionalNumber(value.last_page),
    firstPage: optionalNumber(value.first_page),
    previousPage: optionalNumber(value.prev_page),
    currentPage: optionalNumber(value.current_page),
    nextPage: optionalNumber(value.next_page),
    pageList: Array.isArray(value.page_list) ? value.page_list.filter((entry): entry is number => typeof entry === 'number') : [],
  }
}

function parseComponent(value: Record<string, unknown>): LuchtmeetnetComponent {
  const name = isRecord(value.name) ? value.name : {}
  return {
    formula: requiredString(value.formula, 'component.formula'),
    nameNl: optionalString(name.NL),
    nameEn: optionalString(name.EN),
  }
}

function parseMeasurement(value: Record<string, unknown>): LuchtmeetnetMeasurement {
  return {
    stationNumber: optionalString(value.station_number),
    value: optionalNumber(value.value),
    timestampMeasured: optionalString(value.timestamp_measured),
    formula: optionalString(value.formula),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.reason)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Luchtmeetnet response missing ${field}.`)
  }
  return value
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
