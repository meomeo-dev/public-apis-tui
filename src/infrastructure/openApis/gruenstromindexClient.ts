import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GRUENSTROMINDEX_DEFAULT_BASE_URL = 'https://api.corrently.io'
export const GRUENSTROMINDEX_DEFAULT_ZIP = '69168'
export const GRUENSTROMINDEX_DEFAULT_LIMIT = 98
export const GRUENSTROMINDEX_MAX_LIMIT = 98

export type GruenstromIndexForecastInput = {
  zip?: string | undefined
  limit?: number | undefined
}

export type NormalizedGruenstromIndexForecastInput = {
  zip: string
  limit: number
}

export type GruenstromIndexForecastEntry = {
  epochtime?: number | undefined
  eevalue?: number | undefined
  ewind?: number | undefined
  esolar?: number | undefined
  ensolar?: number | undefined
  enwind?: number | undefined
  sci?: number | undefined
  gsi?: number | undefined
  timeStamp?: number | undefined
  energyprice?: number | undefined
  co2Avg?: number | undefined
  co2Standard?: number | undefined
  co2Oekostrom?: number | undefined
  timeframe?: {
    start?: number | undefined
    end?: number | undefined
  } | undefined
  zip?: string | undefined
}

export type GruenstromIndexLocation = {
  zip?: string | undefined
  city?: string | undefined
  state?: string | undefined
  region?: string | undefined
  country?: string | undefined
}

export type GruenstromIndexProvisioning = {
  warning?: string | undefined
  source?: string | undefined
  license?: string | undefined
  tier?: string | undefined
  info?: string | undefined
}

export type GruenstromIndexForecastResponse = {
  support?: string | undefined
  info?: string | undefined
  documentation?: string | undefined
  commercial?: string | undefined
  signee?: string | undefined
  forecast: GruenstromIndexForecastEntry[]
  location?: GruenstromIndexLocation | undefined
  provisioning?: GruenstromIndexProvisioning | undefined
}

export class GruenstromIndexClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getForecast(input: NormalizedGruenstromIndexForecastInput): Promise<GruenstromIndexForecastResponse> {
    const url = new URL('/v2.0/gsi/prediction', this.options.baseUrl ?? GRUENSTROMINDEX_DEFAULT_BASE_URL)
    url.searchParams.set('zip', input.zip)
    const parsed = await this.fetchJson(url)
    const response = parseForecastResponse(parsed)
    return {
      ...response,
      forecast: response.forecast.slice(0, input.limit),
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GrünstromIndex request failed: ${String(error)}`, {
        provider: 'gruenstromindex',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `GrünstromIndex returned a non-JSON response: ${String(error)}`, {
        provider: 'gruenstromindex',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `GrünstromIndex request failed with HTTP ${response.status}.`, {
        provider: 'gruenstromindex',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeGruenstromIndexForecastInput(input: GruenstromIndexForecastInput = {}): NormalizedGruenstromIndexForecastInput {
  const zip = (input.zip ?? GRUENSTROMINDEX_DEFAULT_ZIP).trim()
  if (!/^\d{5}$/u.test(zip)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--zip must be a five-digit German postal code such as 69168.')
  }

  const limit = input.limit ?? GRUENSTROMINDEX_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > GRUENSTROMINDEX_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${GRUENSTROMINDEX_MAX_LIMIT}.`)
  }

  return { zip, limit }
}

function parseForecastResponse(value: unknown): GruenstromIndexForecastResponse {
  if (!isRecord(value) || !Array.isArray(value.forecast)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'GrünstromIndex forecast response had an unexpected schema.')
  }

  return {
    support: optionalString(value.support),
    info: optionalString(value.info),
    documentation: optionalString(value.documentation),
    commercial: optionalString(value.commercial),
    signee: optionalString(value.signee),
    forecast: value.forecast.filter(isRecord).map(parseForecastEntry),
    location: isRecord(value.location) ? parseLocation(value.location) : undefined,
    provisioning: isRecord(value.provisioning) ? parseProvisioning(value.provisioning) : undefined,
  }
}

function parseForecastEntry(value: Record<string, unknown>): GruenstromIndexForecastEntry {
  return {
    epochtime: optionalNumber(value.epochtime),
    eevalue: optionalNumber(value.eevalue),
    ewind: optionalNumber(value.ewind),
    esolar: optionalNumber(value.esolar),
    ensolar: optionalNumber(value.ensolar),
    enwind: optionalNumber(value.enwind),
    sci: optionalNumber(value.sci),
    gsi: optionalNumber(value.gsi),
    timeStamp: optionalNumber(value.timeStamp),
    energyprice: parseOptionalNumber(value.energyprice),
    co2Avg: optionalNumber(value.co2_avg),
    co2Standard: optionalNumber(value.co2_g_standard),
    co2Oekostrom: optionalNumber(value.co2_g_oekostrom),
    timeframe: isRecord(value.timeframe)
      ? { start: optionalNumber(value.timeframe.start), end: optionalNumber(value.timeframe.end) }
      : undefined,
    zip: optionalString(value.zip),
  }
}

function parseLocation(value: Record<string, unknown>): GruenstromIndexLocation {
  return {
    zip: optionalString(value.zip),
    city: optionalString(value.city) ?? optionalString(value.name),
    state: optionalString(value.state),
    region: optionalString(value.region),
    country: optionalString(value.country),
  }
}

function parseProvisioning(value: Record<string, unknown>): GruenstromIndexProvisioning {
  return {
    warning: optionalString(value.warning),
    source: optionalString(value.source),
    license: optionalString(value.license),
    tier: optionalString(value.tier),
    info: optionalString(value.info),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.error)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
