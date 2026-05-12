import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const TLE_BASE_URL = 'https://tle.ivanstanojevic.me'
export const TLE_DOCS_URL = 'https://tle.ivanstanojevic.me/#/docs'
export const TLE_DEFAULT_SEARCH = 'ISS'
export const TLE_DEFAULT_PAGE = 1
export const TLE_PAGE_SIZE = 20

export type TleSearchParams = {
  search?: string | undefined
  page: number
}

export type TleRecord = {
  satelliteId: number
  name: string
  date: string
  line1: string
  line2: string
  sourceUrl: string
}

export type TleCollectionView = {
  first?: string | undefined
  previous?: string | undefined
  next?: string | undefined
  last?: string | undefined
}

export type TleSearchResponse = {
  totalItems: number
  members: TleRecord[]
  parameters: Record<string, unknown>
  view: TleCollectionView
}

export type TleClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class TleClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: TleClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? TLE_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async search(params: TleSearchParams): Promise<TleSearchResponse> {
    const url = new URL('/api/tle/', this.baseUrl)
    url.searchParams.set('page', String(params.page))
    if (params.search !== undefined) url.searchParams.set('search', params.search)
    return parseSearchResponse(await this.fetchJson(url))
  }

  async getSatellite(satelliteId: number): Promise<TleRecord> {
    const url = new URL(`/api/tle/${String(satelliteId)}`, this.baseUrl)
    return parseTleRecord(await this.fetchJson(url))
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
        `TLE API request failed: ${String(error)}`,
        { provider: 'tle', url: url.toString() },
      )
    }

    const text = await response.text()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'TLE API is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'TLE API response was not JSON.', {
        ...details,
        preview: text.slice(0, 160),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `TLE API request failed with HTTP ${response.status}.`,
        { ...details, response: parsed },
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
    provider: 'tle',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
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
    )
  )
}

function parseSearchResponse(value: unknown): TleSearchResponse {
  if (!isRecord(value) || !Array.isArray(value.member)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'TLE API search response had an unexpected schema.',
      { provider: 'tle' },
    )
  }
  const totalItems = readNumber(value.totalItems) ?? value.member.length
  const parameters = isRecord(value.parameters) ? value.parameters : {}
  const view = parseView(value.view)
  return {
    totalItems,
    members: value.member.map(parseTleRecord).filter(Boolean),
    parameters,
    view,
  }
}

function parseView(value: unknown): TleCollectionView {
  if (!isRecord(value)) return {}
  return {
    ...readOptionalStringProperty(value, 'first'),
    ...readOptionalStringProperty(value, 'previous'),
    ...readOptionalStringProperty(value, 'next'),
    ...readOptionalStringProperty(value, 'last'),
  }
}

function parseTleRecord(value: unknown): TleRecord {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'TLE record was not an object.', {
      provider: 'tle',
    })
  }
  const satelliteId = readNumber(value.satelliteId)
  const name = readString(value.name)
  const date = readString(value.date)
  const line1 = readString(value.line1)
  const line2 = readString(value.line2)
  const sourceUrl = readString(value['@id'])
  if (
    satelliteId === undefined ||
    name === undefined ||
    date === undefined ||
    line1 === undefined ||
    line2 === undefined
  ) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'TLE record response had an unexpected schema.',
      { provider: 'tle', response: value },
    )
  }
  return {
    satelliteId,
    name,
    date,
    line1,
    line2,
    sourceUrl: sourceUrl ?? `${TLE_BASE_URL}/api/tle/${String(satelliteId)}`,
  }
}

function readOptionalStringProperty(
  value: Record<string, unknown>,
  key: string,
): Record<string, string> {
  const text = readString(value[key])
  return text === undefined ? {} : { [key]: text }
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
