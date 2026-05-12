import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const POETRYDB_DEFAULT_BASE_URL = 'https://poetrydb.org'
export const POETRYDB_DEFAULT_SEARCH_COUNT = 20
export const POETRYDB_MAX_COUNT = 20
export const POETRYDB_DEFAULT_RANDOM_COUNT = 1
export const POETRYDB_DEFAULT_LINE_LIMIT = 12
export const POETRYDB_MAX_LINE_LIMIT = 80

export type PoetryDbClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type PoetryDbSearchField = 'author' | 'title' | 'lines' | 'linecount'

export type PoetryDbSearchQuery = {
  field?: PoetryDbSearchField | undefined
  term?: string | undefined
  exact?: boolean | undefined
  count?: number | undefined
  includeLines?: boolean | undefined
}

export type PoetryDbRandomQuery = {
  count?: number | undefined
  includeLines?: boolean | undefined
}

export type PoetryDbPoem = {
  title: string
  author: string
  linecount?: number | undefined
  lines: string[]
}

type NormalizedPoetryDbSearchQuery = {
  field: PoetryDbSearchField
  term: string
  exact: boolean
  count: number
  includeLines: boolean
}

type NormalizedPoetryDbRandomQuery = {
  count: number
  includeLines: boolean
}

export class PoetryDbClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: PoetryDbClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? POETRYDB_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async search(query: PoetryDbSearchQuery = {}): Promise<PoetryDbPoem[]> {
    const normalized = normalizeSearchQuery(query)
    const inputFields = `${normalized.field},poemcount`
    const searchTerm = `${encodePathSegment(normalized.term)}${normalized.exact ? ':abs' : ''};${String(normalized.count)}`
    const outputFields = readOutputFields(normalized.includeLines).join(',')
    const parsed = await this.fetchJson(new URL(`/${inputFields}/${searchTerm}/${outputFields}.json`, this.baseUrl), {
      notFoundAsEmptyArray: true,
    })
    return parsePoems(parsed)
  }

  async random(query: PoetryDbRandomQuery = {}): Promise<PoetryDbPoem[]> {
    const normalized = normalizeRandomQuery(query)
    const outputFields = readOutputFields(normalized.includeLines).join(',')
    const parsed = await this.fetchJson(new URL(`/random/${String(normalized.count)}/${outputFields}.json`, this.baseUrl))
    return parsePoems(parsed)
  }

  private async fetchJson(url: URL, options: { notFoundAsEmptyArray?: boolean | undefined } = {}): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'PoetryDB returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (options.notFoundAsEmptyArray === true && isPoetryDbNotFound(parsed)) {
      return []
    }

    if (!response.ok || isPoetryDbError(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readPoetryDbError(parsed) ?? response.statusText ?? 'PoetryDB request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizePoetryDbSearchQuery(query: PoetryDbSearchQuery = {}): NormalizedPoetryDbSearchQuery {
  return normalizeSearchQuery(query)
}

export function normalizePoetryDbRandomQuery(query: PoetryDbRandomQuery = {}): NormalizedPoetryDbRandomQuery {
  return normalizeRandomQuery(query)
}

export function clampPoetryDbLineLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 0) {
    return POETRYDB_DEFAULT_LINE_LIMIT
  }
  return Math.min(Math.trunc(value), POETRYDB_MAX_LINE_LIMIT)
}

function normalizeSearchQuery(query: PoetryDbSearchQuery = {}): NormalizedPoetryDbSearchQuery {
  return {
    field: query.field ?? 'title',
    term: query.term?.trim() || 'Ozymandias',
    exact: query.exact ?? false,
    count: clampCount(query.count, POETRYDB_DEFAULT_SEARCH_COUNT),
    includeLines: query.includeLines ?? true,
  }
}

function normalizeRandomQuery(query: PoetryDbRandomQuery = {}): NormalizedPoetryDbRandomQuery {
  return {
    count: clampCount(query.count, POETRYDB_DEFAULT_RANDOM_COUNT),
    includeLines: query.includeLines ?? false,
  }
}

function clampCount(value: number | undefined, defaultValue: number): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return defaultValue
  }
  return Math.min(Math.trunc(value), POETRYDB_MAX_COUNT)
}

function readOutputFields(includeLines: boolean): string[] {
  return includeLines ? ['author', 'title', 'linecount', 'lines'] : ['author', 'title', 'linecount']
}

function parsePoems(value: unknown): PoetryDbPoem[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PoetryDB response is not a poem array.')
  }
  return value.map(parsePoem)
}

function parsePoem(value: unknown): PoetryDbPoem {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.author !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PoetryDB poem response is missing title or author.')
  }
  return {
    title: value.title,
    author: value.author,
    ...(readLineCount(value.linecount) !== undefined ? { linecount: readLineCount(value.linecount) } : {}),
    lines: filterStringArray(value.lines),
  }
}

function readLineCount(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && /^\d+$/u.test(value)) {
    return Number(value)
  }
  return undefined
}

function filterStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function isPoetryDbError(value: unknown): boolean {
  return isRecord(value) && typeof value.status === 'number' && typeof value.reason === 'string'
}

function isPoetryDbNotFound(value: unknown): boolean {
  return isPoetryDbError(value) && readPoetryDbError(value)?.toLowerCase() === 'not found'
}

function readPoetryDbError(value: unknown): string | undefined {
  return isRecord(value) && typeof value.reason === 'string' ? value.reason : undefined
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%20/gu, '%20')
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
