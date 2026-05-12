import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SHARE_DEFAULT_BASE_URL = 'https://share.osf.io/api/v2'

export type ShareClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type ShareSearchRequest = {
  query: string
  type?: string | undefined
  source?: string | undefined
  limit: number
  offset: number
  sort: 'relevance' | 'date'
}

export type ShareSearchPage = {
  took?: number | undefined
  timedOut: boolean
  total?: number | undefined
  hits: ShareSearchHit[]
}

export type ShareSearchHit = {
  id: string
  score?: number | undefined
  source: Record<string, unknown>
}

export type ShareSourcesPage = {
  sources: ShareSourceResource[]
  links: Record<string, unknown>
}

export type ShareSourceResource = {
  id: string
  type: string
  attributes: Record<string, unknown>
  links: Record<string, unknown>
  relationships: Record<string, unknown>
}

export class ShareClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ShareClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? SHARE_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchCreativeWorks(query: ShareSearchRequest): Promise<ShareSearchPage> {
    const url = new URL('/api/v2/search/creativeworks/_search', this.baseUrl)
    const body = buildSearchBody(query)
    const parsed = await this.requestJson(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': [
          'public-apis-tui no-auth CLI',
          '(https://github.com/public-apis/public-apis)',
        ].join(' '),
      },
      body: JSON.stringify(body),
    })
    return parseSearchPage(parsed)
  }

  async listSources(): Promise<ShareSourcesPage> {
    const url = new URL('/api/v2/sources/', this.baseUrl)
    const parsed = await this.requestJson(url, {
      method: 'GET',
      headers: {
        accept: 'application/vnd.api+json, application/json',
        'user-agent': [
          'public-apis-tui no-auth CLI',
          '(https://github.com/public-apis/public-apis)',
        ].join(' '),
      },
    })
    return parseSourcesPage(parsed)
  }

  private async requestJson(url: URL, init: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, init)
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `SHARE request failed: ${String(error)}`,
        { provider: 'share', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'SHARE is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'SHARE response was not JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed)
          ?? `SHARE request failed with HTTP ${response.status}.`,
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
    provider: 'share',
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

function buildSearchBody(query: ShareSearchRequest): Record<string, unknown> {
  const filters: Record<string, unknown>[] = []
  if (query.type !== undefined) {
    filters.push({ term: { type: query.type } })
  }
  if (query.source !== undefined) {
    filters.push({ term: { sources: query.source } })
  }

  const boolQuery: Record<string, unknown> = {
    must: [
      {
        simple_query_string: {
          query: query.query,
          fields: [
            'title^3',
            'description',
            'tags',
            'subjects',
            'contributors',
            'sources',
            'publishers',
          ],
          default_operator: 'and',
        },
      },
    ],
  }
  if (filters.length > 0) {
    boolQuery.filter = filters
  }

  const body: Record<string, unknown> = {
    query: { bool: boolQuery },
    size: query.limit,
    from: query.offset,
  }
  if (query.sort === 'date') {
    body.sort = [
      { date: { order: 'desc', missing: '_last' } },
      '_score',
    ]
  }
  return body
}

function parseSearchPage(value: unknown): ShareSearchPage {
  if (!isRecord(value) || !isRecord(value.hits)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SHARE search response did not match the expected Elasticsearch shape.',
      { provider: 'share' },
    )
  }

  const hits = Array.isArray(value.hits.hits)
    ? value.hits.hits.filter(isRecord).map(parseSearchHit)
    : []
  return {
    took: readOptionalNumber(value, 'took'),
    timedOut: value.timed_out === true,
    total: readTotal(value.hits.total),
    hits,
  }
}

function parseSearchHit(value: Record<string, unknown>): ShareSearchHit {
  const source = isRecord(value._source) ? value._source : {}
  const id = readOptionalString(source, 'id')
    ?? readOptionalString(value, '_id')
    ?? ''
  if (id === '') {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SHARE search hit is missing an id.',
      { provider: 'share' },
    )
  }
  return {
    id,
    score: readOptionalNumber(value, '_score'),
    source,
  }
}

function parseSourcesPage(value: unknown): ShareSourcesPage {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SHARE sources response did not match the expected JSON:API page shape.',
      { provider: 'share' },
    )
  }
  return {
    sources: value.data.filter(isRecord).map(parseSourceResource),
    links: isRecord(value.links) ? value.links : {},
  }
}

function parseSourceResource(value: Record<string, unknown>): ShareSourceResource {
  const id = readOptionalString(value, 'id') ?? ''
  const type = readOptionalString(value, 'type') ?? ''
  if (id === '' || type === '') {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'SHARE source resource is missing id or type.',
      { provider: 'share' },
    )
  }
  return {
    id,
    type,
    attributes: isRecord(value.attributes) ? value.attributes : {},
    links: isRecord(value.links) ? value.links : {},
    relationships: isRecord(value.relationships) ? value.relationships : {},
  }
}

function readTotal(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (isRecord(value)) return readOptionalNumber(value, 'value')
  return undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.detail === 'string') return value.detail
  if (typeof value.message === 'string') return value.message
  if (!Array.isArray(value.errors)) return undefined
  const first = value.errors.find(isRecord)
  if (first === undefined) return undefined
  return readOptionalString(first, 'detail')
    ?? readOptionalString(first, 'title')
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
