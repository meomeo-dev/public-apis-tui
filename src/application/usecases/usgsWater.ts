import {
  USGS_WATER_BASE_URL,
  USGS_WATER_DEFAULT_DAILY_PARAMETER_CODES,
  USGS_WATER_DEFAULT_END_DATE,
  USGS_WATER_DEFAULT_LIMIT,
  USGS_WATER_DEFAULT_PARAMETER_CODES,
  USGS_WATER_DEFAULT_SITE,
  USGS_WATER_DEFAULT_START_DATE,
  USGS_WATER_DEFAULT_STATISTIC_CODE,
  USGS_WATER_DOCS_URL,
  USGS_WATER_DV_DOCS_URL,
  USGS_WATER_IV_DOCS_URL,
  USGS_WATER_MAX_LIMIT,
  USGS_WATER_MAX_PARAMETER_CODES,
  USGS_WATER_MIGRATION_URL,
  UsgsWaterClient,
  type UsgsWaterDailyQuery,
  type UsgsWaterInstantaneousQuery,
  type UsgsWaterSeries,
  type UsgsWaterTimeSeriesResponse,
} from '../../infrastructure/openApis/usgsWaterClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const USGS_WATER_MAX_DAILY_DAYS = 31

export type UsgsWaterInstantaneousInput = {
  site?: string | undefined
  parameterCodes?: string | undefined
  period?: string | undefined
  limit?: number | undefined
}

export type UsgsWaterDailyInput = {
  site?: string | undefined
  parameterCodes?: string | undefined
  statisticCode?: string | undefined
  startDate?: string | undefined
  endDate?: string | undefined
  limit?: number | undefined
}

type UsgsWaterEndpoint = 'GET /nwis/iv/' | 'GET /nwis/dv/'

type UsgsWaterApiMeta = {
  provider: 'usgswater'
  endpoint: UsgsWaterEndpoint
  docsUrl: typeof USGS_WATER_DOCS_URL
  endpointDocsUrl: string
  migrationUrl: typeof USGS_WATER_MIGRATION_URL
  apiUrl: typeof USGS_WATER_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS WaterML JSON REST'
  cachePolicy: string
  reliability: string
  boundary: string
  excluded: string[]
}

type UsgsWaterPagination = {
  returnedSeries: number
  returnedValues: number
  limit: number
  maxLimit: number
}

export type UsgsWaterInstantaneousResult = {
  kind: 'usgswater.instantaneous'
  api: UsgsWaterApiMeta
  query: UsgsWaterInstantaneousQuery & { limit: number }
  metadata: Omit<UsgsWaterTimeSeriesResponse, 'series'>
  pagination: UsgsWaterPagination
  series: UsgsWaterSeries[]
}

export type UsgsWaterDailyResult = {
  kind: 'usgswater.daily'
  api: UsgsWaterApiMeta
  query: UsgsWaterDailyQuery & { limit: number }
  metadata: Omit<UsgsWaterTimeSeriesResponse, 'series'>
  pagination: UsgsWaterPagination
  series: UsgsWaterSeries[]
}

export async function getUsgsWaterInstantaneous(
  input: UsgsWaterInstantaneousInput = {},
): Promise<UsgsWaterInstantaneousResult> {
  const query = normalizeUsgsWaterInstantaneousInput(input)
  const response = await new UsgsWaterClient().instantaneous(query)
  const { series, ...metadata } = response
  const limitedSeries = limitSeriesReadings(series, query.limit)
  return {
    kind: 'usgswater.instantaneous',
    api: createApiMeta('GET /nwis/iv/', USGS_WATER_IV_DOCS_URL),
    query,
    metadata,
    pagination: createPagination(limitedSeries, query.limit),
    series: limitedSeries,
  }
}

export async function getUsgsWaterDaily(
  input: UsgsWaterDailyInput = {},
): Promise<UsgsWaterDailyResult> {
  const query = normalizeUsgsWaterDailyInput(input)
  const response = await new UsgsWaterClient().daily(query)
  const { series, ...metadata } = response
  const limitedSeries = limitSeriesReadings(series, query.limit)
  return {
    kind: 'usgswater.daily',
    api: createApiMeta('GET /nwis/dv/', USGS_WATER_DV_DOCS_URL),
    query,
    metadata,
    pagination: createPagination(limitedSeries, query.limit),
    series: limitedSeries,
  }
}

export function normalizeUsgsWaterInstantaneousInput(
  input: UsgsWaterInstantaneousInput = {},
): UsgsWaterInstantaneousQuery & { limit: number } {
  return {
    site: normalizeSite(input.site ?? USGS_WATER_DEFAULT_SITE),
    parameterCodes: normalizeParameterCodes(
      input.parameterCodes,
      [...USGS_WATER_DEFAULT_PARAMETER_CODES],
    ),
    ...(input.period !== undefined ? { period: normalizePeriod(input.period) } : {}),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeUsgsWaterDailyInput(
  input: UsgsWaterDailyInput = {},
): UsgsWaterDailyQuery & { limit: number } {
  const startDate = normalizeDate(
    input.startDate ?? USGS_WATER_DEFAULT_START_DATE,
    'USGS Water --start-date',
  )
  const endDate = normalizeDate(
    input.endDate ?? USGS_WATER_DEFAULT_END_DATE,
    'USGS Water --end-date',
  )
  const days = daysBetween(startDate, endDate)
  if (days < 0 || days > USGS_WATER_MAX_DAILY_DAYS) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'USGS Water --start-date must be before --end-date and within',
        `${USGS_WATER_MAX_DAILY_DAYS} days.`,
      ].join(' '),
      { startDate, endDate },
    )
  }
  return {
    site: normalizeSite(input.site ?? USGS_WATER_DEFAULT_SITE),
    parameterCodes: normalizeParameterCodes(
      input.parameterCodes,
      [...USGS_WATER_DEFAULT_DAILY_PARAMETER_CODES],
    ),
    statisticCode: normalizeStatisticCode(
      input.statisticCode ?? USGS_WATER_DEFAULT_STATISTIC_CODE,
    ),
    startDate,
    endDate,
    limit: normalizeLimit(input.limit),
  }
}

function createApiMeta(
  endpoint: UsgsWaterEndpoint,
  endpointDocsUrl: string,
): UsgsWaterApiMeta {
  return {
    provider: 'usgswater',
    endpoint,
    docsUrl: USGS_WATER_DOCS_URL,
    endpointDocsUrl,
    migrationUrl: USGS_WATER_MIGRATION_URL,
    apiUrl: USGS_WATER_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS WaterML JSON REST',
    cachePolicy: 'Live headers observed public cache-control max-age=900.',
    reliability: [
      'Recent values can be provisional and subject to revision; validate',
      'safety, operations, legal, insurance, or engineering decisions against',
      'official USGS pages and local authorities.',
    ].join(' '),
    boundary: [
      'Read-only WaterML JSON for one site only; no browser test tools, RDB,',
      'KML, XML dumps, water-quality federation proxying, site-service bulk',
      'export, all-sites/state/county/HUC batch queries, upload, delete,',
      'binary payloads, or base64 payloads.',
    ].join(' '),
    excluded: [
      'Browser test tools and Chrome clickstream',
      'RDB, KML, XML, gzip/bulk downloads, and raw WaterML dumps',
      'Site Service and broad state/county/HUC/bbox queries',
      'Water Quality Portal federation and sample-result bulk export',
      'New api.waterdata.usgs.gov migration endpoints until separately reviewed',
    ],
  }
}

function createPagination(
  series: UsgsWaterSeries[],
  limit: number,
): UsgsWaterPagination {
  return {
    returnedSeries: series.length,
    returnedValues: series.reduce(
      (sum, entry) => sum + entry.readings.length,
      0,
    ),
    limit,
    maxLimit: USGS_WATER_MAX_LIMIT,
  }
}

function limitSeriesReadings(
  series: UsgsWaterSeries[],
  limit: number,
): UsgsWaterSeries[] {
  let remaining = limit
  const limited: UsgsWaterSeries[] = []
  for (const entry of series) {
    if (remaining <= 0) break
    const readings = entry.readings.slice(0, remaining)
    if (readings.length > 0) {
      limited.push({ ...entry, readings })
      remaining -= readings.length
    } else if (entry.readings.length === 0) {
      limited.push(entry)
    }
  }
  return limited
}

function normalizeSite(value: string): string {
  const site = value.trim()
  if (!/^\d{8,15}$/u.test(site)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'USGS Water --site must be an 8-15 digit USGS site number.',
      { site: value },
    )
  }
  return site
}

function normalizeParameterCodes(
  value: string | undefined,
  defaultValue: string[],
): string[] {
  const parameterCodes = (value ?? defaultValue.join(','))
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '')
  const unique = [...new Set(parameterCodes)]
  if (
    unique.length < 1 ||
    unique.length > USGS_WATER_MAX_PARAMETER_CODES ||
    unique.some(entry => !/^\d{5}$/u.test(entry))
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'USGS Water --parameter-codes must contain 1 to',
        `${USGS_WATER_MAX_PARAMETER_CODES} five-digit codes.`,
      ].join(' '),
      { parameterCodes: value },
    )
  }
  return unique
}

function normalizeStatisticCode(value: string): string {
  const statisticCode = value.trim()
  if (!/^\d{5}$/u.test(statisticCode)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'USGS Water --statistic-code must be a five-digit statistic code.',
      { statisticCode: value },
    )
  }
  return statisticCode
}

function normalizePeriod(value: string): string {
  const period = value.trim().toUpperCase()
  if (!/^(PT[1-9]\d?H|P[1-7]D)$/u.test(period)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'USGS Water --period must be PT1H-PT99H or P1D-P7D.',
      { period: value },
    )
  }
  return period
}

function normalizeDate(value: string, label: string): string {
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must use YYYY-MM-DD format.`,
      { date: value },
    )
  }
  const parsed = new Date(`${date}T00:00:00.000Z`)
  const year = parsed.getUTCFullYear()
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    year < 1900 ||
    year > 2100
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be a real date from 1900 to 2100.`,
      { date: value },
    )
  }
  return date
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? USGS_WATER_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > USGS_WATER_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `USGS Water --limit must be an integer from 1 to ${USGS_WATER_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime()
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime()
  return Math.round((end - start) / 86_400_000)
}
