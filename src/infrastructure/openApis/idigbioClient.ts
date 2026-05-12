import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const IDIGBIO_DEFAULT_BASE_URL = 'https://search.idigbio.org/v2'
export const IDIGBIO_DEFAULT_QUERY = 'Quercus robur'
export const IDIGBIO_DEFAULT_LIMIT = 10
export const IDIGBIO_MAX_LIMIT = 50
export const IDIGBIO_MAX_OFFSET = 10_000

export type IdigbioClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type IdigbioSearchQuery = {
  rq?: Record<string, unknown> | undefined
  mq?: Record<string, unknown> | undefined
  limit: number
  offset: number
}

export type IdigbioSearchItem = {
  uuid?: string | undefined
  type?: string | undefined
  etag?: string | undefined
  data: Record<string, unknown>
  indexTerms: Record<string, unknown>
}

export type IdigbioSearchPage = {
  itemCount: number
  lastModified?: string | undefined
  items: IdigbioSearchItem[]
  attribution?: Record<string, unknown> | undefined
}

export class IdigbioClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: IdigbioClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? IDIGBIO_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchRecords(query: IdigbioSearchQuery): Promise<IdigbioSearchPage> {
    const url = this.createSearchUrl('records', query)
    return parseSearchPage(await this.getJson(url), 'records')
  }

  async searchMedia(query: IdigbioSearchQuery): Promise<IdigbioSearchPage> {
    const url = this.createSearchUrl('media', query)
    return parseSearchPage(await this.getJson(url), 'mediarecords')
  }

  private createSearchUrl(type: 'records' | 'media', query: IdigbioSearchQuery): URL {
    const url = new URL(`${this.baseUrl}/search/${type}/`)
    if (query.rq !== undefined) {
      url.searchParams.set('rq', JSON.stringify(query.rq))
    }
    if (query.mq !== undefined) {
      url.searchParams.set('mq', JSON.stringify(query.mq))
    }
    url.searchParams.set('limit', String(query.limit))
    url.searchParams.set('offset', String(query.offset))
    return url
  }

  private async getJson(url: URL): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })
    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'iDigBio is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'iDigBio API returned non-JSON content.',
        createResponseDetails(response, url),
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ?? 'iDigBio request failed.',
        { ...createResponseDetails(response, url), response: parsed },
      )
    }
    return parsed
  }
}

function parseSearchPage(value: unknown, expectedType: string): IdigbioSearchPage {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'iDigBio search response must be an object.',
    )
  }
  const rawItems = Array.isArray(value.items) ? value.items.filter(isRecord) : []
  return {
    itemCount: readNumber(value, 'itemCount'),
    lastModified: readOptionalString(value, 'lastModified'),
    items: rawItems.map(item => parseSearchItem(item, expectedType)),
    attribution: isRecord(value.attribution) ? value.attribution : undefined,
  }
}

function parseSearchItem(
  value: Record<string, unknown>,
  expectedType: string,
): IdigbioSearchItem {
  const type = readOptionalString(value, 'type')
  if (type !== undefined && type !== expectedType) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `iDigBio search item type must be ${expectedType}.`,
      { type },
    )
  }
  return {
    uuid: readOptionalString(value, 'uuid'),
    type,
    etag: readOptionalString(value, 'etag'),
    data: isRecord(value.data) ? value.data : {},
    indexTerms: isRecord(value.indexTerms) ? value.indexTerms : {},
  }
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `iDigBio field ${key} must be a number.`,
    )
  }
  return value
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const nestedError = isRecord(value.error) ? value.error : undefined
  return readOptionalString(value, 'message')
    ?? readOptionalString(value, 'error')
    ?? (nestedError !== undefined ? readErrorMessage(nestedError) : undefined)
    ?? readOptionalString(value, 'detail')
}

function createResponseDetails(response: Response, url: URL): Record<string, unknown> {
  return {
    provider: 'idigbio',
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
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      /<title>\s*just a moment/i.test(body)
    )
  )
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
