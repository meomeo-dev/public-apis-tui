import {
  URANTIA_BASE_URL,
  URANTIA_DEFAULT_LANG,
  URANTIA_DOCS_URL,
  URANTIA_LANGUAGES,
  URANTIA_OPENAPI_URL,
  URANTIA_SEARCH_TYPES,
  UrantiaClient,
  type UrantiaLanguage,
  type UrantiaPaperSummary,
  type UrantiaParagraph,
  type UrantiaSearchType,
  type UrantiaTocPart,
} from '../../infrastructure/openApis/urantiaClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const URANTIA_DEFAULT_PAPER_ID = '0'
export const URANTIA_DEFAULT_REF = '0:0.1'
export const URANTIA_DEFAULT_QUERY = 'thought adjuster'
export const URANTIA_DEFAULT_SEARCH_TYPE = 'and'
export const URANTIA_DEFAULT_LIMIT = 10
export const URANTIA_MAX_LIMIT = 50
export const URANTIA_MAX_PAGE = 500
export const URANTIA_MAX_OFFSET = 20_000
export const URANTIA_MAX_TEXT_CHARS = 600

export type UrantiaTocInput = {
  limit?: number | undefined
  offset?: number | undefined
}

export type UrantiaPaperInput = {
  paperId?: string | undefined
  lang?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type UrantiaParagraphInput = {
  ref?: string | undefined
  lang?: string | undefined
}

export type UrantiaSearchInput = {
  query?: string | undefined
  type?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  paperId?: string | undefined
  partId?: string | undefined
  lang?: string | undefined
}

type UrantiaEndpoint =
  | 'GET /toc'
  | 'GET /papers/{id}'
  | 'GET /paragraphs/{ref}'
  | 'GET /search'

type UrantiaApiMeta = {
  provider: 'urantia'
  endpoint: UrantiaEndpoint
  docsUrl: typeof URANTIA_DOCS_URL
  openApiUrl: typeof URANTIA_OPENAPI_URL
  apiUrl: typeof URANTIA_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  rateLimit: string
  cachePolicy: string
  boundary: string
  projectionPolicy: string
  excluded: string[]
}

type Pagination = {
  total: number
  returned: number
  limit: number
  offset?: number | undefined
  page?: number | undefined
  totalPages?: number | undefined
  nextOffset?: number | undefined
  nextPage?: number | undefined
  maxLimit: number
}

export type UrantiaTocQuery = {
  limit: number
  offset: number
}

export type UrantiaPaperQuery = {
  paperId: string
  lang: UrantiaLanguage
  limit: number
  offset: number
}

export type UrantiaParagraphQuery = {
  ref: string
  lang: UrantiaLanguage
}

export type UrantiaSearchQuery = {
  query: string
  type: UrantiaSearchType
  limit: number
  page: number
  paperId?: string | undefined
  partId?: string | undefined
  lang: UrantiaLanguage
}

export type UrantiaTocResult = {
  kind: 'urantia.toc'
  api: UrantiaApiMeta
  query: UrantiaTocQuery
  pagination: Pagination
  count: number
  totals: {
    parts: number
    papers: number
  }
  parts: UrantiaTocPart[]
}

export type UrantiaPaperResult = {
  kind: 'urantia.paper'
  api: UrantiaApiMeta
  query: UrantiaPaperQuery
  pagination: Pagination
  count: number
  paper: UrantiaPaperSummary
  paragraphs: UrantiaParagraph[]
}

export type UrantiaParagraphResult = {
  kind: 'urantia.paragraph'
  api: UrantiaApiMeta
  query: UrantiaParagraphQuery
  paragraph: UrantiaParagraph
  navigation: {
    previous?: string | undefined
    next?: string | undefined
  }
}

export type UrantiaSearchResult = {
  kind: 'urantia.search'
  api: UrantiaApiMeta
  query: UrantiaSearchQuery
  pagination: Pagination
  count: number
  paragraphs: UrantiaParagraph[]
}

export async function getUrantiaToc(
  input: UrantiaTocInput = {},
): Promise<UrantiaTocResult> {
  const query = normalizeUrantiaTocInput(input)
  const parts = await new UrantiaClient().toc()
  const page = paginate(parts, query)
  return {
    kind: 'urantia.toc',
    api: createApiMeta('GET /toc'),
    query,
    pagination: page.pagination,
    count: page.items.length,
    totals: {
      parts: parts.length,
      papers: parts.reduce((sum, part) => sum + part.papers.length, 0),
    },
    parts: page.items,
  }
}

export async function getUrantiaPaper(
  input: UrantiaPaperInput = {},
): Promise<UrantiaPaperResult> {
  const query = normalizeUrantiaPaperInput(input)
  const paper = await new UrantiaClient().paper(query.paperId, query.lang)
  const page = paginate(paper.paragraphs, query)
  return {
    kind: 'urantia.paper',
    api: createApiMeta('GET /papers/{id}'),
    query,
    pagination: page.pagination,
    count: page.items.length,
    paper: paper.paper,
    paragraphs: page.items,
  }
}

export async function getUrantiaParagraph(
  input: UrantiaParagraphInput = {},
): Promise<UrantiaParagraphResult> {
  const query = normalizeUrantiaParagraphInput(input)
  const response = await new UrantiaClient().paragraph(query.ref, query.lang)
  return {
    kind: 'urantia.paragraph',
    api: createApiMeta('GET /paragraphs/{ref}'),
    query,
    paragraph: response.paragraph,
    navigation: response.navigation,
  }
}

export async function searchUrantia(
  input: UrantiaSearchInput = {},
): Promise<UrantiaSearchResult> {
  const query = normalizeUrantiaSearchInput(input)
  const response = await new UrantiaClient().search(query)
  const nextPage = response.meta.page + 1 < response.meta.totalPages
    ? response.meta.page + 1
    : undefined
  return {
    kind: 'urantia.search',
    api: createApiMeta('GET /search'),
    query,
    pagination: {
      total: response.meta.total,
      returned: response.results.length,
      limit: response.meta.limit,
      page: response.meta.page,
      totalPages: response.meta.totalPages,
      ...(nextPage !== undefined ? { nextPage } : {}),
      maxLimit: URANTIA_MAX_LIMIT,
    },
    count: response.results.length,
    paragraphs: response.results,
  }
}

export function normalizeUrantiaTocInput(
  input: UrantiaTocInput = {},
): UrantiaTocQuery {
  return {
    limit: normalizeLimit(input.limit, 5, 'Urantia --limit'),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeUrantiaPaperInput(
  input: UrantiaPaperInput = {},
): UrantiaPaperQuery {
  return {
    paperId: normalizePaperId(input.paperId ?? URANTIA_DEFAULT_PAPER_ID),
    lang: normalizeLanguage(input.lang),
    limit: normalizeLimit(input.limit, URANTIA_DEFAULT_LIMIT, 'Urantia --limit'),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeUrantiaParagraphInput(
  input: UrantiaParagraphInput = {},
): UrantiaParagraphQuery {
  return {
    ref: normalizeReference(input.ref ?? URANTIA_DEFAULT_REF),
    lang: normalizeLanguage(input.lang),
  }
}

export function normalizeUrantiaSearchInput(
  input: UrantiaSearchInput = {},
): UrantiaSearchQuery {
  return {
    query: normalizeSearchQuery(input.query ?? URANTIA_DEFAULT_QUERY),
    type: normalizeSearchType(input.type),
    limit: normalizeLimit(input.limit, URANTIA_DEFAULT_LIMIT, 'Urantia --limit'),
    page: normalizePage(input.page),
    ...normalizeOptionalPaperId(input.paperId),
    ...normalizeOptionalPartId(input.partId),
    lang: normalizeLanguage(input.lang),
  }
}

function createApiMeta(endpoint: UrantiaEndpoint): UrantiaApiMeta {
  return {
    provider: 'urantia',
    endpoint,
    docsUrl: URANTIA_DOCS_URL,
    openApiUrl: URANTIA_OPENAPI_URL,
    apiUrl: URANTIA_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    rateLimit: [
      'Observed API headers reported x-ratelimit-limit 200; llms.txt',
      'documents 100 requests per minute per IP.',
    ].join(' '),
    cachePolicy: [
      'TOC, paper, and paragraph routes expose public cache headers; search',
      'uses shorter public cache headers.',
    ].join(' '),
    boundary: [
      'Read-only Urantia Papers JSON endpoints only; no auth/account routes,',
      'MCP tools, audio downloads, Open Graph image generation, embedding',
      'vector export, browser scraping, upload, delete, or arbitrary route',
      'proxying.',
    ].join(' '),
    projectionPolicy: [
      'Client projects text, references, labels, and pagination only; htmlText',
      'audio, video, and binary/media URLs are intentionally omitted.',
    ].join(' '),
    excluded: [
      'OAuth and /me account routes',
      'MCP server and AI tool-schema endpoints',
      'Audio/video binary or CDN URL surfacing',
      'Open Graph image generation',
      'Embedding vector export or paragraph vectors',
      'Semantic search in this initial provider contract',
    ],
  }
}

function paginate<T>(
  items: T[],
  query: { limit: number; offset: number },
): { items: T[]; pagination: Pagination } {
  const sliced = items.slice(query.offset, query.offset + query.limit)
  const nextOffset = query.offset + query.limit < items.length
    ? query.offset + query.limit
    : undefined
  return {
    items: sliced,
    pagination: {
      total: items.length,
      returned: sliced.length,
      limit: query.limit,
      offset: query.offset,
      ...(nextOffset !== undefined ? { nextOffset } : {}),
      maxLimit: URANTIA_MAX_LIMIT,
    },
  }
}

function normalizeLanguage(value: string | undefined): UrantiaLanguage {
  const lang = (value ?? URANTIA_DEFAULT_LANG).trim().toLowerCase()
  if (URANTIA_LANGUAGES.includes(lang as UrantiaLanguage)) {
    return lang as UrantiaLanguage
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Urantia --lang must be one of ${URANTIA_LANGUAGES.join(', ')}.`,
    { lang: value },
  )
}

function normalizeSearchType(value: string | undefined): UrantiaSearchType {
  const type = (value ?? URANTIA_DEFAULT_SEARCH_TYPE).trim().toLowerCase()
  if (URANTIA_SEARCH_TYPES.includes(type as UrantiaSearchType)) {
    return type as UrantiaSearchType
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Urantia --type must be one of ${URANTIA_SEARCH_TYPES.join(', ')}.`,
    { type: value },
  )
}

function normalizeSearchQuery(value: string): string {
  const text = normalizeBoundedText(value, 'Urantia --query', 1, 500)
  if (hasUnsafeControlCharacter(text)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Urantia --query must not include control characters.',
      { query: value },
    )
  }
  return text
}

function normalizePaperId(value: string): string {
  const text = normalizeBoundedText(value, 'Urantia --paper-id', 1, 3)
  const parsed = Number(text)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 196) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Urantia --paper-id must be an integer string from 0 to 196.',
      { paperId: value },
    )
  }
  return String(parsed)
}

function normalizeOptionalPaperId(
  value: string | undefined,
): { paperId?: string | undefined } {
  return value === undefined ? {} : { paperId: normalizePaperId(value) }
}

function normalizeOptionalPartId(
  value: string | undefined,
): { partId?: string | undefined } {
  if (value === undefined) return {}
  const text = normalizeBoundedText(value, 'Urantia --part-id', 1, 1)
  const parsed = Number(text)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Urantia --part-id must be an integer string from 0 to 4.',
      { partId: value },
    )
  }
  return { partId: String(parsed) }
}

function normalizeReference(value: string): string {
  const text = normalizeBoundedText(value, 'Urantia --ref', 3, 24)
  if (!/^(?:[0-9]+:[0-9]+\.[0-9]+|[0-9]+\.[0-9]+\.[0-9]+)$/u.test(text)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Urantia --ref must use a documented paragraph reference like',
        '0:0.1 or 1:2.0.1.',
      ].join(' '),
      { ref: value },
    )
  }
  return text
}

function normalizeLimit(
  value: number | undefined,
  defaultValue: number,
  label: string,
): number {
  const limit = value ?? defaultValue
  if (!Number.isInteger(limit) || limit < 1 || limit > URANTIA_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be an integer from 1 to ${URANTIA_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (!Number.isInteger(offset) || offset < 0 || offset > URANTIA_MAX_OFFSET) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Urantia --offset must be an integer from 0 to ${URANTIA_MAX_OFFSET}.`,
      { offset: value },
    )
  }
  return offset
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 0
  if (!Number.isInteger(page) || page < 0 || page > URANTIA_MAX_PAGE) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Urantia --page must be an integer from 0 to ${URANTIA_MAX_PAGE}.`,
      { page: value },
    )
  }
  return page
}

function normalizeBoundedText(
  value: string,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  const text = value.trim().replace(/\s+/gu, ' ')
  if (text.length < minLength || text.length > maxLength) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be between ${minLength} and ${maxLength} characters.`,
      { value },
    )
  }
  return text
}

function hasUnsafeControlCharacter(value: string): boolean {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127)
  })
}
