import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LA_METRO_DEFAULT_BASE_URL = 'https://api.metro.net'
export const LA_METRO_DEFAULT_AGENCY = 'LACMTA'
export const LA_METRO_DEFAULT_ROUTE_CODE = '720'
export const LA_METRO_DEFAULT_DAY_TYPE = 'all'
export const LA_METRO_ROUTES_DEFAULT_LIMIT = 100
export const LA_METRO_STOPS_DEFAULT_LIMIT = 50
export const LA_METRO_MAX_LIMIT = 500

export type LaMetroAgency = 'LACMTA' | 'LACMTA_Rail'
export type LaMetroDayType = 'all' | 'weekday' | 'saturday' | 'sunday'

export type LaMetroRoutesInput = {
  agency?: string | undefined
  query?: string | undefined
  routeType?: string | undefined
  active?: boolean | undefined
  limit?: number | undefined
}

export type NormalizedLaMetroRoutesInput = {
  agency: LaMetroAgency
  limit: number
  query?: string | undefined
  routeType?: string | undefined
  active?: boolean | undefined
}

export type LaMetroStopsInput = {
  agency?: string | undefined
  routeCode?: string | undefined
  dayType?: string | undefined
  directionId?: number | undefined
  limit?: number | undefined
}

export type NormalizedLaMetroStopsInput = {
  agency: LaMetroAgency
  routeCode: string
  dayType: LaMetroDayType
  limit: number
  directionId?: number | undefined
}

export type LaMetroRouteOverview = {
  routeId?: string | undefined
  routeCode: string
  routeShortName?: string | undefined
  routeLongName?: string | undefined
  routeDesc?: string | undefined
  routeType?: string | undefined
  routeColor?: string | undefined
  agencyId?: string | undefined
  terminal1?: string | undefined
  terminal2?: string | undefined
  arterials?: string | undefined
  description?: string | undefined
  travelDirection0?: string | undefined
  travelDirection1?: string | undefined
  isActive?: boolean | undefined
  pdfFileUrl?: string | undefined
}

export type LaMetroRouteStop = {
  routeId?: string | undefined
  routeCode: string
  dayType?: string | undefined
  stopId: number
  stopSequence: number
  directionId: number
  stopName: string
  latitude?: number | undefined
  longitude?: number | undefined
  departureTimes: string[]
  agencyId?: string | undefined
}

export class LaMetroClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async routeOverview(input: NormalizedLaMetroRoutesInput): Promise<LaMetroRouteOverview[]> {
    const parsed = await this.fetchJson(this.createUrl(`/${input.agency}/route_overview`))
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'LA Metro route overview response must be an array.')
    }
    const routes = parsed.map(parseRouteOverview).filter(route => matchesRouteFilters(route, input))
    return routes.slice(0, input.limit)
  }

  async routeStops(input: NormalizedLaMetroStopsInput): Promise<LaMetroRouteStop[]> {
    const url = this.createUrl(`/${input.agency}/route_stops/${encodeURIComponent(input.routeCode)}`)
    url.searchParams.set('daytype', input.dayType)
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'LA Metro route stops response must be an array.')
    }
    const stops = parsed.map(parseRouteStop).filter(stop => input.directionId === undefined || stop.directionId === input.directionId)
    return stops.slice(0, input.limit)
  }

  private createUrl(path: string): URL {
    return new URL(path.replace(/^\/+/, ''), normalizeBaseUrl(this.options.baseUrl ?? LA_METRO_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `LA Metro request failed: ${String(error)}`, { provider: 'lametro', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `LA Metro returned a non-JSON response: ${String(error)}`, { provider: 'lametro', status: response.status, endpoint: url.href })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `LA Metro request failed with HTTP ${response.status}.`, {
        provider: 'lametro',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeLaMetroRoutesInput(input: LaMetroRoutesInput = {}): NormalizedLaMetroRoutesInput {
  return {
    agency: normalizeAgency(input.agency ?? LA_METRO_DEFAULT_AGENCY),
    limit: normalizeInteger(input.limit ?? LA_METRO_ROUTES_DEFAULT_LIMIT, '--limit', 1, LA_METRO_MAX_LIMIT),
    ...(input.query !== undefined ? { query: normalizeText(input.query, '--query') } : {}),
    ...(input.routeType !== undefined ? { routeType: normalizeText(input.routeType, '--route-type').toLowerCase() } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  }
}

export function normalizeLaMetroStopsInput(input: LaMetroStopsInput = {}): NormalizedLaMetroStopsInput {
  return {
    agency: normalizeAgency(input.agency ?? LA_METRO_DEFAULT_AGENCY),
    routeCode: normalizeRouteCode(input.routeCode ?? LA_METRO_DEFAULT_ROUTE_CODE),
    dayType: normalizeDayType(input.dayType ?? LA_METRO_DEFAULT_DAY_TYPE),
    limit: normalizeInteger(input.limit ?? LA_METRO_STOPS_DEFAULT_LIMIT, '--limit', 1, LA_METRO_MAX_LIMIT),
    ...(input.directionId !== undefined ? { directionId: normalizeInteger(input.directionId, '--direction-id', 0, 1) } : {}),
  }
}

function parseRouteOverview(value: unknown): LaMetroRouteOverview {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'LA Metro route overview rows must be objects.')
  }
  const routeCode = value.route_code
  if (typeof routeCode !== 'string' && typeof routeCode !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'LA Metro route overview rows must include route_code.')
  }
  return {
    routeId: optionalString(value.route_id),
    routeCode: String(routeCode),
    routeShortName: optionalString(value.route_short_name),
    routeLongName: optionalString(value.route_long_name),
    routeDesc: optionalString(value.route_desc),
    routeType: optionalString(value.route_type),
    routeColor: optionalString(value.route_color),
    agencyId: optionalString(value.agency_id),
    terminal1: optionalString(value.terminal_1),
    terminal2: optionalString(value.terminal_2),
    arterials: optionalString(value.arterials),
    description: optionalString(value.description),
    travelDirection0: optionalString(value.travel_direction_0),
    travelDirection1: optionalString(value.travel_direction_1),
    isActive: typeof value.is_active === 'boolean' ? value.is_active : undefined,
    pdfFileUrl: optionalString(value.pdf_file_url),
  }
}

function parseRouteStop(value: unknown): LaMetroRouteStop {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'LA Metro route stop rows must be objects.')
  }
  const routeCode = value.route_code
  if ((typeof routeCode !== 'string' && typeof routeCode !== 'number') || typeof value.stop_id !== 'number' || typeof value.stop_sequence !== 'number' || typeof value.direction_id !== 'number' || typeof value.stop_name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'LA Metro route stop rows must include route_code/stop_id/stop_sequence/direction_id/stop_name.')
  }
  const coordinates = readCoordinates(value.geometry)
  return {
    routeId: optionalString(value.route_id),
    routeCode: String(routeCode),
    dayType: optionalString(value.day_type),
    stopId: value.stop_id,
    stopSequence: value.stop_sequence,
    directionId: value.direction_id,
    stopName: value.stop_name,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    departureTimes: parseDepartureTimes(value.departure_times),
    agencyId: optionalString(value.agency_id),
  }
}

function matchesRouteFilters(route: LaMetroRouteOverview, input: NormalizedLaMetroRoutesInput): boolean {
  if (input.active !== undefined && route.isActive !== input.active) return false
  if (input.routeType !== undefined && route.routeType?.toLowerCase() !== input.routeType) return false
  if (input.query === undefined) return true
  const query = input.query.toLowerCase()
  return [route.routeCode, route.routeShortName, route.routeLongName, route.routeDesc, route.terminal1, route.terminal2, route.description, route.arterials]
    .filter((entry): entry is string => typeof entry === 'string')
    .some(entry => entry.toLowerCase().includes(query))
}

function readCoordinates(value: unknown): { latitude: number; longitude: number } | undefined {
  if (!isRecord(value) || !Array.isArray(value.coordinates)) return undefined
  const [longitude, latitude] = value.coordinates
  return typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : undefined
}

function parseDepartureTimes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
  if (typeof value !== 'string') return []
  return [...value.matchAll(/\d{2}:\d{2}:\d{2}/gu)].map(match => match[0])
}

function normalizeAgency(value: string): LaMetroAgency {
  const normalized = value.trim()
  if (normalized !== 'LACMTA' && normalized !== 'LACMTA_Rail') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--agency must be LACMTA or LACMTA_Rail.')
  }
  return normalized
}

function normalizeDayType(value: string): LaMetroDayType {
  const normalized = value.trim().toLowerCase()
  if (normalized !== 'all' && normalized !== 'weekday' && normalized !== 'saturday' && normalized !== 'sunday') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--day-type must be all, weekday, saturday, or sunday.')
  }
  return normalized
}

function normalizeRouteCode(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z0-9]{1,6}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--route-code must be 1 to 6 alphanumeric route characters such as 720.')
  }
  return normalized
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  }
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const detail = value.detail
  if (typeof detail === 'string') return detail
  const error = value.error ?? value.message
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
