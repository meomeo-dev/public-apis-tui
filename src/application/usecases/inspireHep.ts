import {
  InspireHepClient,
  type InspireHepRateLimit,
  type InspireHepRecord,
  type InspireHepSearchQuery,
} from '../../infrastructure/openApis/inspireHepClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const INSPIRE_HEP_DEFAULT_QUERY = 'higgs'
export const INSPIRE_HEP_DEFAULT_LIMIT = 10
export const INSPIRE_HEP_MAX_LIMIT = 50
export const INSPIRE_HEP_MAX_PAGE = 400
export const INSPIRE_HEP_DEFAULT_FIELDS = [
  'titles',
  'authors.full_name',
  'publication_info',
  'preprint_date',
  'earliest_date',
  'arxiv_eprints',
  'dois',
  'citation_count',
  'citation_count_without_self_citations',
  'document_type',
  'primary_arxiv_category',
  'inspire_categories',
  'abstracts',
  'control_number',
  'texkeys',
].join(',')

export type InspireHepSearchInput = {
  query?: string | undefined
  sort?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  abstractLength?: number | undefined
}

export type InspireHepRecordInput = {
  recid?: number | undefined
  abstractLength?: number | undefined
}

type InspireHepApiMeta = {
  provider: 'inspirehep'
  endpoint: 'GET /api/literature' | 'GET /api/literature/{recid}'
  docsUrl: 'https://github.com/inspirehep/rest-api-doc'
  apiUrl: 'https://inspirehep.net/api'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  rateLimitPolicy: '15 requests per 5 seconds per IP.'
  terms: string
  excluded: string[]
  limitCap: number
  pageCap: number
}

export type InspireHepPaperSummary = {
  recid: number
  title: string
  authors: string[]
  publication?: string | undefined
  earliestDate?: string | undefined
  preprintDate?: string | undefined
  arxivIds: string[]
  dois: string[]
  citationCount?: number | undefined
  citationCountWithoutSelfCitations?: number | undefined
  documentType?: string | undefined
  primaryArxivCategory?: string | undefined
  inspireCategories: string[]
  texkeys: string[]
  abstract?: string | undefined
  links: {
    record?: string | undefined
    json?: string | undefined
    citations?: string | undefined
  }
}

export type InspireHepSearchResult = {
  kind: 'inspirehep.search'
  api: InspireHepApiMeta
  query: InspireHepSearchQuery & {
    abstractLength: number
  }
  pagination: {
    total: number
    returned: number
    size: number
    page: number
    nextPage?: number | undefined
    maxLimit: number
    maxPage: number
  }
  count: number
  rateLimit: InspireHepRateLimit
  papers: InspireHepPaperSummary[]
}

export type InspireHepRecordResult = {
  kind: 'inspirehep.record'
  api: InspireHepApiMeta
  query: {
    recid: number
    abstractLength: number
  }
  rateLimit: InspireHepRateLimit
  paper: InspireHepPaperSummary
}

export async function searchInspireHep(
  input: InspireHepSearchInput = {},
): Promise<InspireHepSearchResult> {
  const query = normalizeInspireHepSearchInput(input)
  const page = await new InspireHepClient().searchLiterature(query)
  const papers = page.hits.map(record => (
    projectPaper(record, query.abstractLength)
  ))
  const nextPage = query.page * query.size < page.total ? query.page + 1 : undefined
  return {
    kind: 'inspirehep.search',
    api: createApiMeta('GET /api/literature'),
    query,
    pagination: {
      total: page.total,
      returned: papers.length,
      size: query.size,
      page: query.page,
      ...(nextPage !== undefined && nextPage <= INSPIRE_HEP_MAX_PAGE
        ? { nextPage }
        : {}),
      maxLimit: INSPIRE_HEP_MAX_LIMIT,
      maxPage: INSPIRE_HEP_MAX_PAGE,
    },
    count: papers.length,
    rateLimit: page.rateLimit,
    papers,
  }
}

export async function getInspireHepRecord(
  input: InspireHepRecordInput = {},
): Promise<InspireHepRecordResult> {
  const query = normalizeInspireHepRecordInput(input)
  const response = await new InspireHepClient().getLiteratureRecord(query.recid)
  return {
    kind: 'inspirehep.record',
    api: createApiMeta('GET /api/literature/{recid}'),
    query,
    rateLimit: response.rateLimit,
    paper: projectPaper(response.record, query.abstractLength),
  }
}

export function normalizeInspireHepSearchInput(
  input: InspireHepSearchInput = {},
): InspireHepSearchResult['query'] {
  return {
    q: normalizeQuery(input.query),
    sort: normalizeSort(input.sort),
    size: normalizeLimit(input.limit),
    page: normalizePage(input.page),
    fields: INSPIRE_HEP_DEFAULT_FIELDS,
    abstractLength: normalizeAbstractLength(input.abstractLength),
  }
}

export function normalizeInspireHepRecordInput(
  input: InspireHepRecordInput = {},
): InspireHepRecordResult['query'] {
  return {
    recid: normalizeRecid(input.recid),
    abstractLength: normalizeAbstractLength(input.abstractLength),
  }
}

function createApiMeta(endpoint: InspireHepApiMeta['endpoint']): InspireHepApiMeta {
  return {
    provider: 'inspirehep',
    endpoint,
    docsUrl: 'https://github.com/inspirehep/rest-api-doc',
    apiUrl: 'https://inspirehep.net/api',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'Read-only literature GET JSON only; POST bibliography generation,',
      'BibTeX/LaTeX/CV rendering, file downloads, arbitrary record-type',
      'proxying, author email harvesting, and browser scraping are excluded.',
    ].join(' '),
    rateLimitPolicy: '15 requests per 5 seconds per IP.',
    terms: 'Most metadata is CC0, with field restrictions and no bulk email collection.',
    excluded: [
      'POST /api/bibliography-generator',
      'format=bibtex / latex-eu / latex-us / cv',
      'binary or generated bibliography downloads',
      'arbitrary record-type proxying',
      'author email harvesting',
      'browser clickstream or HTML scraping',
    ],
    limitCap: INSPIRE_HEP_MAX_LIMIT,
    pageCap: INSPIRE_HEP_MAX_PAGE,
  }
}

function projectPaper(
  record: InspireHepRecord,
  abstractLength: number,
): InspireHepPaperSummary {
  const metadata = record.metadata
  const recid = readNumber(metadata, 'control_number') ?? Number(record.id)
  return {
    recid,
    title: readFirstTitle(metadata) ?? '(untitled INSPIRE record)',
    authors: readAuthors(metadata),
    publication: readPublication(metadata),
    earliestDate: readString(metadata, 'earliest_date'),
    preprintDate: readString(metadata, 'preprint_date'),
    arxivIds: readValueArray(metadata, 'arxiv_eprints'),
    dois: readValueArray(metadata, 'dois'),
    citationCount: readNumber(metadata, 'citation_count'),
    citationCountWithoutSelfCitations: readNumber(
      metadata,
      'citation_count_without_self_citations',
    ),
    documentType: readFirstString(metadata, 'document_type'),
    primaryArxivCategory: readString(metadata, 'primary_arxiv_category'),
    inspireCategories: readTermArray(metadata, 'inspire_categories'),
    texkeys: readStringArray(metadata, 'texkeys'),
    abstract: truncateText(readFirstAbstract(metadata), abstractLength),
    links: {
      record: `https://inspirehep.net/literature/${String(recid)}`,
      json: record.links.json,
      citations: record.links.citations,
    },
  }
}

function normalizeQuery(value: string | undefined): string {
  const query = value?.trim() || INSPIRE_HEP_DEFAULT_QUERY
  if (query.length > 240) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'INSPIRE HEP --query must be 240 characters or fewer.',
      { query: value },
    )
  }
  return query
}

function normalizeSort(
  value: string | undefined,
): 'mostrecent' | 'mostcited' | undefined {
  const sort = value?.trim()
  if (sort === undefined || sort === '') return undefined
  if (sort === 'mostrecent' || sort === 'mostcited') return sort
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'INSPIRE HEP --sort must be mostrecent or mostcited.',
    { sort: value },
  )
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? INSPIRE_HEP_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > INSPIRE_HEP_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `INSPIRE HEP --limit must be an integer from 1 to ${INSPIRE_HEP_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1 || page > INSPIRE_HEP_MAX_PAGE) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `INSPIRE HEP --page must be an integer from 1 to ${INSPIRE_HEP_MAX_PAGE}.`,
      { page: value },
    )
  }
  return page
}

function normalizeRecid(value: number | undefined): number {
  const recid = value ?? 4328
  if (!Number.isInteger(recid) || recid < 1 || recid > 99_999_999) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'INSPIRE HEP --recid must be a positive integer record id.',
      { recid: value },
    )
  }
  return recid
}

function normalizeAbstractLength(value: number | undefined): number {
  const length = value ?? 500
  if (!Number.isInteger(length) || length < 0 || length > 2000) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'INSPIRE HEP --abstract-length must be an integer from 0 to 2000.',
      { abstractLength: value },
    )
  }
  return length
}

function readFirstTitle(record: Record<string, unknown>): string | undefined {
  const titles = record.titles
  if (!Array.isArray(titles)) return undefined
  return titles.filter(isRecord).map(title => readString(title, 'title'))
    .find((title): title is string => title !== undefined)
}

function readAuthors(record: Record<string, unknown>): string[] {
  const authors = record.authors
  if (!Array.isArray(authors)) return []
  return authors.filter(isRecord).map(author => readString(author, 'full_name'))
    .filter((name): name is string => name !== undefined)
}

function readPublication(record: Record<string, unknown>): string | undefined {
  const infos = record.publication_info
  if (!Array.isArray(infos)) return undefined
  const info = infos.find(isRecord)
  if (info === undefined) return undefined
  const journal = readString(info, 'journal_title')
  const volume = readString(info, 'journal_volume')
  const year = readNumber(info, 'year')?.toString()
  const pages = [
    readString(info, 'page_start'),
    readString(info, 'page_end'),
  ].filter((part): part is string => part !== undefined)
  const journalParts = [journal, volume].filter(
    (part): part is string => part !== undefined,
  )
  if (journalParts.length > 0 || pages.length > 0 || year !== undefined) {
    return [
      journalParts.join(' '),
      pages.join('-'),
      year,
    ].filter(part => part !== undefined && part !== '').join(' · ')
  }
  return readString(info, 'pubinfo_freetext')
}

function readFirstAbstract(record: Record<string, unknown>): string | undefined {
  const abstracts = record.abstracts
  if (!Array.isArray(abstracts)) return undefined
  return abstracts.filter(isRecord).map(item => readString(item, 'value'))
    .find((value): value is string => value !== undefined)
}

function readValueArray(record: Record<string, unknown>, key: string): string[] {
  const values = record[key]
  if (!Array.isArray(values)) return []
  return values.filter(isRecord).map(item => readString(item, 'value'))
    .filter((value): value is string => value !== undefined)
}

function readTermArray(record: Record<string, unknown>, key: string): string[] {
  const values = record[key]
  if (!Array.isArray(values)) return []
  return values.filter(isRecord).map(item => readString(item, 'term'))
    .filter((value): value is string => value !== undefined)
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const values = record[key]
  if (!Array.isArray(values)) return []
  return values.filter((value): value is string => (
    typeof value === 'string' && value.trim() !== ''
  ))
}

function readFirstString(record: Record<string, unknown>, key: string): string | undefined {
  const values = record[key]
  if (Array.isArray(values)) {
    return values.find((value): value is string => (
      typeof value === 'string' && value.trim() !== ''
    ))
  }
  return readString(record, key)
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function truncateText(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined || maxLength === 0) return undefined
  const text = value.replace(/\s+/gu, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
