import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WEBSITE_CARBON_DEFAULT_BASE_URL = 'https://api.websitecarbon.com'
export const WEBSITE_CARBON_DEFAULT_BYTES = 1_000_000
export const WEBSITE_CARBON_MAX_BYTES = 100_000_000
export const WEBSITE_CARBON_DEFAULT_GREEN = true

export type WebsiteCarbonDataInput = {
  bytes?: number | undefined
  green?: boolean | undefined
  legacy?: 2 | 3 | undefined
}

export type NormalizedWebsiteCarbonDataInput = {
  bytes: number
  green: boolean
  legacy?: 2 | 3 | undefined
}

export type WebsiteCarbonDataResult = {
  bytes: number
  green: boolean
  gco2e: number
  rating: string
  cleanerThan?: number | undefined
  statistics?: Record<string, unknown> | undefined
}

export class WebsiteCarbonClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async calculateData(input: NormalizedWebsiteCarbonDataInput): Promise<WebsiteCarbonDataResult> {
    const url = new URL('/data', normalizeBaseUrl(this.options.baseUrl ?? WEBSITE_CARBON_DEFAULT_BASE_URL))
    url.searchParams.set('bytes', String(input.bytes))
    url.searchParams.set('green', input.green ? '1' : '0')
    if (input.legacy !== undefined) {
      url.searchParams.set('legacy', String(input.legacy))
    }
    const parsed = await this.fetchJson(url)
    return parseDataResponse(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Website Carbon request failed: ${String(error)}`, {
        provider: 'websitecarbon',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Website Carbon returned a non-JSON response: ${String(error)}`, {
        provider: 'websitecarbon',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? `Website Carbon request failed with HTTP ${response.status}.`, {
        provider: 'websitecarbon',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeWebsiteCarbonDataInput(input: WebsiteCarbonDataInput = {}): NormalizedWebsiteCarbonDataInput {
  return {
    bytes: normalizeBytes(input.bytes),
    green: input.green ?? WEBSITE_CARBON_DEFAULT_GREEN,
    ...(input.legacy !== undefined ? { legacy: normalizeLegacy(input.legacy) } : {}),
  }
}

function normalizeBytes(value: number | undefined): number {
  const bytes = value ?? WEBSITE_CARBON_DEFAULT_BYTES
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > WEBSITE_CARBON_MAX_BYTES) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--bytes must be an integer from 1 to ${WEBSITE_CARBON_MAX_BYTES}.`)
  }
  return bytes
}

function normalizeLegacy(value: number): 2 | 3 {
  if (value !== 2 && value !== 3) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--legacy must be 2 or 3 when provided.')
  }
  return value
}

function parseDataResponse(value: unknown): WebsiteCarbonDataResult {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Website Carbon response had an unexpected schema.')
  }
  if (typeof value.bytes !== 'number' || typeof value.green !== 'boolean' || typeof value.gco2e !== 'number' || typeof value.rating !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Website Carbon response did not include required data fields.')
  }
  return {
    bytes: value.bytes,
    green: value.green,
    gco2e: value.gco2e,
    rating: value.rating,
    ...(typeof value.cleanerThan === 'number' ? { cleanerThan: value.cleanerThan } : {}),
    ...(isRecord(value.statistics) ? { statistics: value.statistics } : {}),
  }
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.error === 'string') {
    return value.error
  }
  if (typeof value.message === 'string') {
    return value.message
  }
  return undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
