import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ENERGI_DATA_SERVICE_DEFAULT_BASE_URL = 'https://api.energidataservice.dk'
export const ENERGI_DEFAULT_LIMIT = 100
export const ENERGI_MAX_LIMIT = 100
export const ENERGI_RIGHT_NOW_DEFAULT_START = 'now-PT15M'
export const ENERGI_ELSPOT_DEFAULT_PRICE_AREA = 'DK1'

export type EnergiRateLimit = {
  totalCalls?: string | undefined
  remainingCalls?: string | undefined
  cacheControl?: string | undefined
  expires?: string | undefined
}

export type EnergiDatasetQuery = {
  dataset: string
  start?: string | undefined
  end?: string | undefined
  filter?: Record<string, string[]> | undefined
  sort?: string | undefined
  limit: number
  offset?: number | undefined
  columns?: string | undefined
}

export type EnergiDatasetResponse<TRecord extends Record<string, unknown>> = {
  total: number
  filters?: string | undefined
  sort?: string | undefined
  limit: number
  dataset: string
  records: TRecord[]
  rateLimit: EnergiRateLimit
}

export type EnergiRightNowInput = {
  start?: string | undefined
  limit?: number | undefined
}

export type EnergiElspotPricesInput = {
  priceArea?: string | undefined
  start?: string | undefined
  end?: string | undefined
  limit?: number | undefined
}

export type NormalizedEnergiRightNowInput = {
  start: string
  limit: number
}

export type NormalizedEnergiElspotPricesInput = {
  priceArea: string
  sort: 'HourUTC desc'
  limit: number
  start?: string | undefined
  end?: string | undefined
}

export class EnergiDataServiceClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async queryDataset<TRecord extends Record<string, unknown>>(query: EnergiDatasetQuery): Promise<EnergiDatasetResponse<TRecord>> {
    const url = new URL(`/dataset/${encodeURIComponent(query.dataset)}`, normalizeBaseUrl(this.options.baseUrl ?? ENERGI_DATA_SERVICE_DEFAULT_BASE_URL))
    if (query.start !== undefined) {
      url.searchParams.set('start', query.start)
    }
    if (query.end !== undefined) {
      url.searchParams.set('end', query.end)
    }
    if (query.filter !== undefined) {
      url.searchParams.set('filter', JSON.stringify(query.filter))
    }
    if (query.sort !== undefined) {
      url.searchParams.set('sort', query.sort)
    }
    if (query.columns !== undefined) {
      url.searchParams.set('columns', query.columns)
    }
    if (query.offset !== undefined) {
      url.searchParams.set('offset', String(query.offset))
    }
    url.searchParams.set('limit', String(query.limit))

    const { parsed, rateLimit } = await this.fetchJson(url)
    return parseDatasetResponse<TRecord>(parsed, rateLimit)
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: EnergiRateLimit }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Energi Data Service request failed: ${String(error)}`, {
        provider: 'energidataservice',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Energi Data Service returned a non-JSON response: ${String(error)}`, {
        provider: 'energidataservice',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? `Energi Data Service request failed with HTTP ${response.status}.`, {
        provider: 'energidataservice',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeEnergiRightNowInput(input: EnergiRightNowInput = {}): NormalizedEnergiRightNowInput {
  return {
    start: normalizeDynamicTime(input.start, ENERGI_RIGHT_NOW_DEFAULT_START, 'start'),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeEnergiElspotPricesInput(input: EnergiElspotPricesInput = {}): NormalizedEnergiElspotPricesInput {
  return {
    priceArea: normalizePriceArea(input.priceArea),
    sort: 'HourUTC desc',
    limit: normalizeLimit(input.limit),
    ...(input.start !== undefined && input.start.trim() !== '' ? { start: normalizeDynamicTime(input.start, undefined, 'start') } : {}),
    ...(input.end !== undefined && input.end.trim() !== '' ? { end: normalizeDynamicTime(input.end, undefined, 'end') } : {}),
  }
}

function parseDatasetResponse<TRecord extends Record<string, unknown>>(value: unknown, rateLimit: EnergiRateLimit): EnergiDatasetResponse<TRecord> {
  if (!isRecord(value) || typeof value.total !== 'number' || typeof value.limit !== 'number' || typeof value.dataset !== 'string' || !Array.isArray(value.records)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Energi Data Service response did not include total, limit, dataset, and records.')
  }
  return {
    total: value.total,
    ...(typeof value.filters === 'string' ? { filters: value.filters } : {}),
    ...(typeof value.sort === 'string' ? { sort: value.sort } : {}),
    limit: value.limit,
    dataset: value.dataset,
    records: value.records.filter(isRecord) as TRecord[],
    rateLimit,
  }
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) {
    return ENERGI_DEFAULT_LIMIT
  }
  if (!Number.isInteger(value) || value < 1 || value > ENERGI_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Energi Data Service --limit must be an integer between 1 and ${ENERGI_MAX_LIMIT}.`, { value })
  }
  return value
}

function normalizePriceArea(value: string | undefined): string {
  const priceArea = (value ?? ENERGI_ELSPOT_DEFAULT_PRICE_AREA).trim().toUpperCase()
  if (!['DK1', 'DK2', 'DE', 'NO2', 'SE3', 'SE4', 'SYSTEM'].includes(priceArea)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Energi Data Service --price-area must be one of DK1, DK2, DE, NO2, SE3, SE4, SYSTEM.', { value })
  }
  return priceArea
}

function normalizeDynamicTime(value: string | undefined, defaultValue: string | undefined, label: string): string {
  const normalized = (value ?? defaultValue ?? '').trim()
  if (normalized.length < 1 || normalized.length > 40 || !/^(?:now|StartOfDay|StartOfMonth|StartOfYear)(?:[-+%][A-Z0-9]+)?$|^\d{4}(?:-\d{2}(?:-\d{2}(?:T\d{2}:\d{2})?)?)?$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Energi Data Service --${label} must be a documented date or dynamic timestamp.`, { value })
  }
  return normalized
}

function readRateLimit(headers: Headers): EnergiRateLimit {
  return {
    totalCalls: headers.get('totalcalls') ?? undefined,
    remainingCalls: headers.get('remainingcalls') ?? undefined,
    cacheControl: headers.get('cache-control') ?? undefined,
    expires: headers.get('expires') ?? undefined,
  }
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return typeof value.message === 'string' ? value.message : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
