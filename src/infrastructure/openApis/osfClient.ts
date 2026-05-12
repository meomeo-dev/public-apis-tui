import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OSF_DEFAULT_BASE_URL = 'https://api.osf.io/v2'

export type OsfClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type OsfNodesQuery = {
  title?: string | undefined
  category?: string | undefined
  tags?: string | undefined
  public?: boolean | undefined
  limit: number
  page: number
}

export type OsfPreprintsQuery = {
  provider?: string | undefined
  isPublished?: boolean | undefined
  limit: number
  page: number
}

export type OsfJsonApiPage = {
  data: OsfResource[]
  links: Record<string, unknown>
  total?: number | undefined
  perPage?: number | undefined
  version?: string | undefined
}

export type OsfResource = {
  id: string
  type: string
  attributes: Record<string, unknown>
  relationships: Record<string, unknown>
  links: Record<string, unknown>
}

export class OsfClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: OsfClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? OSF_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listNodes(query: OsfNodesQuery): Promise<OsfJsonApiPage> {
    const url = new URL('/v2/nodes/', this.baseUrl)
    appendFilter(url, 'title', query.title)
    appendFilter(url, 'category', query.category)
    appendFilter(url, 'tags', query.tags)
    appendBooleanFilter(url, 'public', query.public)
    appendPageParams(url, query.limit, query.page)
    return this.getJsonApiPage(url)
  }

  async listPreprints(query: OsfPreprintsQuery): Promise<OsfJsonApiPage> {
    const url = new URL('/v2/preprints/', this.baseUrl)
    appendFilter(url, 'provider', query.provider)
    appendBooleanFilter(url, 'is_published', query.isPublished)
    appendPageParams(url, query.limit, query.page)
    return this.getJsonApiPage(url)
  }

  private async getJsonApiPage(url: URL): Promise<OsfJsonApiPage> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/vnd.api+json, application/json',
          'user-agent': [
            'public-apis-tui no-auth CLI',
            '(https://github.com/public-apis/public-apis)',
          ].join(' '),
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `OSF request failed: ${String(error)}`,
        { provider: 'osf', url: url.toString() },
      )
    }

    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'OSF is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON:API response; retry later or use',
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
        'OSF response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: body.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ?? `OSF request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parseJsonApiPage(parsed)
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'osf',
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

function parseJsonApiPage(value: unknown): OsfJsonApiPage {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'OSF response did not match the expected JSON:API page shape.',
      { provider: 'osf' },
    )
  }
  const links = isRecord(value.links) ? value.links : {}
  const meta = isRecord(value.meta) ? value.meta : {}
  const linkMeta = isRecord(links.meta) ? links.meta : {}
  return {
    data: value.data.filter(isRecord).map(parseResource),
    links,
    total: readOptionalNumber(linkMeta, 'total'),
    perPage: readOptionalNumber(linkMeta, 'per_page'),
    version: readOptionalString(meta, 'version'),
  }
}

function parseResource(value: Record<string, unknown>): OsfResource {
  const id = readRequiredString(value, 'id')
  const type = readRequiredString(value, 'type')
  const attributes = isRecord(value.attributes) ? value.attributes : {}
  const relationships = isRecord(value.relationships) ? value.relationships : {}
  const links = isRecord(value.links) ? value.links : {}
  return { id, type, attributes, relationships, links }
}

function appendFilter(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(`filter[${key}]`, value.trim())
  }
}

function appendBooleanFilter(
  url: URL,
  key: string,
  value: boolean | undefined,
): void {
  if (value !== undefined) {
    url.searchParams.set(`filter[${key}]`, value ? 'true' : 'false')
  }
}

function appendPageParams(url: URL, limit: number, page: number): void {
  url.searchParams.set('page[size]', String(limit))
  if (page > 1) {
    url.searchParams.set('page', String(page))
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.errors)) return undefined
  const first = value.errors.find(isRecord)
  if (first === undefined) return undefined
  return readOptionalString(first, 'detail')
    ?? readOptionalString(first, 'title')
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key]
  if (typeof value === 'string' && value.trim() !== '') return value
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `OSF resource is missing required string field ${key}.`,
    { provider: 'osf' },
  )
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
