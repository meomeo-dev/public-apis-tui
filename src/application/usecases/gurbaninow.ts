import {
  GURBANI_NOW_DEFAULT_BANI_ID,
  GURBANI_NOW_DEFAULT_LINE_LIMIT,
  GURBANI_NOW_DEFAULT_RESULTS,
  GURBANI_NOW_DEFAULT_SEARCH_QUERY,
  GURBANI_NOW_DEFAULT_SEARCH_TYPE,
  GURBANI_NOW_DEFAULT_SOURCE,
  GURBANI_NOW_MAX_LINE_LIMIT,
  GURBANI_NOW_MAX_RESULTS,
  GURBANI_NOW_MAX_SKIP,
  GurbaniNowClient,
  type GurbaniNowBaniInfo,
  type GurbaniNowBaniQuery,
  type GurbaniNowLine,
  type GurbaniNowName,
  type GurbaniNowRaag,
  type GurbaniNowSearchQuery,
  type GurbaniNowShabadSummary,
  type GurbaniNowSource,
} from '../../infrastructure/openApis/gurbaninowClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type GurbaniNowSearchInput = {
  query?: string | undefined
  source?: number | undefined
  searchType?: number | undefined
  writer?: number | undefined
  raag?: number | undefined
  ang?: number | undefined
  results?: number | undefined
  skip?: number | undefined
}

export type GurbaniNowBanisInput = {
  limit?: number | undefined
}

export type GurbaniNowBaniInput = {
  id?: number | undefined
  offset?: number | undefined
  limit?: number | undefined
}

type GurbaniNowApiMeta = {
  provider: 'gurbaninow'
  endpoint: string
  docsUrl: 'https://github.com/gurbaninow/api-public/wiki/API-Documentation'
  apiUrl: 'https://api.gurbaninow.com/v2'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  maintenance: string
  license: string
  boundary: string
  resultsCap: number
  lineLimitCap: number
}

export type GurbaniNowSearchResult = {
  kind: 'gurbaninow.search'
  api: GurbaniNowApiMeta
  query: GurbaniNowSearchQuery
  pagination: {
    total: number
    returned: number
    results: number
    skip: number
    nextSkip?: number | undefined
    maxResults: number
    maxSkip: number
  }
  count: number
  shabads: Array<Record<string, unknown>>
}

export type GurbaniNowBanisResult = {
  kind: 'gurbaninow.banis'
  api: GurbaniNowApiMeta
  query: { limit: number }
  count: number
  total: number
  banis: Array<Record<string, unknown>>
}

export type GurbaniNowBaniResult = {
  kind: 'gurbaninow.bani'
  api: GurbaniNowApiMeta
  query: GurbaniNowBaniQuery
  bani: Record<string, unknown>
  pagination: {
    total: number
    returned: number
    offset: number
    limit: number
    nextOffset?: number | undefined
    maxLimit: number
  }
  count: number
  lines: Array<Record<string, unknown>>
}

export async function searchGurbaniNow(
  input: GurbaniNowSearchInput = {},
): Promise<GurbaniNowSearchResult> {
  const query = normalizeGurbaniNowSearchInput(input)
  const page = await new GurbaniNowClient().search(query)
  const shabads = page.shabads.map(projectShabad)
  return {
    kind: 'gurbaninow.search',
    api: createApiMeta('GET /v2/search/{query}'),
    query,
    pagination: createSearchPagination({
      total: page.count,
      returned: shabads.length,
      results: query.results,
      skip: query.skip,
    }),
    count: shabads.length,
    shabads,
  }
}

export async function listGurbaniNowBanis(
  input: GurbaniNowBanisInput = {},
): Promise<GurbaniNowBanisResult> {
  const query = normalizeGurbaniNowBanisInput(input)
  const banis = await new GurbaniNowClient().listBanis()
  const projected = banis.slice(0, query.limit).map(projectName)
  return {
    kind: 'gurbaninow.banis',
    api: createApiMeta('GET /v2/banis'),
    query,
    count: projected.length,
    total: banis.length,
    banis: projected,
  }
}

export async function getGurbaniNowBani(
  input: GurbaniNowBaniInput = {},
): Promise<GurbaniNowBaniResult> {
  const query = normalizeGurbaniNowBaniInput(input)
  const response = await new GurbaniNowClient().getBani(query)
  const total = response.baniinfo.count ?? response.bani.length
  const visibleLines = response.bani.slice(query.offset, query.offset + query.limit)
  const lines = visibleLines.map(projectLine)
  return {
    kind: 'gurbaninow.bani',
    api: createApiMeta('GET /v2/banis/{id}'),
    query,
    bani: projectBaniInfo(response.baniinfo),
    pagination: createLinePagination({
      total,
      returned: lines.length,
      offset: query.offset,
      limit: query.limit,
    }),
    count: lines.length,
    lines,
  }
}

export function normalizeGurbaniNowSearchInput(
  input: GurbaniNowSearchInput = {},
): GurbaniNowSearchQuery {
  return {
    query: normalizeText(input.query, 'query', GURBANI_NOW_DEFAULT_SEARCH_QUERY),
    source: normalizeOptionalPositiveInteger(input.source, 'source'),
    searchType: normalizeSearchType(input.searchType),
    writer: normalizeOptionalPositiveInteger(input.writer, 'writer'),
    raag: normalizeOptionalPositiveInteger(input.raag, 'raag'),
    ang: normalizeOptionalPositiveInteger(input.ang, 'ang'),
    results: normalizeResults(input.results),
    skip: normalizeSkip(input.skip),
  }
}

export function normalizeGurbaniNowBanisInput(
  input: GurbaniNowBanisInput = {},
): { limit: number } {
  return { limit: normalizeLineLimit(input.limit, 'limit') }
}

export function normalizeGurbaniNowBaniInput(
  input: GurbaniNowBaniInput = {},
): GurbaniNowBaniQuery {
  return {
    id: normalizePositiveInteger(input.id, 'id', GURBANI_NOW_DEFAULT_BANI_ID),
    offset: normalizeOffset(input.offset),
    limit: normalizeLineLimit(input.limit, 'limit'),
  }
}

function createApiMeta(endpoint: string): GurbaniNowApiMeta {
  return {
    provider: 'gurbaninow',
    endpoint,
    docsUrl: 'https://github.com/gurbaninow/api-public/wiki/API-Documentation',
    apiUrl: 'https://api.gurbaninow.com/v2',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    maintenance: 'Official repository is deprecated and unsupported.',
    license: 'AGPL-3.0 README license notice.',
    boundary: (
      'Read-only documented JSON endpoints only; deprecated converter, ' +
      'random redirect, browser scraping, and mutating behavior are excluded.'
    ),
    resultsCap: GURBANI_NOW_MAX_RESULTS,
    lineLimitCap: GURBANI_NOW_MAX_LINE_LIMIT,
  }
}

function createSearchPagination(input: {
  total: number
  returned: number
  results: number
  skip: number
}): GurbaniNowSearchResult['pagination'] {
  const nextSkip = input.skip + input.returned
  return {
    total: input.total,
    returned: input.returned,
    results: input.results,
    skip: input.skip,
    ...(input.returned > 0 && nextSkip < input.total ? { nextSkip } : {}),
    maxResults: GURBANI_NOW_MAX_RESULTS,
    maxSkip: GURBANI_NOW_MAX_SKIP,
  }
}

function createLinePagination(input: {
  total: number
  returned: number
  offset: number
  limit: number
}): GurbaniNowBaniResult['pagination'] {
  const nextOffset = input.offset + input.returned
  return {
    total: input.total,
    returned: input.returned,
    offset: input.offset,
    limit: input.limit,
    ...(input.returned > 0 && nextOffset < input.total ? { nextOffset } : {}),
    maxLimit: GURBANI_NOW_MAX_LINE_LIMIT,
  }
}

function projectShabad(value: GurbaniNowShabadSummary): Record<string, unknown> {
  return omitUndefined({
    id: value.id,
    shabadid: value.shabadid,
    type: value.type,
    line: value.line !== undefined ? projectLine(value.line) : undefined,
    source: value.source !== undefined ? projectSource(value.source) : undefined,
    writer: value.writer !== undefined ? projectName(value.writer) : undefined,
    raag: value.raag !== undefined ? projectRaag(value.raag) : undefined,
    pageno: value.pageno,
    lineno: value.lineno,
    firstletters: value.firstletters,
  })
}

function projectBaniInfo(value: GurbaniNowBaniInfo): Record<string, unknown> {
  return omitUndefined({
    ...projectName(value),
    pageno: value.pageno,
    source: value.source !== undefined ? projectSource(value.source) : undefined,
    writer: value.writer !== undefined ? projectName(value.writer) : undefined,
    raag: value.raag !== undefined ? projectRaag(value.raag) : undefined,
    count: value.count,
  })
}

function projectLine(value: GurbaniNowLine): Record<string, unknown> {
  return omitUndefined({
    id: value.id,
    type: value.type,
    shabadid: value.shabadid,
    gurmukhi: value.gurmukhi,
    larivaar: value.larivaar,
    translation: value.translation,
    transliteration: value.transliteration,
    pageno: value.pageno,
    lineno: value.lineno ?? value.linenum,
    firstletters: value.firstletters,
  })
}

function projectSource(value: GurbaniNowSource): Record<string, unknown> {
  return omitUndefined({
    ...projectName(value),
    length: value.length,
    pageName: value.pageName !== undefined ? projectName(value.pageName) : undefined,
  })
}

function projectRaag(value: GurbaniNowRaag): Record<string, unknown> {
  return omitUndefined({
    ...projectName(value),
    startang: value.startang,
    endang: value.endang,
    raagwithpage: value.raagwithpage,
  })
}

function projectName(value: GurbaniNowName): Record<string, unknown> {
  return omitUndefined({
    id: value.id,
    akhar: value.akhar,
    unicode: value.unicode,
    english: value.english,
  })
}

function normalizeText(
  value: string | undefined,
  label: string,
  defaultValue: string,
): string {
  const text = value?.trim() || defaultValue
  if (text.length > 160) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GurbaniNow --${label} must be 160 characters or fewer.`,
      { [label]: value },
    )
  }
  return text
}

function normalizeSearchType(value: number | undefined): number {
  const searchType = value ?? GURBANI_NOW_DEFAULT_SEARCH_TYPE
  const allowed = new Set([0, 1, 2, 4, 6])
  if (!Number.isInteger(searchType) || !allowed.has(searchType)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'GurbaniNow --search-type must be one of 0, 1, 2, 4, or 6.',
      { searchType: value },
    )
  }
  return searchType
}

function normalizeResults(value: number | undefined): number {
  const results = value ?? GURBANI_NOW_DEFAULT_RESULTS
  if (!Number.isInteger(results) || results < 1 || results > GURBANI_NOW_MAX_RESULTS) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GurbaniNow --results must be an integer from 1 to ${GURBANI_NOW_MAX_RESULTS}.`,
      { results: value },
    )
  }
  return results
}

function normalizeLineLimit(value: number | undefined, label: string): number {
  const limit = value ?? GURBANI_NOW_DEFAULT_LINE_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > GURBANI_NOW_MAX_LINE_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      (
        `GurbaniNow --${label} must be an integer from 1 to ` +
        `${GURBANI_NOW_MAX_LINE_LIMIT}.`
      ),
      { [label]: value },
    )
  }
  return limit
}

function normalizeSkip(value: number | undefined): number {
  const skip = value ?? 0
  if (!Number.isInteger(skip) || skip < 0 || skip > GURBANI_NOW_MAX_SKIP) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GurbaniNow --skip must be an integer from 0 to ${GURBANI_NOW_MAX_SKIP}.`,
      { skip: value },
    )
  }
  return skip
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'GurbaniNow --offset must be a non-negative integer.',
      { offset: value },
    )
  }
  return offset
}

function normalizePositiveInteger(
  value: number | undefined,
  label: string,
  defaultValue: number,
): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `GurbaniNow --${label} must be a positive integer.`,
      { [label]: value },
    )
  }
  return normalized
}

function normalizeOptionalPositiveInteger(
  value: number | undefined,
  label: string,
): number | undefined {
  if (value === undefined && label === 'source') {
    return GURBANI_NOW_DEFAULT_SOURCE
  }
  if (value === undefined) return undefined
  return normalizePositiveInteger(value, label, value)
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
