import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FOURCHAN_DEFAULT_BASE_URL = 'https://a.4cdn.org'
export const FOURCHAN_DEFAULT_BOARD = 'g'
export const FOURCHAN_DEFAULT_LIMIT = 150
export const FOURCHAN_MAX_LIMIT = 150

export type FourChanBoardsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type FourChanCatalogInput = {
  board?: string | undefined
  limit?: number | undefined
}

export type NormalizedFourChanBoardsInput = {
  query?: string | undefined
  limit: number
}

export type NormalizedFourChanCatalogInput = {
  board: string
  limit: number
}

export type FourChanBoard = {
  board: string
  title: string
  pages?: number | undefined
  perPage?: number | undefined
  metaDescription?: string | undefined
  isArchived?: boolean | undefined
  maxCommentChars?: number | undefined
  bumpLimit?: number | undefined
  imageLimit?: number | undefined
}

export type FourChanThreadPreview = {
  no: number
  subject?: string | undefined
  comment?: string | undefined
  name?: string | undefined
  now?: string | undefined
  time?: number | undefined
  replies?: number | undefined
  images?: number | undefined
  sticky?: boolean | undefined
  closed?: boolean | undefined
  lastModified?: number | undefined
  semanticUrl?: string | undefined
  filename?: string | undefined
  ext?: string | undefined
  omittedPosts?: number | undefined
  omittedImages?: number | undefined
  url: string
}

export type FourChanCatalogEnvelope = {
  board: string
  pageCount: number
  totalThreads: number
  threads: FourChanThreadPreview[]
}

export class FourChanClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.baseUrl = (options.baseUrl ?? FOURCHAN_DEFAULT_BASE_URL).replace(/\/$/u, '')
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async boards(): Promise<FourChanBoard[]> {
    const parsed = await this.fetchJson(`${this.baseUrl}/boards.json`)
    if (!isRecord(parsed) || !Array.isArray(parsed.boards)) {
      throw new RuntimeFailure('OPEN_API_FAILED', '4chan boards response was missing boards[].')
    }
    return parsed.boards.map(parseBoard)
  }

  async catalog(input: NormalizedFourChanCatalogInput): Promise<FourChanCatalogEnvelope> {
    const parsed = await this.fetchJson(`${this.baseUrl}/${input.board}/catalog.json`)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', '4chan catalog response must be a page array.')
    }
    const threads = parsed.flatMap(parseCatalogPage(input.board))
    return {
      board: input.board,
      pageCount: parsed.length,
      totalThreads: threads.length,
      threads: threads.slice(0, input.limit),
    }
  }

  private async fetchJson(url: string): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui no-auth CLI' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `4chan request failed: ${String(error)}`, { provider: '4chan', endpoint: url })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `4chan returned a non-JSON response: ${String(error)}`, { provider: '4chan', endpoint: url, status: response.status })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `4chan request failed with HTTP ${response.status}.`, {
        provider: '4chan',
        endpoint: url,
        status: response.status,
      })
    }

    return parsed
  }
}

export function normalizeFourChanBoardsInput(input: FourChanBoardsInput = {}): NormalizedFourChanBoardsInput {
  const query = input.query?.trim().toLowerCase()
  return {
    ...(query !== undefined && query !== '' ? { query } : {}),
    limit: normalizeInteger(input.limit ?? FOURCHAN_DEFAULT_LIMIT, '--limit', 1, FOURCHAN_MAX_LIMIT),
  }
}

export function normalizeFourChanCatalogInput(input: FourChanCatalogInput = {}): NormalizedFourChanCatalogInput {
  return {
    board: normalizeBoard(input.board ?? FOURCHAN_DEFAULT_BOARD),
    limit: normalizeInteger(input.limit ?? FOURCHAN_DEFAULT_LIMIT, '--limit', 1, FOURCHAN_MAX_LIMIT),
  }
}

function parseBoard(value: unknown): FourChanBoard {
  if (!isRecord(value) || typeof value.board !== 'string' || typeof value.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', '4chan board rows must include board and title.')
  }
  return {
    board: value.board,
    title: value.title,
    pages: optionalNumber(value.pages),
    perPage: optionalNumber(value.per_page),
    metaDescription: normalizeHtmlText(value.meta_description),
    isArchived: value.is_archived === 1 || value.is_archived === true,
    maxCommentChars: optionalNumber(value.max_comment_chars),
    bumpLimit: optionalNumber(value.bump_limit),
    imageLimit: optionalNumber(value.image_limit),
  }
}

function parseCatalogPage(board: string): (value: unknown) => FourChanThreadPreview[] {
  return value => {
    if (!isRecord(value) || !Array.isArray(value.threads)) {
      throw new RuntimeFailure('OPEN_API_FAILED', '4chan catalog pages must include threads[].')
    }
    return value.threads.map(thread => parseThread(board, thread))
  }
}

function parseThread(board: string, value: unknown): FourChanThreadPreview {
  if (!isRecord(value) || typeof value.no !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', '4chan thread rows must include numeric no.')
  }
  return {
    no: value.no,
    subject: normalizeHtmlText(value.sub),
    comment: normalizeHtmlText(value.com),
    name: optionalString(value.name),
    now: optionalString(value.now),
    time: optionalNumber(value.time),
    replies: optionalNumber(value.replies),
    images: optionalNumber(value.images),
    sticky: value.sticky === 1 || value.sticky === true,
    closed: value.closed === 1 || value.closed === true,
    lastModified: optionalNumber(value.last_modified),
    semanticUrl: optionalString(value.semantic_url),
    filename: optionalString(value.filename),
    ext: optionalString(value.ext),
    omittedPosts: optionalNumber(value.omitted_posts),
    omittedImages: optionalNumber(value.omitted_images),
    url: `https://boards.4chan.org/${board}/thread/${value.no}`,
  }
}

function normalizeBoard(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/^\/|\/$/gu, '')
  if (!/^[a-z0-9]{1,16}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--board must be a 4chan board id such as g or biz.')
  }
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function normalizeHtmlText(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const text = value
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<[^>]*>/gu, '')
    .replace(/&quot;/gu, '"')
    .replace(/&#039;/gu, "'")
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/\r/gu, '')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
  return text === '' ? undefined : text
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
