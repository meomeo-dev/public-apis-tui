import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const URANTIA_BASE_URL = 'https://api.urantia.dev'
export const URANTIA_DOCS_URL = 'https://urantia.dev'
export const URANTIA_OPENAPI_URL = 'https://api.urantia.dev/openapi.json'
export const URANTIA_DEFAULT_LANG = 'eng'

export const URANTIA_LANGUAGES = ['eng', 'es', 'fr', 'pt', 'de', 'ko'] as const
export const URANTIA_SEARCH_TYPES = ['and', 'or', 'phrase'] as const

export type UrantiaLanguage = typeof URANTIA_LANGUAGES[number]
export type UrantiaSearchType = typeof URANTIA_SEARCH_TYPES[number]

export type UrantiaPaperSummary = {
  id: string
  partId: string
  title: string
  sortId?: string | undefined
  labels: string[]
}

export type UrantiaTocPart = {
  id: string
  title: string
  sponsorship?: string | undefined
  papers: UrantiaPaperSummary[]
}

export type UrantiaParagraph = {
  id: string
  standardReferenceId: string
  sortId: string
  paperId: string
  sectionId: string
  partId: string
  paperTitle: string
  sectionTitle?: string | undefined
  paragraphId: string
  text: string
  labels: string[]
  rank?: number | undefined
}

export type UrantiaPaper = {
  paper: UrantiaPaperSummary
  paragraphs: UrantiaParagraph[]
}

export type UrantiaParagraphResponse = {
  paragraph: UrantiaParagraph
  navigation: {
    previous?: string | undefined
    next?: string | undefined
  }
}

export type UrantiaSearchResponse = {
  results: UrantiaParagraph[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type UrantiaSearchParams = {
  query: string
  type: UrantiaSearchType
  limit: number
  page: number
  paperId?: string | undefined
  partId?: string | undefined
  lang: UrantiaLanguage
}

export type UrantiaClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class UrantiaClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: UrantiaClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? URANTIA_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async toc(): Promise<UrantiaTocPart[]> {
    const parsed = await this.fetchJson(this.createUrl('/toc'))
    return parseToc(parsed)
  }

  async papers(lang: UrantiaLanguage): Promise<UrantiaPaperSummary[]> {
    const url = this.createUrl('/papers')
    url.searchParams.set('lang', lang)
    return parsePapers(await this.fetchJson(url))
  }

  async paper(id: string, lang: UrantiaLanguage): Promise<UrantiaPaper> {
    const url = this.createUrl(`/papers/${encodeURIComponent(id)}`)
    url.searchParams.set('lang', lang)
    return parsePaper(await this.fetchJson(url))
  }

  async paragraph(
    ref: string,
    lang: UrantiaLanguage,
  ): Promise<UrantiaParagraphResponse> {
    const url = this.createUrl(`/paragraphs/${encodeURIComponent(ref)}`)
    url.searchParams.set('lang', lang)
    return parseParagraphResponse(await this.fetchJson(url))
  }

  async search(params: UrantiaSearchParams): Promise<UrantiaSearchResponse> {
    const url = this.createUrl('/search')
    url.searchParams.set('q', params.query)
    url.searchParams.set('type', params.type)
    url.searchParams.set('limit', String(params.limit))
    url.searchParams.set('page', String(params.page))
    url.searchParams.set('lang', params.lang)
    if (params.paperId !== undefined) url.searchParams.set('paperId', params.paperId)
    if (params.partId !== undefined) url.searchParams.set('partId', params.partId)
    return parseSearch(await this.fetchJson(url))
  }

  private createUrl(path: string): URL {
    return new URL(path, this.baseUrl)
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
        `Urantia Papers API request failed: ${String(error)}`,
        { provider: 'urantia', url: url.toString() },
      )
    }

    const body = await response.text()
    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Urantia Papers API is currently returning a Cloudflare challenge',
          'HTML page instead of the documented JSON API response; retry later',
          'or use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    const contentType = response.headers.get('content-type') ?? undefined
    if (!contentType?.toLowerCase().includes('json')) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Urantia Papers API response was not JSON.',
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
        'Urantia Papers API response could not be parsed as JSON.',
        {
          ...details,
          preview: body.slice(0, 160),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readProblemDetail(parsed) ??
          `Urantia Papers API request failed with HTTP ${response.status}.`,
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
    provider: 'urantia',
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

function parseToc(value: unknown): UrantiaTocPart[] {
  const parts = isRecord(value) && isRecord(value.data) ? value.data.parts : undefined
  if (!Array.isArray(parts)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia table of contents response is missing data.parts.',
      { provider: 'urantia' },
    )
  }
  return parts.map(parseTocPart)
}

function parseTocPart(value: unknown): UrantiaTocPart {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia table of contents part was not an object.',
      { provider: 'urantia' },
    )
  }
  const papers = Array.isArray(value.papers) ? value.papers.map(parsePaperSummary) : []
  return {
    id: readString(value.id, 'id'),
    title: readString(value.title, 'title'),
    ...(typeof value.sponsorship === 'string'
      ? { sponsorship: value.sponsorship.trim() }
      : {}),
    papers,
  }
}

function parsePapers(value: unknown): UrantiaPaperSummary[] {
  const papers = isRecord(value) ? value.data : undefined
  if (!Array.isArray(papers)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia papers response is missing data array.',
      { provider: 'urantia' },
    )
  }
  return papers.map(parsePaperSummary)
}

function parsePaper(value: unknown): UrantiaPaper {
  const data = isRecord(value) ? value.data : undefined
  if (!isRecord(data) || !Array.isArray(data.paragraphs)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia paper response is missing paper or paragraphs.',
      { provider: 'urantia' },
    )
  }
  return {
    paper: parsePaperSummary(data.paper),
    paragraphs: data.paragraphs.map(parseParagraph),
  }
}

function parseParagraphResponse(value: unknown): UrantiaParagraphResponse {
  const root = isRecord(value) ? value : {}
  const data = root.data
  if (!isRecord(data)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia paragraph response is missing data.',
      { provider: 'urantia' },
    )
  }
  const navigation = isRecord(root.navigation) ? root.navigation : {}
  const previous = typeof navigation.prev === 'string' ? navigation.prev : undefined
  const next = typeof navigation.next === 'string' ? navigation.next : undefined
  return {
    paragraph: parseParagraph(data),
    navigation: {
      ...(previous !== undefined ? { previous } : {}),
      ...(next !== undefined ? { next } : {}),
    },
  }
}

function parseSearch(value: unknown): UrantiaSearchResponse {
  const results = isRecord(value) ? value.data : undefined
  const meta = isRecord(value) && isRecord(value.meta) ? value.meta : undefined
  if (!Array.isArray(results) || meta === undefined) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia search response is missing data array or meta object.',
      { provider: 'urantia' },
    )
  }
  return {
    results: results.map(parseParagraph),
    meta: {
      page: readInteger(meta.page, 'meta.page'),
      limit: readInteger(meta.limit, 'meta.limit'),
      total: readInteger(meta.total, 'meta.total'),
      totalPages: readInteger(meta.totalPages, 'meta.totalPages'),
    },
  }
}

function parsePaperSummary(value: unknown): UrantiaPaperSummary {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia paper record was not an object.',
      { provider: 'urantia' },
    )
  }
  return {
    id: readString(value.id, 'id'),
    partId: readString(value.partId ?? value.id, 'partId'),
    title: readString(value.title, 'title'),
    ...readOptionalStringProperty(value, 'sortId'),
    labels: readStringArray(value.labels),
  }
}

function parseParagraph(value: unknown): UrantiaParagraph {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'Urantia paragraph record was not an object.',
      { provider: 'urantia' },
    )
  }
  return {
    id: readString(value.id, 'id'),
    standardReferenceId: readString(
      value.standardReferenceId,
      'standardReferenceId',
    ),
    sortId: readString(value.sortId, 'sortId'),
    paperId: readString(value.paperId, 'paperId'),
    sectionId: readString(value.sectionId, 'sectionId'),
    partId: readString(value.partId, 'partId'),
    paperTitle: readString(value.paperTitle, 'paperTitle'),
    ...(typeof value.sectionTitle === 'string'
      ? { sectionTitle: value.sectionTitle.trim() }
      : {}),
    paragraphId: readString(value.paragraphId, 'paragraphId'),
    text: readString(value.text, 'text'),
    labels: readStringArray(value.labels),
    ...(typeof value.rank === 'number' && Number.isFinite(value.rank)
      ? { rank: value.rank }
      : {}),
  }
}

function readOptionalStringProperty(
  value: Record<string, unknown>,
  key: string,
): Record<string, string> {
  const text = typeof value[key] === 'string' ? value[key].trim() : ''
  return text === '' ? {} : { [key]: text }
}

function readString(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Urantia response is missing string field ${key}.`,
    { provider: 'urantia', key },
  )
}

function readInteger(value: unknown, key: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  throw new RuntimeFailure(
    'OPEN_API_FAILED',
    `Urantia response is missing integer field ${key}.`,
    { provider: 'urantia', key },
  )
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
      .map(entry => entry.trim())
      .filter(entry => entry !== '')
    : []
}

function readProblemDetail(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.detail === 'string' && value.detail.trim() !== '') {
    return value.detail.trim()
  }
  if (typeof value.title === 'string' && value.title.trim() !== '') {
    return value.title.trim()
  }
  return undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
