import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GURBANI_NOW_DEFAULT_BASE_URL = 'https://api.gurbaninow.com/v2'
export const GURBANI_NOW_DEFAULT_SEARCH_QUERY = 'DDrgj'
export const GURBANI_NOW_DEFAULT_SOURCE = 1
export const GURBANI_NOW_DEFAULT_SEARCH_TYPE = 1
export const GURBANI_NOW_DEFAULT_RESULTS = 10
export const GURBANI_NOW_MAX_RESULTS = 50
export const GURBANI_NOW_MAX_SKIP = 10_000
export const GURBANI_NOW_DEFAULT_BANI_ID = 1
export const GURBANI_NOW_DEFAULT_LINE_LIMIT = 40
export const GURBANI_NOW_MAX_LINE_LIMIT = 120

export type GurbaniNowClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type GurbaniNowSearchQuery = {
  query: string
  source?: number | undefined
  searchType: number
  writer?: number | undefined
  raag?: number | undefined
  ang?: number | undefined
  results: number
  skip: number
}

export type GurbaniNowBaniListQuery = {
  limit: number
}

export type GurbaniNowBaniQuery = {
  id: number
  offset: number
  limit: number
}

export type GurbaniNowName = {
  id?: number | undefined
  akhar?: string | undefined
  unicode?: string | undefined
  english?: string | undefined
}

export type GurbaniNowSource = GurbaniNowName & {
  length?: number | undefined
  pageName?: GurbaniNowName | undefined
}

export type GurbaniNowRaag = GurbaniNowName & {
  startang?: number | undefined
  endang?: number | undefined
  raagwithpage?: string | undefined
}

export type GurbaniNowLine = {
  id?: string | undefined
  type?: number | undefined
  shabadid?: string | undefined
  gurmukhi?: GurbaniNowTextPair | undefined
  larivaar?: GurbaniNowTextPair | undefined
  translation?: {
    english?: string | undefined
    punjabi?: string | undefined
    spanish?: string | undefined
  } | undefined
  transliteration?: {
    english?: string | undefined
    devanagari?: string | undefined
  } | undefined
  pageno?: number | undefined
  lineno?: number | undefined
  linenum?: number | undefined
  firstletters?: GurbaniNowTextPair | undefined
}

export type GurbaniNowTextPair = {
  akhar?: string | undefined
  unicode?: string | undefined
}

export type GurbaniNowShabadSummary = {
  id?: string | undefined
  shabadid?: string | undefined
  type?: number | undefined
  line?: GurbaniNowLine | undefined
  source?: GurbaniNowSource | undefined
  writer?: GurbaniNowName | undefined
  raag?: GurbaniNowRaag | undefined
  pageno?: number | undefined
  lineno?: number | undefined
  firstletters?: GurbaniNowTextPair | undefined
}

export type GurbaniNowSearchPage = {
  inputvalues?: Record<string, unknown> | undefined
  count: number
  error?: boolean | undefined
  shabads: GurbaniNowShabadSummary[]
}

export type GurbaniNowBaniInfo = GurbaniNowName & {
  pageno?: number | undefined
  source?: GurbaniNowSource | undefined
  writer?: GurbaniNowName | undefined
  raag?: GurbaniNowRaag | undefined
  count?: number | undefined
}

export type GurbaniNowBaniListItem = GurbaniNowName

export type GurbaniNowBani = {
  baniinfo: GurbaniNowBaniInfo
  bani: GurbaniNowLine[]
}

export class GurbaniNowClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: GurbaniNowClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? GURBANI_NOW_DEFAULT_BASE_URL,
    )
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async search(query: GurbaniNowSearchQuery): Promise<GurbaniNowSearchPage> {
    const url = new URL(`${this.baseUrl}/search/${encodeURIComponent(query.query)}/`)
    appendOptionalNumberParam(url, 'source', query.source)
    url.searchParams.set('searchtype', String(query.searchType))
    appendOptionalNumberParam(url, 'writer', query.writer)
    appendOptionalNumberParam(url, 'raag', query.raag)
    appendOptionalNumberParam(url, 'ang', query.ang)
    url.searchParams.set('results', String(query.results))
    url.searchParams.set('skip', String(query.skip))
    return parseSearchPage(await this.getJson(url))
  }

  async listBanis(): Promise<GurbaniNowBaniListItem[]> {
    const parsed = await this.getJson(new URL(`${this.baseUrl}/banis`))
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'GurbaniNow banis response must be an array.',
      )
    }
    return parsed.filter(isRecord).map(parseName)
  }

  async getBani(query: GurbaniNowBaniQuery): Promise<GurbaniNowBani> {
    const parsed = await this.getJson(new URL(`${this.baseUrl}/banis/${query.id}`))
    return parseBani(parsed)
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
          'GurbaniNow is currently returning a Cloudflare challenge HTML page',
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
        'GurbaniNow API returned non-JSON content.',
        createResponseDetails(response, url),
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ?? 'GurbaniNow request failed.',
        { ...createResponseDetails(response, url), response: parsed },
      )
    }

    return parsed
  }
}

function parseSearchPage(value: unknown): GurbaniNowSearchPage {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'GurbaniNow search response must be an object.',
    )
  }
  return {
    inputvalues: isRecord(value.inputvalues) ? value.inputvalues : undefined,
    count: readNumber(value, 'count'),
    error: readOptionalBoolean(value, 'error'),
    shabads: Array.isArray(value.shabads)
      ? value.shabads.filter(isRecord).map(parseShabad)
      : [],
  }
}

function parseBani(value: unknown): GurbaniNowBani {
  if (!isRecord(value) || !isRecord(value.baniinfo) || !Array.isArray(value.bani)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'GurbaniNow bani response must include baniinfo and bani.',
    )
  }
  return {
    baniinfo: parseBaniInfo(value.baniinfo),
    bani: value.bani.filter(isRecord).map(entry => {
      return parseLine(isRecord(entry.line) ? entry.line : entry)
    }),
  }
}

function parseBaniInfo(value: Record<string, unknown>): GurbaniNowBaniInfo {
  return {
    ...parseName(value),
    pageno: readOptionalNumber(value, 'pageno'),
    source: isRecord(value.source) ? parseSource(value.source) : undefined,
    writer: isRecord(value.writer) ? parseName(value.writer) : undefined,
    raag: isRecord(value.raag) ? parseRaag(value.raag) : undefined,
    count: readOptionalNumber(value, 'count'),
  }
}

function parseShabad(value: Record<string, unknown>): GurbaniNowShabadSummary {
  const shabad = isRecord(value.shabad) ? value.shabad : value
  return {
    id: readOptionalString(shabad, 'id'),
    shabadid: readOptionalString(shabad, 'shabadid'),
    type: readOptionalNumber(shabad, 'type'),
    line: parseLine(shabad),
    source: isRecord(shabad.source) ? parseSource(shabad.source) : undefined,
    writer: isRecord(shabad.writer) ? parseName(shabad.writer) : undefined,
    raag: isRecord(shabad.raag) ? parseRaag(shabad.raag) : undefined,
    pageno: readOptionalNumber(shabad, 'pageno'),
    lineno: readOptionalNumber(shabad, 'lineno'),
    firstletters: isRecord(shabad.firstletters)
      ? parseTextPair(shabad.firstletters)
      : undefined,
  }
}

function parseLine(value: Record<string, unknown>): GurbaniNowLine {
  return {
    id: readOptionalString(value, 'id'),
    type: readOptionalNumber(value, 'type'),
    shabadid: readOptionalString(value, 'shabadid'),
    gurmukhi: isRecord(value.gurmukhi) ? parseTextPair(value.gurmukhi) : undefined,
    larivaar: isRecord(value.larivaar) ? parseTextPair(value.larivaar) : undefined,
    translation: parseTranslation(value.translation),
    transliteration: parseTransliteration(value.transliteration),
    pageno: readOptionalNumber(value, 'pageno'),
    lineno: readOptionalNumber(value, 'lineno'),
    linenum: readOptionalNumber(value, 'linenum'),
    firstletters: isRecord(value.firstletters)
      ? parseTextPair(value.firstletters)
      : undefined,
  }
}

function parseName(value: Record<string, unknown>): GurbaniNowName {
  return {
    id: readOptionalNumber(value, 'id'),
    akhar: readOptionalString(value, 'akhar'),
    unicode: readOptionalString(value, 'unicode'),
    english: readOptionalString(value, 'english'),
  }
}

function parseSource(value: Record<string, unknown>): GurbaniNowSource {
  return {
    ...parseName(value),
    length: readOptionalNumber(value, 'length'),
    pageName: isRecord(value.pageName) ? parseName(value.pageName) : undefined,
  }
}

function parseRaag(value: Record<string, unknown>): GurbaniNowRaag {
  return {
    ...parseName(value),
    startang: readOptionalNumber(value, 'startang'),
    endang: readOptionalNumber(value, 'endang'),
    raagwithpage: readOptionalString(value, 'raagwithpage'),
  }
}

function parseTextPair(value: Record<string, unknown>): GurbaniNowTextPair {
  return {
    akhar: readOptionalString(value, 'akhar'),
    unicode: readOptionalString(value, 'unicode'),
  }
}

function parseTranslation(value: unknown): GurbaniNowLine['translation'] {
  if (!isRecord(value)) return undefined
  return {
    english: readNestedText(value.english),
    punjabi: readNestedText(value.punjabi),
    spanish: readOptionalString(value, 'spanish'),
  }
}

function parseTransliteration(value: unknown): GurbaniNowLine['transliteration'] {
  if (!isRecord(value)) return undefined
  return {
    english: readNestedText(value.english),
    devanagari: readNestedText(value.devanagari),
  }
}

function readNestedText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value
  if (!isRecord(value)) return undefined
  if (typeof value.text === 'string' && value.text.trim() !== '') return value.text
  if (typeof value.default === 'string' && value.default.trim() !== '') {
    return value.default
  }
  if (isRecord(value.default)) {
    return readOptionalString(value.default, 'unicode')
      ?? readOptionalString(value.default, 'akhar')
  }
  return undefined
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `GurbaniNow field ${key} must be a number.`,
    )
  }
  return value
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

function readOptionalBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  return typeof record[key] === 'boolean' ? record[key] : undefined
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
    ?? readOptionalString(value, 'data')
}

function createResponseDetails(response: Response, url: URL): Record<string, unknown> {
  return {
    provider: 'gurbaninow',
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

function appendOptionalNumberParam(
  url: URL,
  key: string,
  value: number | undefined,
): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
