import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const VOIDLY_DEFAULT_LIMIT = 20
export const VOIDLY_MAX_LIMIT = 100
export const VOIDLY_DEFAULT_OFFSET = 0
export const VOIDLY_MAX_OFFSET = 1000

type FetchImpl = typeof fetch

export type VoidlyIncidentsInput = {
  country?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type NormalizedVoidlyIncidentsInput = {
  country?: string | undefined
  limit: number
  offset: number
}

export type VoidlyIncident = {
  id: string
  hashId?: string | undefined
  title?: string | undefined
  country?: string | undefined
  countryName?: string | undefined
  flag?: string | undefined
  severity?: string | undefined
  status?: string | undefined
  incidentType?: string | undefined
  confidence?: number | undefined
  anomalyRate?: number | undefined
  measurementCount?: number | undefined
  startTime?: string | undefined
  endTime?: string | undefined
  updatedAt?: string | undefined
  description?: string | undefined
  sources: string[]
  affectedDomains: string[]
  affectedServices: string[]
  reportUrl?: string | undefined
}

export type VoidlyRateLimit = {
  remaining?: string | undefined
  reset?: string | undefined
}

type VoidlyIncidentsResponse = {
  count: number
  total?: number | undefined
  datasetVersion?: string | undefined
  generatedAt?: string | undefined
  incidents: VoidlyIncident[]
  rateLimit: VoidlyRateLimit
}

type VoidlyJsonResponse = {
  parsed: unknown
  rateLimit: VoidlyRateLimit
}

export class VoidlyClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listIncidents(
    input: NormalizedVoidlyIncidentsInput,
  ): Promise<VoidlyIncidentsResponse> {
    const url = new URL('/data/incidents', 'https://api.voidly.ai')
    url.searchParams.set('limit', String(input.limit))
    url.searchParams.set('offset', String(input.offset))
    if (input.country !== undefined) {
      url.searchParams.set('country', input.country)
    }
    const response = await this.fetchJson(url)
    const incidents = parseIncidents(response.parsed)
    const record = isRecord(response.parsed) ? response.parsed : {}
    return {
      count: parseNumber(record.count) ?? incidents.length,
      total: parseNumber(record.total),
      datasetVersion: readString(record.dataset_version),
      generatedAt: readString(record.generated_at_utc),
      incidents,
      rateLimit: response.rateLimit,
    }
  }

  private async fetchJson(url: URL): Promise<VoidlyJsonResponse> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const text = await response.text()
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Voidly is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'voidly',
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
        `Voidly returned non-JSON content: ${String(error)}`,
        {
          provider: 'voidly',
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
        `Voidly request failed with HTTP ${response.status}.`,
        {
          provider: 'voidly',
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

export function normalizeVoidlyIncidentsInput(
  input: VoidlyIncidentsInput = {},
): NormalizedVoidlyIncidentsInput {
  const country = normalizeCountry(input.country)
  return {
    ...(country === undefined ? {} : { country }),
    limit: normalizeInteger(
      input.limit,
      '--limit',
      VOIDLY_DEFAULT_LIMIT,
      1,
      VOIDLY_MAX_LIMIT,
    ),
    offset: normalizeInteger(
      input.offset,
      '--offset',
      VOIDLY_DEFAULT_OFFSET,
      0,
      VOIDLY_MAX_OFFSET,
    ),
  }
}

function parseIncidents(value: unknown): VoidlyIncident[] {
  if (!isRecord(value) || !Array.isArray(value.incidents)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Voidly incidents response had an unexpected schema.',
    )
  }
  return value.incidents
    .map(parseIncident)
    .filter((entry): entry is VoidlyIncident => entry !== undefined)
}

function parseIncident(value: unknown): VoidlyIncident | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id =
    readString(value.id) ?? readString(value.readableId) ?? readString(value.hashId)
  if (id === undefined) {
    return undefined
  }
  return {
    id,
    hashId: readString(value.hashId),
    title: readString(value.title),
    country: readString(value.country),
    countryName: readString(value.countryName),
    flag: readString(value.flag),
    severity: readString(value.severity),
    status: readString(value.status),
    incidentType: readString(value.incidentType),
    confidence: parseNumber(value.confidence),
    anomalyRate: parseNumber(value.anomalyRate),
    measurementCount: parseNumber(value.measurementCount),
    startTime: readString(value.startTime),
    endTime: readString(value.endTime),
    updatedAt: readString(value.updatedAt),
    description: readString(value.description),
    sources: readStringArray(value.sources),
    affectedDomains: readStringArray(value.affectedDomains),
    affectedServices: readStringArray(value.affectedServices),
    reportUrl: readString(value.reportUrl),
  }
}

function normalizeCountry(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--country must be a two-letter ISO country code.',
    )
  }
  return normalized
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

function readRateLimit(headers: Headers): VoidlyRateLimit {
  return {
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
