import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GUARDIAN_DEFAULT_BASE_URL = 'https://content.guardianapis.com'
export const GUARDIAN_ENV_API_KEY = 'GUARDIAN_API_KEY'
export const GUARDIAN_DEFAULT_QUERY = 'public api'
export const GUARDIAN_DEFAULT_PAGE_SIZE = 50
export const GUARDIAN_MAX_PAGE_SIZE = 50
export const GUARDIAN_DEFAULT_PAGE = 1
export const GUARDIAN_DEFAULT_SHOW_FIELDS = 'headline,trailText,thumbnail,shortUrl,byline'

export type GuardianOrderBy = 'newest' | 'oldest' | 'relevance'

export type GuardianSearchInput = {
  apiKey?: string | undefined
  query?: string | undefined
  section?: string | undefined
  tag?: string | undefined
  fromDate?: string | undefined
  toDate?: string | undefined
  orderBy?: GuardianOrderBy | undefined
  pageSize?: number | undefined
  page?: number | undefined
  showFields?: string | undefined
}

export type NormalizedGuardianSearchInput = {
  query: string
  pageSize: number
  page: number
  showFields: string
  section?: string | undefined
  tag?: string | undefined
  fromDate?: string | undefined
  toDate?: string | undefined
  orderBy?: GuardianOrderBy | undefined
}

export type GuardianArticleFields = {
  headline?: string | undefined
  trailText?: string | undefined
  thumbnail?: string | undefined
  shortUrl?: string | undefined
  byline?: string | undefined
}

export type GuardianArticle = {
  id: string
  type?: string | undefined
  sectionId?: string | undefined
  sectionName?: string | undefined
  publishedAt?: string | undefined
  title: string
  webUrl: string
  apiUrl?: string | undefined
  pillarId?: string | undefined
  pillarName?: string | undefined
  isHosted?: boolean | undefined
  fields: GuardianArticleFields
}

export type GuardianSearchEnvelope = {
  status: string
  userTier?: string | undefined
  total: number
  startIndex?: number | undefined
  pageSize: number
  currentPage: number
  pages: number
  orderBy?: string | undefined
  results: GuardianArticle[]
}

export class GuardianClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { apiKey?: string | undefined; baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? GUARDIAN_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async search(input: NormalizedGuardianSearchInput): Promise<GuardianSearchEnvelope> {
    const url = new URL(`${this.baseUrl}/search`)
    url.searchParams.set('api-key', this.apiKey)
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', input.query)
    url.searchParams.set('page-size', String(input.pageSize))
    url.searchParams.set('page', String(input.page))
    url.searchParams.set('show-fields', input.showFields)
    appendOptionalParam(url, 'section', input.section)
    appendOptionalParam(url, 'tag', input.tag)
    appendOptionalParam(url, 'from-date', input.fromDate)
    appendOptionalParam(url, 'to-date', input.toDate)
    appendOptionalParam(url, 'order-by', input.orderBy)
    return this.fetchJson(url)
  }

  private async fetchJson(url: URL): Promise<GuardianSearchEnvelope> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `The Guardian request failed: ${String(error)}`, {
        provider: 'guardian',
        endpoint: redactApiKey(url.href),
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `The Guardian returned a non-JSON response: ${String(error)}`, {
        provider: 'guardian',
        endpoint: redactApiKey(url.href),
        status: response.status,
      })
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `The Guardian request failed with HTTP ${response.status}.`, {
        provider: 'guardian',
        endpoint: redactApiKey(url.href),
        status: response.status,
        response: redactErrorPayload(parsed),
      })
    }

    return parseSearchEnvelope(parsed)
  }
}

export function normalizeGuardianSearchInput(input: GuardianSearchInput = {}): NormalizedGuardianSearchInput {
  return {
    query: normalizeQuery(input.query ?? GUARDIAN_DEFAULT_QUERY),
    pageSize: normalizeInteger(input.pageSize ?? GUARDIAN_DEFAULT_PAGE_SIZE, '--page-size', 1, GUARDIAN_MAX_PAGE_SIZE),
    page: normalizeInteger(input.page ?? GUARDIAN_DEFAULT_PAGE, '--page', 1, 1000),
    showFields: normalizeFieldList(input.showFields ?? GUARDIAN_DEFAULT_SHOW_FIELDS, '--show-fields'),
    ...(input.section !== undefined ? { section: normalizeSlug(input.section, '--section') } : {}),
    ...(input.tag !== undefined ? { tag: normalizeTag(input.tag) } : {}),
    ...(input.fromDate !== undefined ? { fromDate: normalizeDate(input.fromDate, '--from-date') } : {}),
    ...(input.toDate !== undefined ? { toDate: normalizeDate(input.toDate, '--to-date') } : {}),
    ...(input.orderBy !== undefined ? { orderBy: normalizeOrderBy(input.orderBy) } : {}),
  }
}

function parseSearchEnvelope(value: unknown): GuardianSearchEnvelope {
  if (!isRecord(value) || !isRecord(value.response)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'The Guardian search response had an unexpected schema.')
  }
  const response = value.response
  if (response.status !== 'ok' || typeof response.total !== 'number' || typeof response.pageSize !== 'number' || typeof response.currentPage !== 'number' || typeof response.pages !== 'number' || !Array.isArray(response.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'The Guardian search response was missing required pagination fields.')
  }
  return {
    status: response.status,
    userTier: optionalString(response.userTier),
    total: response.total,
    startIndex: typeof response.startIndex === 'number' ? response.startIndex : undefined,
    pageSize: response.pageSize,
    currentPage: response.currentPage,
    pages: response.pages,
    orderBy: optionalString(response.orderBy),
    results: response.results.filter(isRecord).map(parseArticle),
  }
}

function parseArticle(value: Record<string, unknown>): GuardianArticle {
  const id = optionalString(value.id)
  const title = optionalString(value.webTitle)
  const webUrl = optionalString(value.webUrl)
  if (id === undefined || title === undefined || webUrl === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'The Guardian result was missing id, webTitle, or webUrl.')
  }
  const fields = isRecord(value.fields) ? value.fields : {}
  return {
    id,
    title,
    webUrl,
    type: optionalString(value.type),
    sectionId: optionalString(value.sectionId),
    sectionName: optionalString(value.sectionName),
    publishedAt: optionalString(value.webPublicationDate),
    apiUrl: optionalString(value.apiUrl),
    pillarId: optionalString(value.pillarId),
    pillarName: optionalString(value.pillarName),
    isHosted: typeof value.isHosted === 'boolean' ? value.isHosted : undefined,
    fields: {
      headline: optionalString(fields.headline),
      trailText: optionalString(fields.trailText),
      thumbnail: optionalString(fields.thumbnail),
      shortUrl: optionalString(fields.shortUrl),
      byline: optionalString(fields.byline),
    },
  }
}

function appendOptionalParam(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(name, value)
  }
}

function resolveApiKey(apiKey: string | undefined): string {
  const resolved = apiKey ?? process.env[GUARDIAN_ENV_API_KEY]
  if (resolved === undefined || resolved.trim() === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Missing ${GUARDIAN_ENV_API_KEY}.`, {
      env: GUARDIAN_ENV_API_KEY,
      remediation: `Set ${GUARDIAN_ENV_API_KEY} in the environment or local provider config.`,
    })
  }
  return resolved.trim()
}

function normalizeQuery(value: string): string {
  const normalized = normalizeText(value, '--query')
  if (normalized.length > 500) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be at most 500 characters for The Guardian.')
  }
  return normalized
}

function normalizeSlug(value: string, label: string): string {
  const normalized = normalizeText(value, label).toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a Guardian slug such as technology.`)
  }
  return normalized
}

function normalizeTag(value: string): string {
  const normalized = normalizeText(value, '--tag').toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)+$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--tag must be a Guardian tag path such as technology/apple.')
  }
  return normalized
}

function normalizeDate(value: string, label: string): string {
  const normalized = normalizeText(value, label)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must use YYYY-MM-DD.`)
  }
  return normalized
}

function normalizeOrderBy(value: string): GuardianOrderBy {
  if (value === 'newest' || value === 'oldest' || value === 'relevance') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--order-by must be one of: newest, oldest, relevance.')
}

function normalizeFieldList(value: string, label: string): string {
  const allowed = new Set(['headline', 'trailText', 'thumbnail', 'shortUrl', 'byline'])
  const fields = normalizeText(value, label).split(',').map(field => field.trim()).filter(field => field !== '')
  if (fields.length === 0 || fields.some(field => !allowed.has(field))) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a comma-separated subset of: ${[...allowed].join(', ')}.`)
  }
  return fields.join(',')
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  }
  return normalized
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function isErrorEnvelope(value: unknown): boolean {
  return isRecord(value) && isRecord(value.response) && value.response.status === 'error'
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.response)) {
    return undefined
  }
  return typeof value.response.message === 'string' ? value.response.message : undefined
}

function redactErrorPayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }
  return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [
    key,
    /api[-_]?key|token|secret/iu.test(key) ? '[redacted]' : entryValue,
  ]))
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]api-key=)[^&]+/iu, '$1[redacted]')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
