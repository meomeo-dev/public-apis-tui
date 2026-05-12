import {
  ArxivClient,
  type ArxivEntry,
} from '../../infrastructure/openApis/arxivClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type ArxivSearchInput = {
  query?: string | undefined
  category?: string | undefined
  start?: number | undefined
  maxResults?: number | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
  summaryLength?: number | undefined
}

export type ArxivPaperInput = {
  id?: string | undefined
  summaryLength?: number | undefined
}

export type ArxivApiMeta = {
  provider: 'arxiv'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /api/query'
  docsUrl: 'https://info.arxiv.org/help/api/user-manual.html'
  apiUrl: 'https://export.arxiv.org/api/query'
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS Atom XML projected to JSON'
  rateLimitPolicy: 'Official docs request a 3 second delay between repeated calls.'
  documentedMaximumResults: 30000
  documentedSliceMaximum: 2000
}

export type ArxivPaperSummary = {
  arxivId: string
  title: string
  summary: string
  published: string
  updated: string
  authors: string[]
  categories: string[]
  primaryCategory?: string | undefined
  comment?: string | undefined
  journalRef?: string | undefined
  doi?: string | undefined
  absUrl?: string | undefined
  pdfUrl?: string | undefined
}

export type ArxivSearchResult = {
  kind: 'arxiv.search'
  api: ArxivApiMeta
  query: {
    searchQuery: string
    category?: string | undefined
    start: number
    maxResults: number
    sortBy: 'relevance' | 'lastUpdatedDate' | 'submittedDate'
    sortOrder: 'ascending' | 'descending'
    summaryLength: number
  }
  pagination: {
    totalResults: number
    startIndex: number
    itemsPerPage: number
    nextStart: number
    hasMore: boolean
  }
  count: number
  papers: ArxivPaperSummary[]
}

export type ArxivPaperResult = {
  kind: 'arxiv.paper'
  api: ArxivApiMeta
  query: {
    id: string
    summaryLength: number
  }
  found: boolean
  paper?: ArxivPaperSummary | undefined
}

export async function searchArxiv(
  input: ArxivSearchInput = {},
): Promise<ArxivSearchResult> {
  const query = normalizeSearchInput(input)
  const client = new ArxivClient()
  const feed = await client.query({
    searchQuery: buildSearchQuery(query.searchQuery, query.category),
    start: query.start,
    maxResults: query.maxResults,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  })
  const papers = feed.entries.map(entry => toPaperSummary(entry, query.summaryLength))
  const nextStart = feed.startIndex + feed.itemsPerPage
  return {
    kind: 'arxiv.search',
    api: createApiMeta(),
    query,
    pagination: {
      totalResults: feed.totalResults,
      startIndex: feed.startIndex,
      itemsPerPage: feed.itemsPerPage,
      nextStart,
      hasMore: nextStart < feed.totalResults,
    },
    count: papers.length,
    papers,
  }
}

export async function getArxivPaper(
  input: ArxivPaperInput = {},
): Promise<ArxivPaperResult> {
  const query = normalizePaperInput(input)
  const client = new ArxivClient()
  const feed = await client.query({
    idList: [query.id],
    start: 0,
    maxResults: 1,
  })
  const paper = feed.entries[0] === undefined
    ? undefined
    : toPaperSummary(feed.entries[0], query.summaryLength)
  return {
    kind: 'arxiv.paper',
    api: createApiMeta(),
    query,
    found: paper !== undefined,
    ...(paper !== undefined ? { paper } : {}),
  }
}

function normalizeSearchInput(input: ArxivSearchInput): ArxivSearchResult['query'] {
  return {
    searchQuery: normalizeSearchQuery(input.query),
    category: normalizeCategory(input.category),
    start: normalizeStart(input.start),
    maxResults: normalizeMaxResults(input.maxResults),
    sortBy: normalizeSortBy(input.sortBy),
    sortOrder: normalizeSortOrder(input.sortOrder),
    summaryLength: normalizeSummaryLength(input.summaryLength),
  }
}

function normalizePaperInput(input: ArxivPaperInput): ArxivPaperResult['query'] {
  const id = input.id?.trim()
  if (id === undefined || id === '') {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --id is required for paper lookup.',
      { id: input.id },
    )
  }
  if (id.length > 80 || !isArxivId(id)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --id must look like an arXiv identifier.',
      { id: input.id },
    )
  }
  return {
    id,
    summaryLength: normalizeSummaryLength(input.summaryLength),
  }
}

function normalizeSearchQuery(value: string | undefined): string {
  const query = value?.trim() || 'all:electron'
  if (query.length > 240) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --query must be 240 characters or fewer.',
      { query: value },
    )
  }
  return query
}

function normalizeCategory(value: string | undefined): string | undefined {
  const category = value?.trim()
  if (category === undefined || category === '') {
    return undefined
  }
  if (category.length > 40 || !/^[a-z-]+(?:\.[A-Z]{2})?$/u.test(category)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --category must look like cs.LG or math.AG.',
      { category: value },
    )
  }
  return category
}

function normalizeStart(value: number | undefined): number {
  const start = value ?? 0
  if (!Number.isInteger(start) || start < 0 || start > 30000) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --start must be an integer from 0 to 30000.',
      { start: value },
    )
  }
  return start
}

function normalizeMaxResults(value: number | undefined): number {
  const maxResults = value ?? 10
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --max-results must be an integer from 1 to 100.',
      {
        maxResults: value,
        note: [
          'arXiv documents 2000 per slice, but this CLI caps interactive',
          'calls at 100.',
        ].join(' '),
      },
    )
  }
  return maxResults
}

function normalizeSortBy(
  value: string | undefined,
): ArxivSearchResult['query']['sortBy'] {
  const sortBy = value?.trim()
  if (sortBy === undefined || sortBy === '') return 'relevance'
  if (
    sortBy === 'relevance'
    || sortBy === 'lastUpdatedDate'
    || sortBy === 'submittedDate'
  ) {
    return sortBy
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'arXiv --sort-by must be relevance, lastUpdatedDate, or submittedDate.',
    { sortBy: value },
  )
}

function normalizeSortOrder(
  value: string | undefined,
): ArxivSearchResult['query']['sortOrder'] {
  const sortOrder = value?.trim()
  if (sortOrder === undefined || sortOrder === '') return 'descending'
  if (sortOrder === 'ascending' || sortOrder === 'descending') {
    return sortOrder
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'arXiv --sort-order must be ascending or descending.',
    { sortOrder: value },
  )
}

function normalizeSummaryLength(value: number | undefined): number {
  const summaryLength = value ?? 500
  if (!Number.isInteger(summaryLength) || summaryLength < 0 || summaryLength > 2000) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'arXiv --summary-length must be an integer from 0 to 2000.',
      { summaryLength: value },
    )
  }
  return summaryLength
}

function buildSearchQuery(searchQuery: string, category: string | undefined): string {
  return category === undefined ? searchQuery : `cat:${category} AND (${searchQuery})`
}

function isArxivId(value: string): boolean {
  return /^(?:[a-z-]+(?:\.[A-Z]{2})?\/)?\d{4,7}(?:\.\d{4,5})?(?:v\d+)?$/iu
    .test(value)
}

function createApiMeta(): ArxivApiMeta {
  return {
    provider: 'arxiv',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint: 'GET /api/query',
    docsUrl: 'https://info.arxiv.org/help/api/user-manual.html',
    apiUrl: 'https://export.arxiv.org/api/query',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS Atom XML projected to JSON',
    rateLimitPolicy: 'Official docs request a 3 second delay between repeated calls.',
    documentedMaximumResults: 30000,
    documentedSliceMaximum: 2000,
  }
}

function toPaperSummary(entry: ArxivEntry, summaryLength: number): ArxivPaperSummary {
  return {
    arxivId: entry.arxivId,
    title: entry.title,
    summary: truncateSummary(entry.summary, summaryLength),
    published: entry.published,
    updated: entry.updated,
    authors: entry.authors,
    categories: entry.categories,
    primaryCategory: entry.primaryCategory,
    comment: entry.comment,
    journalRef: entry.journalRef,
    doi: entry.doi,
    absUrl: entry.absUrl,
    pdfUrl: entry.pdfUrl,
  }
}

function truncateSummary(value: string, maxLength: number): string {
  if (maxLength === 0 || value.length <= maxLength) {
    return maxLength === 0 ? '' : value
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}
