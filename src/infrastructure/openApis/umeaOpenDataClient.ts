import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const UMEA_OPEN_DATA_DEFAULT_QUERY = 'transport'
export const UMEA_OPEN_DATA_DEFAULT_LIMIT = 100
export const UMEA_OPEN_DATA_MAX_LIMIT = 100
export const UMEA_OPEN_DATA_DEFAULT_OFFSET = 0
export const UMEA_OPEN_DATA_MAX_OFFSET = 9900
export const UMEA_OPEN_DATA_DEFAULT_LANGUAGE = 'en'

type FetchImpl = typeof fetch

export type UmeaOpenDataDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  language?: string | undefined
}

export type NormalizedUmeaOpenDataDatasetsInput = {
  query: string
  limit: number
  offset: number
  language: 'en' | 'sv'
}

export type UmeaOpenDataDataset = {
  id: string
  uid?: string | undefined
  title: string
  description?: string | undefined
  publisher?: string | undefined
  themes: string[]
  keywords: string[]
  license?: string | undefined
  modifiedAt?: string | undefined
  recordsCount?: number | undefined
  hasRecords?: boolean | undefined
  features: string[]
  fields: Array<{ name: string; label?: string | undefined; type?: string | undefined }>
  url: string
}

export type UmeaOpenDataRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

type UmeaOpenDataSearchResponse = {
  total: number
  datasets: UmeaOpenDataDataset[]
  rateLimit: UmeaOpenDataRateLimit
}

type UmeaOpenDataJsonResponse = {
  parsed: unknown
  rateLimit: UmeaOpenDataRateLimit
}

export class UmeaOpenDataClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listDatasets(
    input: NormalizedUmeaOpenDataDatasetsInput,
  ): Promise<UmeaOpenDataSearchResponse> {
    const url = new URL(
      '/api/explore/v2.1/catalog/datasets',
      'https://opendata.umea.se',
    )
    url.searchParams.set('where', `search("${escapeOdsqlString(input.query)}")`)
    url.searchParams.set('limit', String(input.limit))
    url.searchParams.set('offset', String(input.offset))
    url.searchParams.set('lang', input.language)
    const response = await this.fetchJson(url)
    const datasets = parseCatalogDatasets(response.parsed)
    const total = isRecord(response.parsed)
      ? parseNumber(response.parsed.total_count)
      : undefined
    return {
      total: total ?? datasets.length,
      datasets,
      rateLimit: response.rateLimit,
    }
  }

  private async fetchJson(url: URL): Promise<UmeaOpenDataJsonResponse> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Umeå Open Data is currently returning a Cloudflare challenge',
          'HTML page instead of the documented Opendatasoft JSON API',
          'response; retry later or use cached/offline data.',
        ].join(' '),
        {
          provider: 'umeaopendata',
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
        `Umeå Open Data returned non-JSON content: ${String(error)}`,
        {
          provider: 'umeaopendata',
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
        `Umeå Open Data request failed with HTTP ${response.status}.`,
        {
          provider: 'umeaopendata',
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

export function normalizeUmeaOpenDataDatasetsInput(
  input: UmeaOpenDataDatasetsInput = {},
): NormalizedUmeaOpenDataDatasetsInput {
  const query = input.query?.trim() || UMEA_OPEN_DATA_DEFAULT_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--query must be 120 characters or fewer.',
    )
  }
  const language = normalizeLanguage(input.language)
  return {
    query,
    limit: normalizeInteger(
      input.limit,
      '--limit',
      UMEA_OPEN_DATA_DEFAULT_LIMIT,
      1,
      UMEA_OPEN_DATA_MAX_LIMIT,
    ),
    offset: normalizeInteger(
      input.offset,
      '--offset',
      UMEA_OPEN_DATA_DEFAULT_OFFSET,
      0,
      UMEA_OPEN_DATA_MAX_OFFSET,
    ),
    language,
  }
}

function parseCatalogDatasets(value: unknown): UmeaOpenDataDataset[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Umeå Open Data catalog response had an unexpected schema.',
    )
  }
  return value.results
    .map(parseDataset)
    .filter((entry): entry is UmeaOpenDataDataset => entry !== undefined)
}

function parseDataset(value: unknown): UmeaOpenDataDataset | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readString(value.dataset_id)
  const metas = isRecord(value.metas) ? value.metas : undefined
  const defaultMetas = isRecord(metas?.default) ? metas.default : undefined
  const dcatMetas = isRecord(metas?.dcat) ? metas.dcat : undefined
  const title =
    readString(defaultMetas?.title) ?? readString(defaultMetas?.title_en) ?? id
  if (id === undefined || title === undefined) {
    return undefined
  }
  return {
    id,
    uid: readString(value.dataset_uid),
    title,
    description: cleanHtml(
      readString(defaultMetas?.description) ??
        readString(defaultMetas?.description_en),
    ),
    publisher: readString(dcatMetas?.creator) ?? readString(defaultMetas?.publisher),
    themes: readStringArray(defaultMetas?.theme),
    keywords: readStringArray(defaultMetas?.keyword),
    license: readString(defaultMetas?.license),
    modifiedAt: readString(defaultMetas?.modified),
    recordsCount: parseNumber(defaultMetas?.records_count),
    hasRecords: typeof value.has_records === 'boolean' ? value.has_records : undefined,
    features: readStringArray(value.features),
    fields: parseFields(value.fields),
    url: `https://opendata.umea.se/explore/dataset/${encodeURIComponent(id)}/`,
  }
}

type UmeaOpenDataField = {
  name: string
  label?: string | undefined
  type?: string | undefined
}

function parseFields(value: unknown): UmeaOpenDataField[] {
  if (!Array.isArray(value)) {
    return []
  }
  const fields: UmeaOpenDataField[] = []
  for (const field of value) {
    if (!isRecord(field)) {
      continue
    }
    const name = readString(field.name)
    if (name === undefined) {
      continue
    }
    const parsed: UmeaOpenDataField = { name }
    const label = readString(field.label)
    if (label !== undefined) {
      parsed.label = label
    }
    const type = readString(field.type)
    if (type !== undefined) {
      parsed.type = type
    }
    fields.push(parsed)
  }
  return fields
}

function normalizeLanguage(value: string | undefined): 'en' | 'sv' {
  const language = value?.trim().toLowerCase() || UMEA_OPEN_DATA_DEFAULT_LANGUAGE
  if (language !== 'en' && language !== 'sv') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--language must be one of: en, sv.')
  }
  return language
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

function escapeOdsqlString(value: string): string {
  return value.replace(/["\\]/gu, '\\$&')
}

function readRateLimit(headers: Headers): UmeaOpenDataRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
    reset: headers.get('x-ratelimit-reset') ?? undefined,
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
