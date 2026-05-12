import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const USGS_WATER_BASE_URL = 'https://waterservices.usgs.gov/nwis'
export const USGS_WATER_DOCS_URL = 'https://waterservices.usgs.gov/'
export const USGS_WATER_IV_DOCS_URL =
  [
    'https://waterservices.usgs.gov/docs/instantaneous-values/',
    'instantaneous-values-details/',
  ].join('')
export const USGS_WATER_DV_DOCS_URL =
  'https://waterservices.usgs.gov/docs/dv-service/daily-values-service-details/'
export const USGS_WATER_MIGRATION_URL = 'https://api.waterdata.usgs.gov'
export const USGS_WATER_DEFAULT_SITE = '01646500'
export const USGS_WATER_DEFAULT_PARAMETER_CODES = ['00060', '00065'] as const
export const USGS_WATER_DEFAULT_DAILY_PARAMETER_CODES = ['00060'] as const
export const USGS_WATER_DEFAULT_STATISTIC_CODE = '00003'
export const USGS_WATER_DEFAULT_START_DATE = '2026-05-01'
export const USGS_WATER_DEFAULT_END_DATE = '2026-05-11'
export const USGS_WATER_DEFAULT_LIMIT = 10
export const USGS_WATER_MAX_LIMIT = 50
export const USGS_WATER_MAX_PARAMETER_CODES = 5

export type UsgsWaterEndpoint = 'iv' | 'dv'

export type UsgsWaterInstantaneousQuery = {
  site: string
  parameterCodes: string[]
  period?: string | undefined
}

export type UsgsWaterDailyQuery = {
  site: string
  parameterCodes: string[]
  statisticCode: string
  startDate: string
  endDate: string
}

export type UsgsWaterReading = {
  dateTime: string
  value: string
  numericValue?: number | undefined
  qualifiers: string[]
}

export type UsgsWaterQualifier = {
  code: string
  description?: string | undefined
}

export type UsgsWaterSeries = {
  id?: string | undefined
  site: {
    code?: string | undefined
    name?: string | undefined
    agencyCode?: string | undefined
    latitude?: number | undefined
    longitude?: number | undefined
    timeZone?: string | undefined
  }
  variable: {
    code?: string | undefined
    name?: string | undefined
    description?: string | undefined
    unit?: string | undefined
    valueType?: string | undefined
    statisticCode?: string | undefined
    statisticName?: string | undefined
  }
  qualifiers: UsgsWaterQualifier[]
  readings: UsgsWaterReading[]
}

export type UsgsWaterTimeSeriesResponse = {
  declaredType?: string | undefined
  generated?: string | undefined
  series: UsgsWaterSeries[]
}

export type UsgsWaterClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class UsgsWaterClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: UsgsWaterClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? USGS_WATER_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async instantaneous(
    query: UsgsWaterInstantaneousQuery,
  ): Promise<UsgsWaterTimeSeriesResponse> {
    const url = this.createUrl('iv/')
    url.searchParams.set('format', 'json')
    url.searchParams.set('sites', query.site)
    url.searchParams.set('parameterCd', query.parameterCodes.join(','))
    url.searchParams.set('siteStatus', 'all')
    if (query.period !== undefined) {
      url.searchParams.set('period', query.period)
    }
    return parseTimeSeriesResponse(await this.fetchJson(url))
  }

  async daily(query: UsgsWaterDailyQuery): Promise<UsgsWaterTimeSeriesResponse> {
    const url = this.createUrl('dv/')
    url.searchParams.set('format', 'json')
    url.searchParams.set('sites', query.site)
    url.searchParams.set('parameterCd', query.parameterCodes.join(','))
    url.searchParams.set('statCd', query.statisticCode)
    url.searchParams.set('startDT', query.startDate)
    url.searchParams.set('endDT', query.endDate)
    url.searchParams.set('siteStatus', 'all')
    return parseTimeSeriesResponse(await this.fetchJson(url))
  }

  private createUrl(path: string): URL {
    return new URL(path.replace(/^\/+/u, ''), this.baseUrl)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `USGS Water Services request failed: ${String(error)}`,
        { provider: 'usgswater', url: url.toString() },
      )
    }

    const body = await response.text()
    if (isChallengeResponse(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'USGS Water Services are currently returning a challenge HTML page',
          'instead of the documented WaterML JSON response; retry later or',
          'use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    const contentType = response.headers.get('content-type') ?? undefined
    if (!contentType?.toLowerCase().includes('json')) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'USGS Water Services response was not JSON.',
        {
          ...details,
          preview: body.slice(0, 200),
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'USGS Water Services response could not be parsed as JSON.',
        {
          ...details,
          preview: body.slice(0, 200),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ??
          `USGS Water Services request failed with HTTP ${response.status}.`,
        {
          ...details,
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'usgswater',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isChallengeResponse(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429)
    && contentType.includes('text/html')
    && (
      mitigated === 'challenge'
      || server.includes('cloudflare')
      || /<title>\s*just a moment/i.test(body)
      || /captcha|access denied|attention required/i.test(body)
    )
  )
}

function parseTimeSeriesResponse(value: unknown): UsgsWaterTimeSeriesResponse {
  if (!isRecord(value) || !isRecord(value.value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'USGS Water Services response is missing WaterML value.',
      { provider: 'usgswater' },
    )
  }
  const timeSeries = Array.isArray(value.value.timeSeries)
    ? value.value.timeSeries
    : []
  return {
    declaredType: readOptionalString(value.declaredType),
    generated: readOptionalString(value.value.queryInfo),
    series: timeSeries.map(parseSeries),
  }
}

function parseSeries(value: unknown): UsgsWaterSeries {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'USGS Water Services timeSeries entry was not an object.',
      { provider: 'usgswater' },
    )
  }
  const sourceInfo = isRecord(value.sourceInfo) ? value.sourceInfo : {}
  const variable = isRecord(value.variable) ? value.variable : {}
  const values = Array.isArray(value.values) ? value.values : []
  const primaryValues = isRecord(values[0]) ? values[0] : {}
  const qualifier = Array.isArray(primaryValues.qualifier)
    ? primaryValues.qualifier
    : []
  const readings = Array.isArray(primaryValues.value)
    ? primaryValues.value
    : []
  return {
    id: readOptionalString(value.name),
    site: parseSite(sourceInfo),
    variable: parseVariable(variable),
    qualifiers: qualifier.map(parseQualifier),
    readings: readings.map(reading => parseReading(reading, variable)),
  }
}

function parseSite(value: Record<string, unknown>): UsgsWaterSeries['site'] {
  const siteCode = readFirstRecord(value.siteCode)
  const location = isRecord(value.geoLocation) &&
    isRecord(value.geoLocation.geogLocation)
    ? value.geoLocation.geogLocation
    : {}
  const timeZoneInfo = isRecord(value.timeZoneInfo)
    ? value.timeZoneInfo
    : {}
  const daylight = isRecord(timeZoneInfo.daylightSavingsTimeZone)
    ? timeZoneInfo.daylightSavingsTimeZone
    : {}
  const standard = isRecord(timeZoneInfo.defaultTimeZone)
    ? timeZoneInfo.defaultTimeZone
    : {}
  return {
    code: readOptionalString(siteCode.value),
    name: readOptionalString(value.siteName),
    agencyCode: readOptionalString(siteCode.agencyCode),
    latitude: readOptionalNumber(location.latitude),
    longitude: readOptionalNumber(location.longitude),
    timeZone: readOptionalString(daylight.zoneAbbreviation) ??
      readOptionalString(standard.zoneAbbreviation),
  }
}

function parseVariable(
  value: Record<string, unknown>,
): UsgsWaterSeries['variable'] {
  const code = readFirstRecord(value.variableCode)
  const option = isRecord(value.options) && Array.isArray(value.options.option)
    ? readFirstRecord(value.options.option)
    : {}
  const unit = isRecord(value.unit) ? value.unit : {}
  return {
    code: readOptionalString(code.value),
    name: cleanText(readOptionalString(value.variableName)),
    description: cleanText(readOptionalString(value.variableDescription)),
    unit: readOptionalString(unit.unitCode),
    valueType: readOptionalString(value.valueType),
    statisticCode: readOptionalString(option.optionCode),
    statisticName: readOptionalString(option.value) ??
      readOptionalString(option.name),
  }
}

function parseQualifier(value: unknown): UsgsWaterQualifier {
  const record = isRecord(value) ? value : {}
  return {
    code: readOptionalString(record.qualifierCode) ?? '-',
    description: readOptionalString(record.qualifierDescription),
  }
}

function parseReading(
  value: unknown,
  variable: Record<string, unknown>,
): UsgsWaterReading {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'USGS Water Services value entry was not an object.',
      { provider: 'usgswater' },
    )
  }
  const rawValue = requireString(value.value, 'value.value')
  const noDataValue = readOptionalNumber(variable.noDataValue)
  const numericValue = Number(rawValue)
  const usableNumber = Number.isFinite(numericValue) &&
    numericValue !== noDataValue
    ? numericValue
    : undefined
  return {
    dateTime: requireString(value.dateTime, 'value.dateTime'),
    value: rawValue,
    ...(usableNumber !== undefined ? { numericValue: usableNumber } : {}),
    qualifiers: Array.isArray(value.qualifiers)
      ? value.qualifiers.map(String)
      : [],
  }
}

function readFirstRecord(value: unknown): Record<string, unknown> {
  return Array.isArray(value) && isRecord(value[0]) ? value[0] : {}
}

function requireString(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `USGS Water Services response is missing string field ${key}.`,
    { provider: 'usgswater', key },
  )
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return readOptionalString(value.error) ??
    readOptionalString(value.message) ??
    readOptionalString(value.title)
}

function cleanText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  return value
    .replace(/&#179;/gu, '3')
    .replace(/&amp;/gu, '&')
    .replace(/<[^>]+>/gu, '')
    .trim()
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
