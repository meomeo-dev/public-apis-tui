import { CrossrefClient, type CrossrefRateLimit, type CrossrefWork } from '../../infrastructure/openApis/crossrefClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type CrossrefWorksInput = {
  query?: string | undefined
  rows?: number | undefined
  offset?: number | undefined
  filter?: string | undefined
  sort?: string | undefined
  order?: string | undefined
  mailto?: string | undefined
}

export type CrossrefWorkInput = {
  doi?: string | undefined
  mailto?: string | undefined
}

export type CrossrefApiMeta = {
  provider: 'crossref'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /works' | 'GET /works/{doi}'
  docsUrl: 'https://github.com/CrossRef/rest-api-doc'
  apiUrl: 'https://api.crossref.org'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximumRows: 1000
  rateLimitPolicy: 'Public pool exposes rate-limit headers; live sample observed 5 requests / 1 second and concurrency 1.'
}

export type CrossrefWorkSummary = {
  doi: string
  title: string
  authors: string[]
  publisher?: string | undefined
  type?: string | undefined
  issued?: string | undefined
  containerTitle?: string | undefined
  referencedByCount?: number | undefined
  url?: string | undefined
  abstract?: string | undefined
}

export type CrossrefWorksResult = {
  kind: 'crossref.works'
  api: CrossrefApiMeta
  query: {
    query: string
    rows: number
    offset: number
    filter?: string | undefined
    sort?: string | undefined
    order: 'asc' | 'desc'
    mailto?: string | undefined
  }
  pagination: {
    totalResults: number
    itemsPerPage: number
    offset: number
    nextOffset: number
  }
  rateLimit: CrossrefRateLimit
  count: number
  works: CrossrefWorkSummary[]
}

export type CrossrefWorkResult = {
  kind: 'crossref.work'
  api: CrossrefApiMeta
  query: {
    doi: string
    mailto?: string | undefined
  }
  rateLimit: CrossrefRateLimit
  work: CrossrefWorkSummary
}

const defaultSelect = [
  'DOI',
  'title',
  'subtitle',
  'author',
  'issued',
  'published-print',
  'published-online',
  'publisher',
  'container-title',
  'type',
  'is-referenced-by-count',
  'URL',
].join(',')

export async function listCrossrefWorks(input: CrossrefWorksInput = {}): Promise<CrossrefWorksResult> {
  const query = normalizeWorksInput(input)
  const client = new CrossrefClient()
  const response = await client.listWorks({ ...query, select: defaultSelect })
  const works = response.items.map(work => toWorkSummary(work))
  return {
    kind: 'crossref.works',
    api: createApiMeta('GET /works'),
    query,
    pagination: {
      totalResults: response.totalResults,
      itemsPerPage: response.itemsPerPage,
      offset: query.offset,
      nextOffset: response.nextOffset,
    },
    rateLimit: response.rateLimit,
    count: works.length,
    works,
  }
}

export async function getCrossrefWork(input: CrossrefWorkInput = {}): Promise<CrossrefWorkResult> {
  const query = normalizeWorkInput(input)
  const client = new CrossrefClient()
  const response = await client.getWork(query)
  return {
    kind: 'crossref.work',
    api: createApiMeta('GET /works/{doi}'),
    query,
    rateLimit: response.rateLimit,
    work: toWorkSummary(response.work, { includeAbstract: true }),
  }
}

function normalizeWorksInput(input: CrossrefWorksInput): CrossrefWorksResult['query'] {
  return {
    query: normalizeSearchQuery(input.query),
    rows: normalizeRows(input.rows),
    offset: normalizeOffset(input.offset),
    filter: normalizeOptionalText(input.filter, 'filter', 300),
    sort: normalizeOptionalText(input.sort, 'sort', 80),
    order: normalizeOrder(input.order),
    mailto: normalizeMailto(input.mailto),
  }
}

function normalizeWorkInput(input: CrossrefWorkInput): CrossrefWorkResult['query'] {
  const doi = input.doi?.trim()
  if (doi === undefined || doi === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --doi is required for work lookup.', {
      doi: input.doi,
    })
  }
  if (doi.length > 300 || /\s/u.test(doi) || !/^10\.\d{4,9}\/\S+$/iu.test(doi)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --doi must look like a DOI, for example 10.1037/0003-066X.59.1.29.', {
      doi: input.doi,
    })
  }
  return {
    doi,
    mailto: normalizeMailto(input.mailto),
  }
}

function createApiMeta(endpoint: CrossrefApiMeta['endpoint']): CrossrefApiMeta {
  return {
    provider: 'crossref',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://github.com/CrossRef/rest-api-doc',
    apiUrl: 'https://api.crossref.org',
    usesBrowserClickstream: false,
    authentication: 'none',
    documentedMaximumRows: 1000,
    rateLimitPolicy: 'Public pool exposes rate-limit headers; live sample observed 5 requests / 1 second and concurrency 1.',
  }
}

function normalizeSearchQuery(value: string | undefined): string {
  const query = value?.trim() || 'metadata'
  if (query.length > 200) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --query must be 200 characters or fewer.', {
      query: value,
    })
  }
  return query
}

function normalizeRows(value: number | undefined): number {
  const rows = value ?? 20
  if (!Number.isInteger(rows) || rows < 1 || rows > 1000) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --rows must be an integer from 1 to the documented maximum 1000.', {
      rows: value,
    })
  }
  return rows
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --offset must be an integer from 0 to 100000.', {
      offset: value,
    })
  }
  return offset
}

function normalizeOrder(value: string | undefined): 'asc' | 'desc' {
  const order = value?.trim().toLowerCase()
  if (order === undefined || order === '') {
    return 'desc'
  }
  if (order === 'asc' || order === 'desc') {
    return order
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --order must be asc or desc.', {
    order: value,
  })
}

function normalizeOptionalText(value: string | undefined, label: string, maxLength: number): string | undefined {
  const text = value?.trim()
  if (text === undefined || text === '') {
    return undefined
  }
  if (text.length > maxLength) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Crossref --${label} must be ${maxLength} characters or fewer.`, {
      [label]: value,
    })
  }
  return text
}

function normalizeMailto(value: string | undefined): string | undefined {
  const mailto = value?.trim()
  if (mailto === undefined || mailto === '') {
    return undefined
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(mailto)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Crossref --mailto must be an email address for polite pool identification.', {
      mailto: value,
    })
  }
  return mailto
}

function toWorkSummary(work: CrossrefWork, options: { includeAbstract?: boolean } = {}): CrossrefWorkSummary {
  return {
    doi: work.DOI,
    title: [...(work.title ?? []), ...(work.subtitle ?? [])].filter(part => part.trim() !== '').join(': ') || '(untitled)',
    authors: (work.author ?? []).map(formatAuthor).filter(author => author !== ''),
    ...(work.publisher !== undefined ? { publisher: work.publisher } : {}),
    ...(work.type !== undefined ? { type: work.type } : {}),
    ...(formatIssued(work) !== undefined ? { issued: formatIssued(work) } : {}),
    ...(work.containerTitle?.[0] !== undefined ? { containerTitle: work.containerTitle[0] } : {}),
    ...(work.isReferencedByCount !== undefined ? { referencedByCount: work.isReferencedByCount } : {}),
    ...(work.URL !== undefined ? { url: work.URL } : {}),
    ...(options.includeAbstract === true && work.abstract !== undefined ? { abstract: stripTags(work.abstract).slice(0, 1000) } : {}),
  }
}

function formatAuthor(author: { given?: string | undefined; family?: string | undefined; name?: string | undefined }): string {
  if (author.name !== undefined) {
    return author.name
  }
  return [author.given, author.family].filter(part => part !== undefined && part.trim() !== '').join(' ')
}

function formatIssued(work: CrossrefWork): string | undefined {
  const parts = work.issued?.dateParts?.[0] ?? work.publishedOnline?.dateParts?.[0] ?? work.publishedPrint?.dateParts?.[0]
  if (parts === undefined || parts.length === 0) {
    return undefined
  }
  return parts.map(part => String(part).padStart(2, '0')).join('-')
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/gu, '').replace(/\s+/gu, ' ').trim()
}
