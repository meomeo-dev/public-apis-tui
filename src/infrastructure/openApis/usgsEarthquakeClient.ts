import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const USGS_EARTHQUAKE_BASE_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1'
export const USGS_EARTHQUAKE_DOCS_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/'
export const USGS_EARTHQUAKE_APPLICATION_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/application.json'
export const USGS_EARTHQUAKE_DEFAULT_EVENT_ID =
  'official20110311054624120_30'
export const USGS_EARTHQUAKE_DEFAULT_MIN_MAGNITUDE = 4.5
export const USGS_EARTHQUAKE_DEFAULT_LIMIT = 10
export const USGS_EARTHQUAKE_MAX_LIMIT = 50
export const USGS_EARTHQUAKE_DEFAULT_OFFSET = 1
export const USGS_EARTHQUAKE_DEFAULT_ORDER_BY = 'time'

export const USGS_EARTHQUAKE_ORDER_BY = [
  'time',
  'time-asc',
  'magnitude',
  'magnitude-asc',
] as const

export type UsgsEarthquakeOrderBy = typeof USGS_EARTHQUAKE_ORDER_BY[number]

export type UsgsEarthquakeSearchQuery = {
  minMagnitude: number
  limit: number
  offset: number
  orderBy: UsgsEarthquakeOrderBy
  startTime?: string | undefined
  endTime?: string | undefined
}

export type UsgsEarthquakeEventQuery = {
  eventId: string
}

export type UsgsEarthquakeFeature = {
  id: string
  title: string
  magnitude?: number | undefined
  place?: string | undefined
  time?: string | undefined
  updated?: string | undefined
  eventType?: string | undefined
  status?: string | undefined
  alert?: string | undefined
  tsunami: boolean
  significance?: number | undefined
  felt?: number | undefined
  cdi?: number | undefined
  mmi?: number | undefined
  network?: string | undefined
  code?: string | undefined
  magnitudeType?: string | undefined
  url?: string | undefined
  detailUrl?: string | undefined
  coordinates?: {
    latitude: number
    longitude: number
    depthKm?: number | undefined
  } | undefined
  productTypes: string[]
  sources: string[]
}

export type UsgsEarthquakeCollection = {
  generated?: string | undefined
  title?: string | undefined
  status?: number | undefined
  apiVersion?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  sourceUrl?: string | undefined
  events: UsgsEarthquakeFeature[]
}

export type UsgsEarthquakeClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class UsgsEarthquakeClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: UsgsEarthquakeClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? USGS_EARTHQUAKE_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async search(
    query: UsgsEarthquakeSearchQuery,
  ): Promise<UsgsEarthquakeCollection> {
    const url = this.createUrl('/query')
    url.searchParams.set('format', 'geojson')
    url.searchParams.set('eventtype', 'earthquake')
    url.searchParams.set('minmagnitude', String(query.minMagnitude))
    url.searchParams.set('limit', String(query.limit))
    url.searchParams.set('offset', String(query.offset))
    url.searchParams.set('orderby', query.orderBy)
    if (query.startTime !== undefined) {
      url.searchParams.set('starttime', query.startTime)
    }
    if (query.endTime !== undefined) {
      url.searchParams.set('endtime', query.endTime)
    }
    return parseCollection(await this.fetchJson(url))
  }

  async event(query: UsgsEarthquakeEventQuery): Promise<UsgsEarthquakeFeature> {
    const url = this.createUrl('/query')
    url.searchParams.set('format', 'geojson')
    url.searchParams.set('eventid', query.eventId)
    return parseFeature(await this.fetchJson(url))
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
        `USGS Earthquake API request failed: ${String(error)}`,
        { provider: 'usgsearthquake', url: url.toString() },
      )
    }

    const body = await response.text()
    if (isChallengeResponse(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'USGS Earthquake API is currently returning a challenge HTML page',
          'instead of the documented GeoJSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    const contentType = response.headers.get('content-type') ?? undefined
    if (!contentType?.toLowerCase().includes('json')) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'USGS Earthquake API response was not JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'USGS Earthquake API response could not be parsed as JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ??
          `USGS Earthquake API request failed with HTTP ${response.status}.`,
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
    provider: 'usgsearthquake',
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

function parseCollection(value: unknown): UsgsEarthquakeCollection {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'USGS Earthquake GeoJSON response is missing features.',
      { provider: 'usgsearthquake' },
    )
  }
  const metadata = isRecord(value.metadata) ? value.metadata : {}
  return {
    generated: readEpochMillis(metadata.generated),
    title: readOptionalString(metadata.title),
    status: readOptionalNumber(metadata.status),
    apiVersion: readOptionalString(metadata.api),
    limit: readOptionalNumber(metadata.limit),
    offset: readOptionalNumber(metadata.offset),
    sourceUrl: readOptionalString(metadata.url),
    events: value.features.map(parseFeature),
  }
}

function parseFeature(value: unknown): UsgsEarthquakeFeature {
  if (!isRecord(value) || !isRecord(value.properties)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'USGS Earthquake GeoJSON feature was not an object.',
      { provider: 'usgsearthquake' },
    )
  }
  const properties = value.properties
  return {
    id: requireString(value.id, 'id'),
    title: requireString(properties.title, 'properties.title'),
    magnitude: readOptionalNumber(properties.mag),
    place: readOptionalString(properties.place),
    time: readEpochMillis(properties.time),
    updated: readEpochMillis(properties.updated),
    eventType: readOptionalString(properties.type),
    status: readOptionalString(properties.status),
    alert: readOptionalString(properties.alert),
    tsunami: properties.tsunami === 1,
    significance: readOptionalNumber(properties.sig),
    felt: readOptionalNumber(properties.felt),
    cdi: readOptionalNumber(properties.cdi),
    mmi: readOptionalNumber(properties.mmi),
    network: readOptionalString(properties.net),
    code: readOptionalString(properties.code),
    magnitudeType: readOptionalString(properties.magType),
    url: readOptionalString(properties.url),
    detailUrl: readOptionalString(properties.detail),
    coordinates: parseCoordinates(value.geometry),
    productTypes: parseCsvList(properties.types),
    sources: parseCsvList(properties.sources),
  }
}

function parseCoordinates(value: unknown): UsgsEarthquakeFeature['coordinates'] {
  if (!isRecord(value) || !Array.isArray(value.coordinates)) return undefined
  const [longitude, latitude, depthKm] = value.coordinates
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return undefined
  }
  return {
    latitude,
    longitude,
    ...(typeof depthKm === 'number' && Number.isFinite(depthKm)
      ? { depthKm }
      : {}),
  }
}

function parseCsvList(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return value.split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '')
}

function requireString(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `USGS Earthquake response is missing string field ${key}.`,
    { provider: 'usgsearthquake', key },
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

function readEpochMillis(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value).toISOString()
    : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return readOptionalString(value.error) ??
    readOptionalString(value.message) ??
    readOptionalString(value.title)
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
