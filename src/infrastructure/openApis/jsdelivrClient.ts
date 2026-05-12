import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const JSDELIVR_DEFAULT_BASE_URL = 'https://data.jsdelivr.com'
export const JSDELIVR_DEFAULT_PACKAGE = 'jquery'
export const JSDELIVR_DEFAULT_PERIOD = 'month'
export const JSDELIVR_DEFAULT_VERSION_LIMIT = 20
export const JSDELIVR_MAX_VERSION_LIMIT = 100
export const JSDELIVR_DEFAULT_DATE_LIMIT = 14
export const JSDELIVR_MAX_DATE_LIMIT = 366

export type JsdelivrMetadataInput = {
  packageName?: string | undefined
  versionLimit?: number | undefined
}

export type JsdelivrStatsInput = {
  packageName?: string | undefined
  period?: string | undefined
  dateLimit?: number | undefined
}

export type NormalizedJsdelivrMetadataInput = {
  packageName: string
  versionLimit: number
}

export type NormalizedJsdelivrStatsInput = {
  packageName: string
  period: string
  dateLimit: number
}

export type JsdelivrPackageVersion = {
  version: string
  links: Record<string, string>
}

export type JsdelivrMetadataResponse = {
  type?: string | undefined
  name: string
  tags: Record<string, string>
  versions: JsdelivrPackageVersion[]
  links: Record<string, string>
}

export type JsdelivrMetricStats = {
  rank?: number | null | undefined
  typeRank?: number | null | undefined
  total: number
  dates: Record<string, number>
  prev?: {
    rank?: number | null | undefined
    typeRank?: number | null | undefined
    total?: number | undefined
  } | undefined
}

export type JsdelivrStatsResponse = {
  hits: JsdelivrMetricStats
  bandwidth: JsdelivrMetricStats
  links: Record<string, string>
}

export type JsdelivrClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class JsdelivrClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: JsdelivrClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? JSDELIVR_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getNpmMetadata(input: JsdelivrMetadataInput = {}): Promise<JsdelivrMetadataResponse> {
    const normalized = normalizeJsdelivrMetadataInput(input)
    const parsed = await this.getJson(`/v1/packages/npm/${encodeURIComponent(normalized.packageName)}`, {})
    return parseMetadata(parsed)
  }

  async getNpmStats(input: JsdelivrStatsInput = {}): Promise<JsdelivrStatsResponse> {
    const normalized = normalizeJsdelivrStatsInput(input)
    const parsed = await this.getJson(`/v1/stats/packages/npm/${encodeURIComponent(normalized.packageName)}`, {
      period: normalized.period,
    })
    return parseStats(parsed)
  }

  private async getJson(path: string, query: Record<string, string | number>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `jsDelivr request failed: ${String(error)}`, {
        provider: 'jsdelivr',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'jsDelivr returned a non-JSON response.', {
        provider: 'jsdelivr',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'jsDelivr request failed.', {
        provider: 'jsdelivr',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeJsdelivrMetadataInput(input: JsdelivrMetadataInput = {}): NormalizedJsdelivrMetadataInput {
  return {
    packageName: normalizeNpmPackageName(input.packageName),
    versionLimit: normalizeInteger(input.versionLimit, JSDELIVR_DEFAULT_VERSION_LIMIT, JSDELIVR_MAX_VERSION_LIMIT, 'version-limit'),
  }
}

export function normalizeJsdelivrStatsInput(input: JsdelivrStatsInput = {}): NormalizedJsdelivrStatsInput {
  return {
    packageName: normalizeNpmPackageName(input.packageName),
    period: normalizePeriod(input.period),
    dateLimit: normalizeInteger(input.dateLimit, JSDELIVR_DEFAULT_DATE_LIMIT, JSDELIVR_MAX_DATE_LIMIT, 'date-limit'),
  }
}

function parseMetadata(value: unknown): JsdelivrMetadataResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'jsDelivr metadata response must be an object.')
  }
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'jsDelivr metadata response did not include a package name.')
  }

  return {
    ...(typeof value.type === 'string' ? { type: value.type } : {}),
    name: value.name,
    tags: parseStringRecord(value.tags),
    versions: Array.isArray(value.versions) ? value.versions.map(parseVersion) : [],
    links: parseStringRecord(value.links),
  }
}

function parseStats(value: unknown): JsdelivrStatsResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'jsDelivr stats response must be an object.')
  }
  return {
    hits: parseMetricStats(value.hits, 'hits'),
    bandwidth: parseMetricStats(value.bandwidth, 'bandwidth'),
    links: parseStringRecord(value.links),
  }
}

function parseVersion(value: unknown): JsdelivrPackageVersion {
  if (!isRecord(value) || typeof value.version !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'jsDelivr version row must include a version string.')
  }
  return {
    version: value.version,
    links: parseStringRecord(value.links),
  }
}

function parseMetricStats(value: unknown, field: string): JsdelivrMetricStats {
  if (!isRecord(value) || typeof value.total !== 'number' || !isRecord(value.dates)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `jsDelivr ${field} stats must include total and dates.`)
  }

  return {
    ...readNullableNumber(value, 'rank'),
    ...readNullableNumber(value, 'typeRank'),
    total: value.total,
    dates: parseNumberRecord(value.dates),
    ...(isRecord(value.prev) ? { prev: parsePrevStats(value.prev) } : {}),
  }
}

function parsePrevStats(value: Record<string, unknown>): JsdelivrMetricStats['prev'] {
  return {
    ...readNullableNumber(value, 'rank'),
    ...readNullableNumber(value, 'typeRank'),
    ...(typeof value.total === 'number' ? { total: value.total } : {}),
  }
}

function normalizeNpmPackageName(value: string | undefined): string {
  const packageName = (value ?? JSDELIVR_DEFAULT_PACKAGE).trim()
  if (packageName === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'jsDelivr --package cannot be empty.')
  }
  if (packageName.length > 214 || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(packageName)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'jsDelivr --package must be a valid npm package name.', { packageName })
  }
  return packageName
}

function normalizePeriod(value: string | undefined): string {
  const period = (value ?? JSDELIVR_DEFAULT_PERIOD).trim()
  if (/^(?:day|week|month|quarter|year|s-month|s-quarter|s-year|\d{4}(?:-\d{2}|-Q[1-4])?)$/u.test(period)) {
    return period
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'jsDelivr --period must be day, week, month, quarter, year, s-month, s-quarter, s-year, YYYY, YYYY-MM, or YYYY-Qn.', {
    period,
  })
}

function normalizeInteger(value: number | undefined, defaultValue: number, maxValue: number, optionName: string): number {
  if (value === undefined) {
    return defaultValue
  }
  if (!Number.isInteger(value) || value < 1 || value > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `jsDelivr --${optionName} must be an integer between 1 and ${maxValue}.`, { value })
  }
  return value
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

function parseNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'))
}

function readNullableNumber(record: Record<string, unknown>, key: string): Record<string, number | null> {
  const value = record[key]
  return typeof value === 'number' || value === null ? { [key]: value } : {}
}

function readErrorMessage(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message
  }
  if (isRecord(value) && isRecord(value.error) && typeof value.error.message === 'string') {
    return value.error.message
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
