import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const DUCKS_UNLIMITED_BASE_URL = 'https://services2.arcgis.com/5I7u4SJE1vUr79JC/arcgis/rest/services/UniversityChapters_Public/FeatureServer/0'
export const DUCKS_UNLIMITED_DEFAULT_LIMIT = 25
export const DUCKS_UNLIMITED_MAX_LIMIT = 100

export type DucksUnlimitedChaptersInput = {
  state?: string | undefined
  query?: string | undefined
  limit?: number | undefined
  includeGeometry?: boolean | undefined
}

export type NormalizedDucksUnlimitedChaptersInput = {
  state?: string | undefined
  query?: string | undefined
  limit: number
  includeGeometry: boolean
}

export type DucksUnlimitedChapter = {
  objectId: number
  universityChapter?: string | undefined
  city?: string | undefined
  state?: string | undefined
  chapterId?: string | undefined
  regionalDirector?: string | undefined
  longitude?: number | undefined
  latitude?: number | undefined
}

export type DucksUnlimitedQueryResponse = {
  objectIdFieldName?: string | undefined
  geometryType?: string | undefined
  exceededTransferLimit?: boolean | undefined
  features: Array<{
    attributes?: Record<string, unknown> | undefined
    geometry?: { x?: number | undefined; y?: number | undefined } | undefined
  }>
}

export class DucksUnlimitedClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listChapters(input: NormalizedDucksUnlimitedChaptersInput): Promise<{ chapters: DucksUnlimitedChapter[]; exceededTransferLimit: boolean }> {
    const url = new URL(`${this.options.baseUrl ?? DUCKS_UNLIMITED_BASE_URL}/query`)
    url.searchParams.set('f', 'json')
    url.searchParams.set('where', buildWhereClause(input))
    url.searchParams.set('outFields', 'OBJECTID,University_Chapter,City,State,ChapterID,MEVR_RD')
    url.searchParams.set('returnGeometry', String(input.includeGeometry))
    url.searchParams.set('resultRecordCount', String(input.limit))
    url.searchParams.set('orderByFields', 'University_Chapter ASC')

    const parsed = await this.fetchJson(url)
    const response = parseQueryResponse(parsed)
    return {
      chapters: response.features.map(parseChapter).filter((chapter): chapter is DucksUnlimitedChapter => chapter !== undefined),
      exceededTransferLimit: response.exceededTransferLimit === true,
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Ducks Unlimited request failed: ${String(error)}`, {
        provider: 'ducksunlimited',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Ducks Unlimited response body could not be read: ${String(error)}`, {
        provider: 'ducksunlimited',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Ducks Unlimited is currently returning a Cloudflare challenge HTML page instead of the documented ArcGIS JSON response; retry later or use cached/offline data.', {
        provider: 'ducksunlimited',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Ducks Unlimited returned a non-JSON response: ${String(error)}`, {
        provider: 'ducksunlimited',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok || isArcGisError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readArcGisError(parsed) ?? `Ducks Unlimited request failed with HTTP ${response.status}.`, {
        provider: 'ducksunlimited',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeDucksUnlimitedChaptersInput(input: DucksUnlimitedChaptersInput = {}): NormalizedDucksUnlimitedChaptersInput {
  const state = normalizeState(input.state)
  const query = normalizeQuery(input.query)
  return {
    ...(state !== undefined ? { state } : {}),
    ...(query !== undefined ? { query } : {}),
    limit: normalizeLimit(input.limit),
    includeGeometry: input.includeGeometry === true,
  }
}

function buildWhereClause(input: NormalizedDucksUnlimitedChaptersInput): string {
  const clauses = ['1=1']
  if (input.state !== undefined) {
    clauses.push(`State='${escapeSqlLiteral(input.state)}'`)
  }
  if (input.query !== undefined) {
    const escaped = escapeSqlLikeLiteral(input.query.toUpperCase())
    clauses.push(`(UPPER(University_Chapter) LIKE '%${escaped}%' OR UPPER(City) LIKE '%${escaped}%' OR UPPER(ChapterID) LIKE '%${escaped}%')`)
  }
  return clauses.join(' AND ')
}

function parseQueryResponse(value: unknown): DucksUnlimitedQueryResponse {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Ducks Unlimited query response had an unexpected schema.', { response: value })
  }
  return {
    objectIdFieldName: optionalString(value.objectIdFieldName),
    geometryType: optionalString(value.geometryType),
    exceededTransferLimit: typeof value.exceededTransferLimit === 'boolean' ? value.exceededTransferLimit : undefined,
    features: value.features.filter(isRecord).map(feature => ({
      attributes: isRecord(feature.attributes) ? feature.attributes : undefined,
      geometry: parseGeometry(feature.geometry),
    })),
  }
}

function parseChapter(feature: DucksUnlimitedQueryResponse['features'][number]): DucksUnlimitedChapter | undefined {
  const attributes = feature.attributes
  if (attributes === undefined) return undefined
  const objectId = optionalNumber(attributes.OBJECTID)
  if (objectId === undefined) return undefined
  return {
    objectId,
    universityChapter: optionalString(attributes.University_Chapter),
    city: optionalString(attributes.City),
    state: optionalString(attributes.State),
    chapterId: optionalString(attributes.ChapterID),
    regionalDirector: optionalString(attributes.MEVR_RD),
    longitude: feature.geometry?.x,
    latitude: feature.geometry?.y,
  }
}

function normalizeState(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const state = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(state)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--state must be a two-letter US state code such as TX or GA.')
  }
  return state
}

function normalizeQuery(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const query = value.trim()
  if (query.length === 0) return undefined
  if (query.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 80 characters or fewer.')
  }
  if (!/^[\p{L}\p{N} .,'&-]+$/u.test(query)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query may contain letters, numbers, spaces, apostrophes, ampersands, periods, commas, and hyphens only.')
  }
  return query
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) return DUCKS_UNLIMITED_DEFAULT_LIMIT
  if (!Number.isInteger(value) || value < 1 || value > DUCKS_UNLIMITED_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${DUCKS_UNLIMITED_MAX_LIMIT}.`)
  }
  return value
}

function parseGeometry(value: unknown): DucksUnlimitedQueryResponse['features'][number]['geometry'] {
  if (!isRecord(value)) return undefined
  return {
    x: optionalNumber(value.x),
    y: optionalNumber(value.y),
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''")
}

function escapeSqlLikeLiteral(value: string): string {
  return escapeSqlLiteral(value).replaceAll('%', '').replaceAll('_', '')
}

function isArcGisError(value: unknown): boolean {
  return isRecord(value) && isRecord(value.error)
}

function readArcGisError(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.error)) return undefined
  const message = optionalString(value.error.message)
  const details = Array.isArray(value.error.details) ? value.error.details.filter((entry): entry is string => typeof entry === 'string') : []
  return [message, ...details].filter((entry): entry is string => typeof entry === 'string' && entry.length > 0).join(' ')
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
