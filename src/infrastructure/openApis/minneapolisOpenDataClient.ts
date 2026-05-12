import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MINNEAPOLIS_OPEN_DATA_DEFAULT_QUERY = 'transportation'
export const MINNEAPOLIS_OPEN_DATA_DEFAULT_LIMIT = 100
export const MINNEAPOLIS_OPEN_DATA_MAX_LIMIT = 100

type FetchImpl = typeof fetch

export type MinneapolisOpenDataDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedMinneapolisOpenDataDatasetsInput = {
  query: string
  limit: number
}

export type MinneapolisOpenDataDataset = {
  id: string
  title: string
  type?: string | undefined
  description?: string | undefined
  owner?: string | undefined
  categories: string[]
  tags: string[]
  modifiedAt?: string | undefined
  url?: string | undefined
  itemId?: string | undefined
}

export type MinneapolisOpenDataRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

type MinneapolisOpenDataSearchResponse = {
  total: number
  datasets: MinneapolisOpenDataDataset[]
  rateLimit: MinneapolisOpenDataRateLimit
}

type MinneapolisOpenDataJsonResponse = {
  parsed: unknown
  rateLimit: MinneapolisOpenDataRateLimit
}

export class MinneapolisOpenDataClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listDatasets(
    input: NormalizedMinneapolisOpenDataDatasetsInput,
  ): Promise<MinneapolisOpenDataSearchResponse> {
    const url = new URL(
      '/api/search/v1/collections/dataset/items',
      'https://opendata.minneapolismn.gov',
    )
    url.searchParams.set('q', input.query)
    url.searchParams.set('limit', String(input.limit))
    const response = await this.fetchJson(url)
    const datasets = parseCatalogDatasets(response.parsed)
    const total = isRecord(response.parsed)
      ? parseNumber(response.parsed.numberMatched)
      : undefined
    return {
      total: total ?? datasets.length,
      datasets,
      rateLimit: response.rateLimit,
    }
  }

  private async fetchJson(url: URL): Promise<MinneapolisOpenDataJsonResponse> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, {
      headers: { accept: 'application/geo+json, application/json' },
    })
    const text = await response.text()
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Open Data Minneapolis is currently returning a Cloudflare',
          'challenge HTML page instead of the documented ArcGIS Hub',
          'GeoJSON API response; retry later or use cached/offline data.',
        ].join(' '),
        {
          provider: 'minneapolisopendata',
          status: response.status,
          endpoint: url.href,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Minneapolis Open Data returned non-JSON content: ${String(error)}`,
        {
          provider: 'minneapolisopendata',
          status: response.status,
          endpoint: url.href,
          contentType: response.headers.get('content-type') ?? undefined,
          preview: text.slice(0, 120),
        },
      )
    }
    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Minneapolis Open Data request failed with HTTP ${response.status}.`,
        {
          provider: 'minneapolisopendata',
          status: response.status,
          endpoint: url.href,
          response: parsed,
        },
      )
    }
    return {
      parsed,
      rateLimit: readRateLimit(response.headers),
    }
  }
}

export function normalizeMinneapolisOpenDataDatasetsInput(
  input: MinneapolisOpenDataDatasetsInput = {},
): NormalizedMinneapolisOpenDataDatasetsInput {
  const query = input.query?.trim() || MINNEAPOLIS_OPEN_DATA_DEFAULT_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--query must be 120 characters or fewer.',
    )
  }
  return {
    query,
    limit: normalizeInteger(
      input.limit,
      '--limit',
      MINNEAPOLIS_OPEN_DATA_DEFAULT_LIMIT,
      1,
      MINNEAPOLIS_OPEN_DATA_MAX_LIMIT,
    ),
  }
}

function parseCatalogDatasets(value: unknown): MinneapolisOpenDataDataset[] {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Minneapolis Open Data catalog response had an unexpected schema.',
    )
  }
  return value.features
    .map(parseDataset)
    .filter((entry): entry is MinneapolisOpenDataDataset => entry !== undefined)
}

function parseDataset(value: unknown): MinneapolisOpenDataDataset | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readString(value.id)
  const properties = isRecord(value.properties) ? value.properties : undefined
  const title =
    readString(properties?.title) ??
    readString(properties?.name) ??
    readString(properties?.snippet)
  if (id === undefined || title === undefined) {
    return undefined
  }
  return {
    id,
    title,
    type: readString(properties?.type),
    description: cleanHtml(
      readString(properties?.snippet) ?? readString(properties?.description),
    ),
    owner: readString(properties?.owner) ?? readString(properties?.accessInformation),
    categories: readStringArray(properties?.categories),
    tags: readStringArray(properties?.tags),
    modifiedAt: parseEpochMillis(properties?.modified),
    url: readString(properties?.url),
    itemId: readString(properties?.itemId) ?? readString(properties?.id),
  }
}

function normalizeInteger(
  value: number | undefined,
  name: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${name} must be an integer between ${min} and ${max}.`,
    )
  }
  return normalized
}

function readRateLimit(headers: Headers): MinneapolisOpenDataRateLimit {
  return {
    limit:
      headers.get('x-ratelimit-limit-portal_search_throttler') ??
      headers.get('x-ratelimit-limit') ??
      undefined,
    remaining:
      headers.get('x-ratelimit-remaining-portal_search_throttler') ??
      headers.get('x-ratelimit-remaining') ??
      undefined,
    reset:
      headers.get('x-ratelimit-reset-portal_search_throttler') ??
      headers.get('x-ratelimit-reset') ??
      undefined,
  }
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      )
      .map(entry => entry.trim())
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()]
  }
  return []
}

function parseEpochMillis(value: unknown): string | undefined {
  const millis = parseNumber(value)
  if (millis === undefined) {
    return undefined
  }
  const date = new Date(millis)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function cleanHtml(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return value.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const cfMitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const bodyLower = body.toLowerCase()
  return (
    cfMitigated === 'challenge' ||
    (server.includes('cloudflare') &&
      contentType.includes('text/html') &&
      (response.status === 403 || response.status === 429) &&
      (bodyLower.includes('<title>just a moment...</title>') ||
        bodyLower.includes('cloudflare')))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
