import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WOLNE_LEKTURY_DEFAULT_BASE_URL = 'https://wolnelektury.pl'
export const WOLNE_LEKTURY_DEFAULT_LIMIT = 100
export const WOLNE_LEKTURY_MAX_LIMIT = 100
export const WOLNE_LEKTURY_DEFAULT_READ_LIMIT = 80
export const WOLNE_LEKTURY_MAX_READ_LIMIT = 200

export type WolneLekturyClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
  retryDelayMs?: number | undefined
}

export type WolneLekturyBooksQuery = {
  query?: string | undefined
  author?: string | undefined
  genre?: string | undefined
  kind?: string | undefined
  epoch?: string | undefined
  limit?: number | undefined
}

export type WolneLekturyBookQuery = {
  slug?: string | undefined
}

export type WolneLekturyReadQuery = {
  slug?: string | undefined
  offset?: number | undefined
  limit?: number | undefined
}

export type WolneLekturyBookSummary = {
  title: string
  author?: string | undefined
  epoch?: string | undefined
  genre?: string | undefined
  kind?: string | undefined
  href: string
  url?: string | undefined
  cover?: string | undefined
  hasAudio?: boolean | undefined
  slug?: string | undefined
}

export type WolneLekturyNamedRef = {
  name: string
  slug?: string | undefined
  href?: string | undefined
  url?: string | undefined
}

export type WolneLekturyBookDetail = {
  title: string
  url?: string | undefined
  authors: WolneLekturyNamedRef[]
  epochs: WolneLekturyNamedRef[]
  genres: WolneLekturyNamedRef[]
  kinds: WolneLekturyNamedRef[]
  downloads: Record<string, string>
  cover?: string | undefined
  childrenCount?: number | undefined
}

export type WolneLekturyTextPage = {
  slug: string
  sourceUrl: string
  offset: number
  limit: number
  totalLines: number
  lines: string[]
}

export class WolneLekturyClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly retryDelayMs: number

  constructor(options: WolneLekturyClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? WOLNE_LEKTURY_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
    this.retryDelayMs = options.retryDelayMs ?? 500
  }

  async listBooks(query: WolneLekturyBooksQuery = {}): Promise<WolneLekturyBookSummary[]> {
    const normalized = normalizeBooksQuery(query)
    const parsed = await this.fetchJson(new URL('/api/books/', this.baseUrl))
    const books = parseBookSummaries(parsed)
    return books.filter(book => matchesBookFilters(book, normalized)).slice(0, normalized.limit)
  }

  async getBook(query: WolneLekturyBookQuery = {}): Promise<WolneLekturyBookDetail> {
    const normalized = normalizeBookQuery(query)
    const parsed = await this.fetchJson(new URL(`/api/books/${encodeURIComponent(normalized.slug)}/`, this.baseUrl))
    return parseBookDetail(parsed)
  }

  async readBook(query: WolneLekturyReadQuery = {}): Promise<WolneLekturyTextPage> {
    const normalized = normalizeReadQuery(query)
    const book = await this.getBook({ slug: normalized.slug })
    const textUrl = book.downloads.txt
    if (textUrl === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury book does not expose a TXT download URL.', {
        slug: normalized.slug,
      })
    }
    const text = await this.fetchText(new URL(textUrl))
    const lines = normalizeTextLines(text)
    return {
      slug: normalized.slug,
      sourceUrl: textUrl,
      offset: normalized.offset,
      limit: normalized.limit,
      totalLines: lines.length,
      lines: lines.slice(normalized.offset, normalized.offset + normalized.limit),
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const response = await this.fetchWithRetry(url, 'application/json')

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'Wolne Lektury request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }

  private async fetchText(url: URL): Promise<string> {
    const response = await this.fetchWithRetry(url, 'text/plain; charset=utf-8, text/plain')

    const body = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'Wolne Lektury TXT request failed.', {
        status: response.status,
        response: body.slice(0, 500),
      })
    }
    if (looksLikeHtml(body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury TXT response looked like HTML instead of readable text.', {
        status: response.status,
        response: body.slice(0, 500),
      })
    }

    return body
  }

  private async fetchWithRetry(url: URL, accept: string): Promise<Response> {
    const maxAttempts = 5
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            accept,
            'user-agent': 'public-apis-tui no-auth CLI',
          },
        })
        if (!shouldRetryResponse(response) || attempt === maxAttempts) {
          return response
        }
      } catch (error) {
        lastError = error
        if (attempt === maxAttempts) {
          throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury request failed after retrying transient network errors.', {
            cause: error instanceof Error ? error.message : String(error),
          })
        }
      }
      await delay(this.retryDelayMs * attempt)
    }
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury request failed after retrying transient network errors.', {
      cause: lastError instanceof Error ? lastError.message : String(lastError),
    })
  }
}

export function normalizeWolneLekturyBooksQuery(query: WolneLekturyBooksQuery = {}): Required<Pick<WolneLekturyBooksQuery, 'limit'>> & Omit<WolneLekturyBooksQuery, 'limit'> {
  return normalizeBooksQuery(query)
}

export function normalizeWolneLekturyBookQuery(query: WolneLekturyBookQuery = {}): { slug: string } {
  return normalizeBookQuery(query)
}

export function normalizeWolneLekturyReadQuery(query: WolneLekturyReadQuery = {}): { slug: string; offset: number; limit: number } {
  return normalizeReadQuery(query)
}

function normalizeBooksQuery(query: WolneLekturyBooksQuery = {}): Required<Pick<WolneLekturyBooksQuery, 'limit'>> & Omit<WolneLekturyBooksQuery, 'limit'> {
  return {
    ...(query.query !== undefined ? { query: query.query.trim() } : {}),
    ...(query.author !== undefined ? { author: query.author.trim() } : {}),
    ...(query.genre !== undefined ? { genre: query.genre.trim() } : {}),
    ...(query.kind !== undefined ? { kind: query.kind.trim() } : {}),
    ...(query.epoch !== undefined ? { epoch: query.epoch.trim() } : {}),
    limit: clampLimit(query.limit),
  }
}

function normalizeBookQuery(query: WolneLekturyBookQuery = {}): { slug: string } {
  return { slug: query.slug?.trim() || 'studnia-i-wahadlo' }
}

function normalizeReadQuery(query: WolneLekturyReadQuery = {}): { slug: string; offset: number; limit: number } {
  return {
    slug: query.slug?.trim() || 'studnia-i-wahadlo',
    offset: clampOffset(query.offset),
    limit: clampReadLimit(query.limit),
  }
}

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return WOLNE_LEKTURY_DEFAULT_LIMIT
  }
  return Math.min(Math.trunc(value), WOLNE_LEKTURY_MAX_LIMIT)
}

function clampReadLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return WOLNE_LEKTURY_DEFAULT_READ_LIMIT
  }
  return Math.min(Math.trunc(value), WOLNE_LEKTURY_MAX_READ_LIMIT)
}

function clampOffset(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 0) {
    return 0
  }
  return Math.trunc(value)
}

function parseBookSummaries(value: unknown): WolneLekturyBookSummary[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury books response is not an array.')
  }
  return value.map(parseBookSummary)
}

function parseBookSummary(value: unknown): WolneLekturyBookSummary {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.href !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury book summary is missing title or href.')
  }
  return {
    title: value.title,
    ...(typeof value.author === 'string' ? { author: value.author } : {}),
    ...(typeof value.epoch === 'string' ? { epoch: value.epoch } : {}),
    ...(typeof value.genre === 'string' ? { genre: value.genre } : {}),
    ...(typeof value.kind === 'string' ? { kind: value.kind } : {}),
    href: value.href,
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    ...(typeof value.cover === 'string' ? { cover: absolutizeMediaUrl(value.cover) } : {}),
    ...(value.audio_length !== undefined ? { hasAudio: value.audio_length !== null } : {}),
    slug: readSlugFromHref(value.href),
  }
}

function parseBookDetail(value: unknown): WolneLekturyBookDetail {
  if (!isRecord(value) || typeof value.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Wolne Lektury book detail is missing title.')
  }
  return {
    title: value.title,
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    authors: parseNamedRefs(value.authors),
    epochs: parseNamedRefs(value.epochs),
    genres: parseNamedRefs(value.genres),
    kinds: parseNamedRefs(value.kinds),
    downloads: parseDownloads(value),
    ...(typeof value.cover === 'string' ? { cover: absolutizeMediaUrl(value.cover) } : {}),
    ...(Array.isArray(value.children) ? { childrenCount: value.children.length } : {}),
  }
}

function parseNamedRefs(value: unknown): WolneLekturyNamedRef[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).flatMap(entry => typeof entry.name === 'string'
    ? [{ name: entry.name, ...(typeof entry.slug === 'string' ? { slug: entry.slug } : {}), ...(typeof entry.href === 'string' ? { href: entry.href } : {}), ...(typeof entry.url === 'string' ? { url: entry.url } : {}) }]
    : [])
}

function parseDownloads(value: Record<string, unknown>): Record<string, string> {
  const downloads: Record<string, string> = {}
  for (const key of ['txt', 'pdf', 'epub', 'mobi', 'fb2']) {
    if (typeof value[key] === 'string') {
      downloads[key] = value[key]
    }
  }
  return downloads
}

function matchesBookFilters(book: WolneLekturyBookSummary, query: WolneLekturyBooksQuery): boolean {
  return matchesText([book.title, book.author], query.query)
    && matchesText([book.author], query.author)
    && matchesText([book.genre], query.genre)
    && matchesText([book.kind], query.kind)
    && matchesText([book.epoch], query.epoch)
}

function matchesText(values: Array<string | undefined>, needle: string | undefined): boolean {
  if (needle === undefined || needle.trim() === '') {
    return true
  }
  const normalizedNeedle = needle.trim().toLocaleLowerCase('pl')
  return values.some(value => value !== undefined && value.toLocaleLowerCase('pl').includes(normalizedNeedle))
}

function absolutizeMediaUrl(value: string): string {
  if (/^https?:\/\//u.test(value)) {
    return value
  }
  return `${WOLNE_LEKTURY_DEFAULT_BASE_URL}/media/${value.replace(/^\/+/, '')}`
}

function readSlugFromHref(value: string): string | undefined {
  const match = /\/api\/books\/([^/]+)\/?$/u.exec(value)
  return match?.[1]
}

function normalizeTextLines(value: string): string[] {
  return value.replace(/\r\n?/gu, '\n').split('\n')
}

function looksLikeHtml(value: string): boolean {
  return /^\s*<!doctype html\b/iu.test(value) || /^\s*<html\b/iu.test(value)
}

function shouldRetryResponse(response: Response): boolean {
  return response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504
}

async function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return
  }
  await new Promise(resolve => setTimeout(resolve, milliseconds))
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
