import {
  ShareClient,
  type ShareSearchHit,
  type ShareSearchRequest,
  type ShareSourceResource,
} from '../../infrastructure/openApis/shareClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SHARE_DEFAULT_QUERY = 'reproducibility'
export const SHARE_DEFAULT_SOURCE_QUERY = ''
export const SHARE_DEFAULT_LIMIT = 10
export const SHARE_MAX_LIMIT = 50
export const SHARE_MAX_OFFSET = 10_000
export const SHARE_DEFAULT_DESCRIPTION_LENGTH = 320
export const SHARE_MAX_DESCRIPTION_LENGTH = 1_000
export const SHARE_SOURCE_CATALOG_SIZE = 10

export const SHARE_WORK_TYPES = [
  'article',
  'conferencepaper',
  'data',
  'preprint',
  'project',
  'registration',
  'thesis',
] as const

export type ShareWorkType = typeof SHARE_WORK_TYPES[number]
export type ShareSort = 'relevance' | 'date'

export type ShareSearchInput = {
  query?: string | undefined
  type?: string | undefined
  source?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  sort?: string | undefined
  descriptionLength?: number | undefined
}

export type ShareSourcesInput = {
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

type NormalizedShareSourcesQuery = {
  query: string
  limit: number
  offset: number
}

type ShareApiMeta = {
  provider: 'share'
  endpoint: 'POST /api/v2/search/creativeworks/_search' | 'GET /api/v2/sources/'
  docsUrl: 'https://share-api-and-curation.readthedocs.io/'
  apiUrl: 'https://share.osf.io/api/v2'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  authBoundary: string
  queryPolicy: string
  paginationPolicy: string
  excluded: string[]
  limitCap: number
  offsetCap: number
}

type SharePagination = {
  total?: number | undefined
  returned: number
  limit: number
  offset: number
  nextOffset?: number | undefined
  maxLimit: number
  maxOffset: number
}

export type ShareWorkSummary = {
  id: string
  title: string
  type?: string | undefined
  score?: number | undefined
  date?: string | undefined
  datePublished?: string | undefined
  dateUpdated?: string | undefined
  description?: string | undefined
  retracted?: boolean | undefined
  withdrawn?: boolean | undefined
  sources: string[]
  contributors: string[]
  funders: string[]
  publishers: string[]
  tags: string[]
  subjects: string[]
  identifiers: string[]
  links: {
    primary?: string | undefined
    doi?: string | undefined
    osf?: string | undefined
  }
}

export type ShareSourceSummary = {
  id: string
  name: string
  longTitle?: string | undefined
  homePage?: string | undefined
  sourceConfigCount?: number | undefined
  links: {
    self?: string | undefined
  }
}

export type ShareSearchResult = {
  kind: 'share.search'
  api: ShareApiMeta
  query: ShareSearchRequest & { descriptionLength: number }
  pagination: SharePagination
  search: {
    took?: number | undefined
    timedOut: boolean
  }
  count: number
  works: ShareWorkSummary[]
}

export type ShareSourcesResult = {
  kind: 'share.sources'
  api: ShareApiMeta
  query: NormalizedShareSourcesQuery
  pagination: SharePagination & {
    upstreamReturned: number
    upstreamNext?: string | undefined
  }
  count: number
  sources: ShareSourceSummary[]
}

export async function searchShareWorks(
  input: ShareSearchInput = {},
): Promise<ShareSearchResult> {
  const query = normalizeShareSearchInput(input)
  const page = await new ShareClient().searchCreativeWorks(query)
  const works = page.hits.map(hit => (
    projectWork(hit, query.descriptionLength)
  ))
  return {
    kind: 'share.search',
    api: createApiMeta('POST /api/v2/search/creativeworks/_search'),
    query,
    pagination: createSearchPagination(page.total, works.length, query),
    search: {
      took: page.took,
      timedOut: page.timedOut,
    },
    count: works.length,
    works,
  }
}

export async function listShareSources(
  input: ShareSourcesInput = {},
): Promise<ShareSourcesResult> {
  const query = normalizeShareSourcesInput(input)
  const page = await new ShareClient().listSources()
  const projected = page.sources.map(projectSource)
  const matched = filterSources(projected, query.query)
  const sources = matched.slice(query.offset, query.offset + query.limit)
  return {
    kind: 'share.sources',
    api: createApiMeta('GET /api/v2/sources/'),
    query,
    pagination: {
      total: matched.length,
      returned: sources.length,
      limit: query.limit,
      offset: query.offset,
      nextOffset: query.offset + sources.length < matched.length
        ? query.offset + sources.length
        : undefined,
      maxLimit: SHARE_MAX_LIMIT,
      maxOffset: SHARE_MAX_OFFSET,
      upstreamReturned: page.sources.length,
      upstreamNext: typeof page.links.next === 'string'
        ? page.links.next
        : undefined,
    },
    count: sources.length,
    sources,
  }
}

export function normalizeShareSearchInput(
  input: ShareSearchInput = {},
): ShareSearchResult['query'] {
  return {
    query: normalizeRequiredText(
      input.query ?? SHARE_DEFAULT_QUERY,
      'SHARE --query',
      200,
    ),
    type: normalizeWorkType(input.type),
    source: normalizeOptionalToken(input.source, 'SHARE --source', 80),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
    sort: normalizeSort(input.sort),
    descriptionLength: normalizeDescriptionLength(input.descriptionLength),
  }
}

export function normalizeShareSourcesInput(
  input: ShareSourcesInput = {},
): ShareSourcesResult['query'] {
  return {
    query: normalizeOptionalText(input.query, 'SHARE --query', 120)
      ?? SHARE_DEFAULT_SOURCE_QUERY,
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

function createApiMeta(endpoint: ShareApiMeta['endpoint']): ShareApiMeta {
  return {
    provider: 'share',
    endpoint,
    docsUrl: 'https://share-api-and-curation.readthedocs.io/',
    apiUrl: 'https://share.osf.io/api/v2',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'Read-only SHARE normalized metadata only; arbitrary Elasticsearch DSL,',
      'aggregations, browser Discover query generation, RSS/Atom bulk feeds,',
      'mutating source pushes, account routes, and binary downloads are excluded.',
    ].join(' '),
    authBoundary: [
      'Root, status, sources, feeds, and creativeworks search probes returned',
      'without API keys, OAuth, account setup, cookies, or browser flow.',
    ].join(' '),
    queryPolicy: [
      'CLI constructs a curated simple_query_string over documented indexed',
      'fields and optional exact type/source filters; raw DSL is not exposed.',
    ].join(' '),
    paginationPolicy: [
      `Search uses Elasticsearch size/from with default ${SHARE_DEFAULT_LIMIT},`,
      `limit cap ${SHARE_MAX_LIMIT}, and offset cap ${SHARE_MAX_OFFSET}.`,
    ].join(' '),
    excluded: [
      'arbitrary Elasticsearch DSL and aggregation passthrough',
      'SHARE Discover browser-generated query bodies',
      'source creation, push, update, or curation workflows',
      'account-scoped user behavior',
      'RSS/Atom bulk feed dumping',
      'HTML scraping or Chrome clickstream',
    ],
    limitCap: SHARE_MAX_LIMIT,
    offsetCap: SHARE_MAX_OFFSET,
  }
}

function createSearchPagination(
  total: number | undefined,
  returned: number,
  query: ShareSearchResult['query'],
): SharePagination {
  const nextOffset = total !== undefined && query.offset + returned < total
    ? query.offset + returned
    : undefined
  return {
    total,
    returned,
    limit: query.limit,
    offset: query.offset,
    ...(nextOffset !== undefined && nextOffset <= SHARE_MAX_OFFSET
      ? { nextOffset }
      : {}),
    maxLimit: SHARE_MAX_LIMIT,
    maxOffset: SHARE_MAX_OFFSET,
  }
}

function projectWork(
  hit: ShareSearchHit,
  descriptionLength: number,
): ShareWorkSummary {
  const source = hit.source
  const identifiers = readStringArray(source, 'identifiers')
  return {
    id: hit.id,
    title: readString(source, 'title') ?? '(untitled SHARE work)',
    type: readString(source, 'type'),
    score: hit.score,
    date: readString(source, 'date'),
    datePublished: readString(source, 'date_published'),
    dateUpdated: readString(source, 'date_updated'),
    description: truncateOptionalText(
      readString(source, 'description'),
      descriptionLength,
    ),
    retracted: readBoolean(source, 'retracted'),
    withdrawn: readBoolean(source, 'withdrawn'),
    sources: readStringArray(source, 'sources'),
    contributors: readStringArray(source, 'contributors'),
    funders: readStringArray(source, 'funders'),
    publishers: readStringArray(source, 'publishers'),
    tags: readStringArray(source, 'tags'),
    subjects: readStringArray(source, 'subjects'),
    identifiers,
    links: {
      primary: findPrimaryIdentifier(identifiers),
      doi: identifiers.find(isDoiUrl),
      osf: identifiers.find(identifier => /:\/\/osf\.io\//iu.test(identifier)),
    },
  }
}

function projectSource(resource: ShareSourceResource): ShareSourceSummary {
  const sourceConfigs = readRelationshipArray(resource.relationships, 'sourceConfigs')
  return {
    id: resource.id,
    name: readString(resource.attributes, 'name') ?? resource.id,
    longTitle: readString(resource.attributes, 'longTitle'),
    homePage: readString(resource.attributes, 'homePage'),
    sourceConfigCount: sourceConfigs.length > 0
      ? sourceConfigs.length
      : readRelationshipCount(resource.relationships, 'sourceConfigs'),
    links: {
      self: readString(resource.links, 'self'),
    },
  }
}

function filterSources(
  sources: ShareSourceSummary[],
  query: string,
): ShareSourceSummary[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery === '') return sources
  return sources.filter(source => {
    const haystack = [
      source.id,
      source.name,
      source.longTitle,
      source.homePage,
    ].filter((part): part is string => typeof part === 'string')
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function normalizeWorkType(value: string | undefined): ShareWorkType | undefined {
  const normalized = normalizeOptionalToken(value, 'SHARE --type', 40)
  if (normalized === undefined) return undefined
  if (SHARE_WORK_TYPES.includes(normalized as ShareWorkType)) {
    return normalized as ShareWorkType
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `SHARE --type must be one of ${SHARE_WORK_TYPES.join(', ')}.`,
    { supported: SHARE_WORK_TYPES },
  )
}

function normalizeSort(value: string | undefined): ShareSort {
  if (value === undefined || value.trim() === '') return 'relevance'
  if (value === 'relevance' || value === 'date') return value
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'SHARE --sort must be relevance or date.',
    { supported: ['relevance', 'date'] },
  )
}

function normalizeRequiredText(
  value: string,
  label: string,
  maxLength: number,
): string {
  const normalized = normalizeOptionalText(value, label, maxLength)
  if (normalized !== undefined) return normalized
  throw new RuntimeFailure('INVALID_ARGUMENT', `${label} is required.`)
}

function normalizeOptionalText(
  value: string | undefined,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim().replace(/\s+/gu, ' ')
  if (trimmed === '') return undefined
  if (trimmed.length > maxLength) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be ${maxLength} characters or fewer.`,
      { maxLength },
    )
  }
  if (/[{}[\]"\\]/u.test(trimmed)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must not contain raw JSON or query DSL punctuation.`,
    )
  }
  return trimmed
}

function normalizeOptionalToken(
  value: string | undefined,
  label: string,
  maxLength: number,
): string | undefined {
  const normalized = normalizeOptionalText(value, label, maxLength)
  if (normalized === undefined) return undefined
  if (!/^[A-Za-z0-9._:-]+$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        `${label} must contain only letters, numbers, dots, dashes,`,
        'colons, or underscores.',
      ].join(' '),
    )
  }
  return normalized
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) return SHARE_DEFAULT_LIMIT
  if (!Number.isInteger(value) || value < 1 || value > SHARE_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `SHARE --limit must be an integer from 1 to ${SHARE_MAX_LIMIT}.`,
      { limit: value, max: SHARE_MAX_LIMIT },
    )
  }
  return value
}

function normalizeOffset(value: number | undefined): number {
  if (value === undefined) return 0
  if (!Number.isInteger(value) || value < 0 || value > SHARE_MAX_OFFSET) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `SHARE --offset must be an integer from 0 to ${SHARE_MAX_OFFSET}.`,
      { offset: value, max: SHARE_MAX_OFFSET },
    )
  }
  return value
}

function normalizeDescriptionLength(value: number | undefined): number {
  if (value === undefined) return SHARE_DEFAULT_DESCRIPTION_LENGTH
  if (!Number.isInteger(value) || value < 0 || value > SHARE_MAX_DESCRIPTION_LENGTH) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'SHARE --description-length must be an integer from',
        `0 to ${SHARE_MAX_DESCRIPTION_LENGTH}.`,
      ].join(' '),
      { value, max: SHARE_MAX_DESCRIPTION_LENGTH },
    )
  }
  return value
}

function truncateOptionalText(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  if (value === undefined || maxLength === 0) return undefined
  const collapsed = value.replace(/\s+/gu, ' ').trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function findPrimaryIdentifier(identifiers: string[]): string | undefined {
  return identifiers.find(identifier => /^https?:\/\//iu.test(identifier))
}

function isDoiUrl(value: string): boolean {
  return /:\/\/(?:dx\.)?doi\.org\//iu.test(value)
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const value = record[key]
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function readRelationshipArray(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const relationship = record[key]
  if (!isRecord(relationship) || !Array.isArray(relationship.data)) return []
  return relationship.data.filter(isRecord)
}

function readRelationshipCount(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const relationship = record[key]
  if (!isRecord(relationship) || !isRecord(relationship.meta)) return undefined
  const count = relationship.meta.count
  return typeof count === 'number' && Number.isFinite(count) ? count : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
