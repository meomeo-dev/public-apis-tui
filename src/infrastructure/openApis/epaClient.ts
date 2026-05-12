import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const EPA_DEFAULT_ZIP = '20050'
export const EPA_DEFAULT_HOURLY_LIMIT = 21
export const EPA_MAX_HOURLY_LIMIT = 21

type FetchImpl = typeof fetch

export type EpaUvHourlyInput = {
  zip?: string | undefined
  limit?: number | undefined
}

export type NormalizedEpaUvHourlyInput = {
  zip: string
  limit: number
}

export type EpaUvDailyInput = {
  zip?: string | undefined
}

export type NormalizedEpaUvDailyInput = {
  zip: string
}

export type EpaUvHourlyForecast = {
  order: number
  zip: string
  city?: string | undefined
  state?: string | undefined
  dateTime?: string | undefined
  uvValue: number
}

export type EpaUvDailyForecast = {
  zip: string
  city?: string | undefined
  state?: string | undefined
  date?: string | undefined
  uvIndex: number
  uvAlert: boolean
}

export class EpaClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined } = {}) {}

  async getUvHourly(input: NormalizedEpaUvHourlyInput): Promise<EpaUvHourlyForecast[]> {
    const url = new URL(`/dmapservice/getEnvirofactsUVHOURLY/ZIP/${input.zip}/JSON`, 'https://data.epa.gov')
    const parsed = await this.fetchJson(url)
    return parseHourlyForecasts(parsed).slice(0, input.limit)
  }

  async getUvDaily(input: NormalizedEpaUvDailyInput): Promise<EpaUvDailyForecast[]> {
    const url = new URL(`/dmapservice/getEnvirofactsUVDAILY/ZIP/${input.zip}/JSON`, 'https://data.epa.gov')
    const parsed = await this.fetchJson(url)
    return parseDailyForecasts(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'EPA DMAP-EF returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      if (response.status === 404 && isMissingLocationResponse(parsed)) {
        return []
      }
      throw new RuntimeFailure('OPEN_API_FAILED', `EPA DMAP-EF request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    if (isRecord(parsed) && typeof parsed.error === 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', `EPA DMAP-EF returned an error: ${parsed.error}`, {
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeEpaUvHourlyInput(input: EpaUvHourlyInput = {}): NormalizedEpaUvHourlyInput {
  return {
    zip: normalizeZip(input.zip),
    limit: normalizeInteger(input.limit, '--limit', EPA_DEFAULT_HOURLY_LIMIT, 1, EPA_MAX_HOURLY_LIMIT),
  }
}

export function normalizeEpaUvDailyInput(input: EpaUvDailyInput = {}): NormalizedEpaUvDailyInput {
  return {
    zip: normalizeZip(input.zip),
  }
}

function parseHourlyForecasts(value: unknown): EpaUvHourlyForecast[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'EPA hourly UV response had an unexpected schema.')
  }
  return value.map(parseHourlyForecast).filter((entry): entry is EpaUvHourlyForecast => entry !== undefined)
}

function parseHourlyForecast(value: unknown): EpaUvHourlyForecast | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const order = readNumber(value.ORDER)
  const zip = readString(value.ZIP)
  const uvValue = readNumber(value.UV_VALUE)
  if (order === undefined || zip === undefined || uvValue === undefined) {
    return undefined
  }
  return {
    order,
    zip,
    city: readString(value.CITY),
    state: readString(value.STATE),
    dateTime: readString(value.DATE_TIME),
    uvValue,
  }
}

function parseDailyForecasts(value: unknown): EpaUvDailyForecast[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'EPA daily UV response had an unexpected schema.')
  }
  return value.map(parseDailyForecast).filter((entry): entry is EpaUvDailyForecast => entry !== undefined)
}

function parseDailyForecast(value: unknown): EpaUvDailyForecast | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const zip = readString(value.ZIP_CODE)
  const uvIndex = readNumber(value.UV_INDEX)
  if (zip === undefined || uvIndex === undefined) {
    return undefined
  }
  return {
    zip,
    city: readString(value.CITY),
    state: readString(value.STATE),
    date: readString(value.DATE),
    uvIndex,
    uvAlert: readUvAlert(value.UV_ALERT),
  }
}

function normalizeZip(value: string | undefined): string {
  const normalized = value?.trim() || EPA_DEFAULT_ZIP
  if (!/^\d{5}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--zip must be a 5-digit US ZIP Code.')
  }
  return normalized
}

function normalizeInteger(value: number | undefined, name: string, defaultValue: number, min: number, max: number): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${name} must be an integer from ${min} to ${max}.`)
  }
  return normalized
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function readUvAlert(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  return typeof value === 'string' && value.trim() !== '' && value.trim() !== '0'
}

function isMissingLocationResponse(value: unknown): boolean {
  return isRecord(value) && typeof value.error === 'string' && /could not be located in the system/iu.test(value.error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
