import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const INSPIRE_HEP_DEFAULT_BASE_URL = 'https://inspirehep.net'

export type InspireHepClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type InspireHepSearchQuery = {
  q: string
  sort?: string | undefined
  size: number
  page: number
  fields?: string | undefined
}

export type InspireHepSearchPage = {
  total: number
  hits: InspireHepRecord[]
  links: Record<string, string>
  rateLimit: InspireHepRateLimit
}

export type InspireHepRecordResponse = {
  record: InspireHepRecord
  rateLimit: InspireHepRateLimit
}

export type InspireHepRecord = {
  id: string
  created?: string | undefined
  updated?: string | undefined
  links: Record<string, string>
  metadata: Record<string, unknown>
}

export type InspireHepRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export class InspireHepClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: InspireHepClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? INSPIRE_HEP_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchLiterature(
    query: InspireHepSearchQuery,
  ): Promise<InspireHepSearchPage> {
    const url = new URL('/api/literature', this.baseUrl)
    url.searchParams.set('q', query.q)
    appendOptionalStringParam(url, 'sort', query.sort)
    url.searchParams.set('size', String(query.size))
    url.searchParams.set('page', String(query.page))
    appendOptionalStringParam(url, 'fields', query.fields)

    const { parsed, rateLimit } = await this.getJson(url)
    return parseSearchPage(parsed, rateLimit)
  }

  async getLiteratureRecord(recid: number): Promise<InspireHepRecordResponse> {
    const url = new URL(`/api/literature/${String(recid)}`, this.baseUrl)
    const { parsed, rateLimit } = await this.getJson(url)
    return {
      record: parseRecord(parsed),
      rateLimit,
    }
  }

  private async getJson(
    url: URL,
  ): Promise<{ parsed: unknown; rateLimit: InspireHepRateLimit }> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': [
          'public-apis-tui no-auth CLI',
          '(https://github.com/public-apis/public-apis)',
        ].join(' '),
      },
    })
    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'INSPIRE HEP is currently returning a Cloudflare challenge HTML',
          'page instead of the documented JSON API response; retry later or',
          'use cached/offline data.',
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
        'INSPIRE HEP API returned non-JSON content.',
        createResponseDetails(response, url),
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ?? 'INSPIRE HEP request failed.',
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

function parseSearchPage(
  value: unknown,
  rateLimit: InspireHepRateLimit,
): InspireHepSearchPage {
  if (!isRecord(value) || !isRecord(value.hits)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'INSPIRE HEP search response is missing hits metadata.',
    )
  }
  const rawHits = Array.isArray(value.hits.hits)
    ? value.hits.hits.filter(isRecord)
    : []
  return {
    total: readNumber(value.hits, 'total'),
    hits: rawHits.map(parseRecord),
    links: readStringRecord(value.links),
    rateLimit,
  }
}

function parseRecord(value: unknown): InspireHepRecord {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'INSPIRE HEP record response is missing metadata.',
    )
  }
  const id = readOptionalString(value, 'id')
    ?? readOptionalNumber(value.metadata, 'control_number')?.toString()
  if (id === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'INSPIRE HEP record response is missing id.',
    )
  }
  return {
    id,
    created: readOptionalString(value, 'created'),
    updated: readOptionalString(value, 'updated'),
    links: readStringRecord(value.links),
    metadata: value.metadata,
  }
}

function readRateLimit(headers: Headers): InspireHepRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
    reset: headers.get('x-ratelimit-reset') ?? undefined,
  }
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
    provider: 'inspirehep',
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

function readStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => (
      typeof entry[1] === 'string' && entry[1].trim() !== ''
    )),
  )
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `INSPIRE HEP field ${key} must be a number.`,
    )
  }
  return value
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function appendOptionalStringParam(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
