import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BC_FERRIES_DEFAULT_BASE_URL = 'https://bcferriesapi.ca/v2'
export const BC_FERRIES_DEFAULT_TYPE = 'capacity'
export const BC_FERRIES_DEFAULT_LIMIT = 50
export const BC_FERRIES_MAX_LIMIT = 100

export type BcFerriesRouteType = 'capacity' | 'noncapacity'

export type BcFerriesRoutesInput = {
  type?: string | undefined
  routeCode?: string | undefined
  limit?: number | undefined
}

export type NormalizedBcFerriesRoutesInput = {
  type: BcFerriesRouteType
  routeCode?: string | undefined
  limit: number
}

export type BcFerriesSailing = {
  time?: string | undefined
  arrivalTime?: string | undefined
  sailingStatus?: string | undefined
  fill?: number | undefined
  carFill?: number | undefined
  oversizeFill?: number | undefined
  vesselName?: string | undefined
  vesselStatus?: string | undefined
}

export type BcFerriesRoute = {
  routeCode: string
  fromTerminalCode: string
  toTerminalCode: string
  sailingDuration?: string | undefined
  sailings: BcFerriesSailing[]
}

export class BcFerriesClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.baseUrl = (options.baseUrl ?? BC_FERRIES_DEFAULT_BASE_URL).replace(/\/$/u, '')
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async routes(input: NormalizedBcFerriesRoutesInput): Promise<BcFerriesRoute[]> {
    const endpoint = `${this.baseUrl}/${input.type}/`
    let response: Response
    try {
      response = await this.fetchImpl(endpoint, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui no-auth CLI' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `BC Ferries request failed: ${String(error)}`, { provider: 'bcferries', endpoint })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `BC Ferries returned a non-JSON response: ${String(error)}`, { provider: 'bcferries', endpoint, status: response.status })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `BC Ferries request failed with HTTP ${response.status}.`, {
        provider: 'bcferries',
        endpoint,
        status: response.status,
      })
    }

    if (!isRecord(parsed) || !Array.isArray(parsed.routes)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'BC Ferries response was missing routes[].')
    }
    const routes = parsed.routes.map(parseRoute)
    const filtered = input.routeCode === undefined ? routes : routes.filter(route => route.routeCode === input.routeCode)
    return filtered.slice(0, input.limit)
  }
}

export function normalizeBcFerriesRoutesInput(input: BcFerriesRoutesInput = {}): NormalizedBcFerriesRoutesInput {
  return {
    type: normalizeRouteType(input.type ?? BC_FERRIES_DEFAULT_TYPE),
    ...(input.routeCode !== undefined ? { routeCode: normalizeRouteCode(input.routeCode) } : {}),
    limit: normalizeInteger(input.limit ?? BC_FERRIES_DEFAULT_LIMIT, '--limit', 1, BC_FERRIES_MAX_LIMIT),
  }
}

function parseRoute(value: unknown): BcFerriesRoute {
  if (!isRecord(value) || typeof value.routeCode !== 'string' || typeof value.fromTerminalCode !== 'string' || typeof value.toTerminalCode !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'BC Ferries route rows must include routeCode/fromTerminalCode/toTerminalCode.')
  }
  return {
    routeCode: value.routeCode,
    fromTerminalCode: value.fromTerminalCode,
    toTerminalCode: value.toTerminalCode,
    sailingDuration: optionalString(value.sailingDuration),
    sailings: Array.isArray(value.sailings) ? value.sailings.filter(isRecord).map(parseSailing).filter(hasSailingContent) : [],
  }
}

function parseSailing(value: Record<string, unknown>): BcFerriesSailing {
  return {
    time: optionalString(value.time),
    arrivalTime: optionalString(value.arrivalTime),
    sailingStatus: optionalString(value.sailingStatus),
    fill: optionalNumber(value.fill),
    carFill: optionalNumber(value.carFill),
    oversizeFill: optionalNumber(value.oversizeFill),
    vesselName: optionalString(value.vesselName),
    vesselStatus: optionalString(value.vesselStatus),
  }
}

function hasSailingContent(value: BcFerriesSailing): boolean {
  return Object.values(value).some(entry => entry !== undefined)
}

function normalizeRouteType(value: string): BcFerriesRouteType {
  const normalized = value.trim().toLowerCase()
  if (normalized !== 'capacity' && normalized !== 'noncapacity') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--type must be capacity or noncapacity.')
  }
  return normalized
}

function normalizeRouteCode(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{6}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--route-code must be a BC Ferries route code such as HSBNAN.')
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

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message ?? value.status
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
