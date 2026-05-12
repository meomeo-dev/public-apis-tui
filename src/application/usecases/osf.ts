import {
  OsfClient,
  type OsfNodesQuery,
  type OsfPreprintsQuery,
  type OsfResource,
} from '../../infrastructure/openApis/osfClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OSF_DEFAULT_NODE_TITLE = 'reproducibility'
export const OSF_DEFAULT_PREPRINT_PROVIDER = 'psyarxiv'
export const OSF_DEFAULT_LIMIT = 10
export const OSF_MAX_LIMIT = 50
export const OSF_MAX_PAGE = 500
export const OSF_DEFAULT_DESCRIPTION_LENGTH = 360
export const OSF_MAX_DESCRIPTION_LENGTH = 1000

export const OSF_NODE_CATEGORIES = [
  'analysis',
  'communication',
  'data',
  'hypothesis',
  'instrumentation',
  'methods and measures',
  'procedure',
  'project',
  'software',
  'other',
] as const

export type OsfNodeCategory = typeof OSF_NODE_CATEGORIES[number]

export type OsfNodesInput = {
  title?: string | undefined
  category?: string | undefined
  tags?: string | undefined
  public?: boolean | undefined
  limit?: number | undefined
  page?: number | undefined
  descriptionLength?: number | undefined
}

export type OsfPreprintsInput = {
  provider?: string | undefined
  isPublished?: boolean | undefined
  limit?: number | undefined
  page?: number | undefined
  descriptionLength?: number | undefined
}

type OsfApiMeta = {
  provider: 'osf'
  endpoint: 'GET /v2/nodes/' | 'GET /v2/preprints/'
  docsUrl: 'https://developer.osf.io'
  apiUrl: 'https://api.osf.io/v2'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON:API REST'
  boundary: string
  authBoundary: string
  paginationPolicy: string
  excluded: string[]
  limitCap: number
  pageCap: number
}

type OsfPageSummary = {
  total?: number | undefined
  returned: number
  perPage?: number | undefined
  limit: number
  page: number
  nextPage?: number | undefined
  maxLimit: number
  maxPage: number
}

export type OsfNodeSummary = {
  id: string
  title: string
  description?: string | undefined
  category?: string | undefined
  public?: boolean | undefined
  dateCreated?: string | undefined
  dateModified?: string | undefined
  registration: boolean
  preprint: boolean
  fork: boolean
  collection: boolean
  tags: string[]
  subjects: string[]
  links: {
    html?: string | undefined
    self?: string | undefined
    iri?: string | undefined
  }
}

export type OsfPreprintSummary = {
  id: string
  title: string
  description?: string | undefined
  dateCreated?: string | undefined
  datePublished?: string | undefined
  dateModified?: string | undefined
  public?: boolean | undefined
  provider?: string | undefined
  reviewsState?: string | undefined
  version?: number | undefined
  isLatestVersion?: boolean | undefined
  tags: string[]
  subjects: string[]
  dataLinks: string[]
  preregLinks: string[]
  links: {
    html?: string | undefined
    self?: string | undefined
    doi?: string | undefined
    iri?: string | undefined
  }
}

export type OsfNodesResult = {
  kind: 'osf.nodes'
  api: OsfApiMeta
  query: OsfNodesQuery & { descriptionLength: number }
  pagination: OsfPageSummary
  count: number
  nodes: OsfNodeSummary[]
}

export type OsfPreprintsResult = {
  kind: 'osf.preprints'
  api: OsfApiMeta
  query: OsfPreprintsQuery & { descriptionLength: number }
  pagination: OsfPageSummary
  count: number
  preprints: OsfPreprintSummary[]
}

export async function listOsfNodes(
  input: OsfNodesInput = {},
): Promise<OsfNodesResult> {
  const query = normalizeOsfNodesInput(input)
  const page = await new OsfClient().listNodes(query)
  const nodes = page.data.map(resource => (
    projectNode(resource, query.descriptionLength)
  ))
  return {
    kind: 'osf.nodes',
    api: createApiMeta('GET /v2/nodes/'),
    query,
    pagination: createPaginationSummary(page, nodes.length, query),
    count: nodes.length,
    nodes,
  }
}

export async function listOsfPreprints(
  input: OsfPreprintsInput = {},
): Promise<OsfPreprintsResult> {
  const query = normalizeOsfPreprintsInput(input)
  const page = await new OsfClient().listPreprints(query)
  const preprints = page.data.map(resource => (
    projectPreprint(resource, query.descriptionLength)
  ))
  return {
    kind: 'osf.preprints',
    api: createApiMeta('GET /v2/preprints/'),
    query,
    pagination: createPaginationSummary(page, preprints.length, query),
    count: preprints.length,
    preprints,
  }
}

export function normalizeOsfNodesInput(
  input: OsfNodesInput = {},
): OsfNodesResult['query'] {
  return {
    title: normalizeOptionalText(input.title, 'OSF --title', 160)
      ?? OSF_DEFAULT_NODE_TITLE,
    category: normalizeNodeCategory(input.category),
    tags: normalizeOptionalText(input.tags, 'OSF --tags', 120),
    public: input.public ?? true,
    limit: normalizeLimit(input.limit),
    page: normalizePage(input.page),
    descriptionLength: normalizeDescriptionLength(input.descriptionLength),
  }
}

export function normalizeOsfPreprintsInput(
  input: OsfPreprintsInput = {},
): OsfPreprintsResult['query'] {
  return {
    provider: normalizeProvider(input.provider) ?? OSF_DEFAULT_PREPRINT_PROVIDER,
    isPublished: input.isPublished ?? true,
    limit: normalizeLimit(input.limit),
    page: normalizePage(input.page),
    descriptionLength: normalizeDescriptionLength(input.descriptionLength),
  }
}

function createApiMeta(endpoint: OsfApiMeta['endpoint']): OsfApiMeta {
  return {
    provider: 'osf',
    endpoint,
    docsUrl: 'https://developer.osf.io',
    apiUrl: 'https://api.osf.io/v2',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON:API REST',
    boundary: [
      'Read-only public JSON:API metadata only; private records, account',
      'resources, write operations, file downloads, upload/share/delete',
      'workflows, arbitrary route proxying, and browser scraping are excluded.',
    ].join(' '),
    authBoundary: [
      'Public list endpoints return current_user null without credentials;',
      'account endpoints such as /v2/users/me/ return 401 without auth.',
    ].join(' '),
    paginationPolicy: [
      `CLI defaults to ${OSF_DEFAULT_LIMIT}, caps page size at ${OSF_MAX_LIMIT}`,
      `and caps page at ${OSF_MAX_PAGE}.`,
    ].join(' '),
    excluded: [
      'POST/PUT/PATCH/DELETE OSF API operations',
      'GET /v2/users/me/ and account-scoped resources',
      'private nodes or view-only links',
      'file content download and binary payloads',
      'OSF storage upload, delete, and sharing workflows',
      'HTML scraping or Chrome clickstream',
    ],
    limitCap: OSF_MAX_LIMIT,
    pageCap: OSF_MAX_PAGE,
  }
}

function createPaginationSummary(
  page: { total?: number | undefined; perPage?: number | undefined },
  returned: number,
  query: { limit: number; page: number },
): OsfPageSummary {
  const nextPage = page.total !== undefined && query.page * query.limit < page.total
    ? query.page + 1
    : undefined
  return {
    total: page.total,
    returned,
    perPage: page.perPage,
    limit: query.limit,
    page: query.page,
    ...(nextPage !== undefined && nextPage <= OSF_MAX_PAGE ? { nextPage } : {}),
    maxLimit: OSF_MAX_LIMIT,
    maxPage: OSF_MAX_PAGE,
  }
}

function projectNode(
  resource: OsfResource,
  descriptionLength: number,
): OsfNodeSummary {
  const attributes = resource.attributes
  return {
    id: resource.id,
    title: readString(attributes, 'title') ?? '(untitled OSF node)',
    description: truncateOptionalText(
      readString(attributes, 'description'),
      descriptionLength,
    ),
    category: readString(attributes, 'category'),
    public: readBoolean(attributes, 'public'),
    dateCreated: readString(attributes, 'date_created'),
    dateModified: readString(attributes, 'date_modified'),
    registration: readBoolean(attributes, 'registration') ?? false,
    preprint: readBoolean(attributes, 'preprint') ?? false,
    fork: readBoolean(attributes, 'fork') ?? false,
    collection: readBoolean(attributes, 'collection') ?? false,
    tags: readStringArray(attributes, 'tags'),
    subjects: readSubjectTexts(attributes.subjects),
    links: {
      html: readString(resource.links, 'html'),
      self: readString(resource.links, 'self'),
      iri: readString(resource.links, 'iri'),
    },
  }
}

function projectPreprint(
  resource: OsfResource,
  descriptionLength: number,
): OsfPreprintSummary {
  const attributes = resource.attributes
  return {
    id: resource.id,
    title: readString(attributes, 'title') ?? '(untitled OSF preprint)',
    description: truncateOptionalText(
      readString(attributes, 'description'),
      descriptionLength,
    ),
    dateCreated: readString(attributes, 'date_created'),
    datePublished: readString(attributes, 'date_published'),
    dateModified: readString(attributes, 'date_modified'),
    public: readBoolean(attributes, 'public'),
    provider: readRelationshipId(resource.relationships, 'provider'),
    reviewsState: readString(attributes, 'reviews_state'),
    version: readNumber(attributes, 'version'),
    isLatestVersion: readBoolean(attributes, 'is_latest_version'),
    tags: readStringArray(attributes, 'tags'),
    subjects: readSubjectTexts(attributes.subjects),
    dataLinks: readStringArray(attributes, 'data_links'),
    preregLinks: readStringArray(attributes, 'prereg_links'),
    links: {
      html: readString(resource.links, 'html'),
      self: readString(resource.links, 'self'),
      doi: readString(resource.links, 'preprint_doi'),
      iri: readString(resource.links, 'iri'),
    },
  }
}

function normalizeNodeCategory(
  value: string | undefined,
): OsfNodeCategory | undefined {
  const category = normalizeOptionalText(value, 'OSF --category', 80)
  if (category === undefined) return undefined
  const lowered = category.toLowerCase()
  if (OSF_NODE_CATEGORIES.includes(lowered as OsfNodeCategory)) {
    return lowered as OsfNodeCategory
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `OSF --category must be one of ${OSF_NODE_CATEGORIES.join(', ')}.`,
    { category: value },
  )
}

function normalizeProvider(value: string | undefined): string | undefined {
  const provider = normalizeOptionalText(value, 'OSF --provider', 80)
  if (provider === undefined) return undefined
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/u.test(provider)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'OSF --provider must be a short provider slug such as psyarxiv.',
      { provider: value },
    )
  }
  return provider.toLowerCase()
}

function normalizeOptionalText(
  value: string | undefined,
  label: string,
  maxLength: number,
): string | undefined {
  const text = value?.trim()
  if (text === undefined || text === '') return undefined
  if (text.length > maxLength) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be ${maxLength} characters or fewer.`,
      { value },
    )
  }
  if (hasControlCharacter(text)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must not contain control characters.`,
      { value },
    )
  }
  return text
}

function hasControlCharacter(value: string): boolean {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127)
  })
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? OSF_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > OSF_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `OSF --limit must be an integer from 1 to ${OSF_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1 || page > OSF_MAX_PAGE) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `OSF --page must be an integer from 1 to ${OSF_MAX_PAGE}.`,
      { page: value },
    )
  }
  return page
}

function normalizeDescriptionLength(value: number | undefined): number {
  const length = value ?? OSF_DEFAULT_DESCRIPTION_LENGTH
  if (
    !Number.isInteger(length)
    || length < 0
    || length > OSF_MAX_DESCRIPTION_LENGTH
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'OSF --description-length must be an integer from 0 to',
        `${OSF_MAX_DESCRIPTION_LENGTH}.`,
      ].join(' '),
      { descriptionLength: value },
    )
  }
  return length
}

function truncateOptionalText(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  if (value === undefined || maxLength === 0) return undefined
  const normalized = value.replace(/\s+/gu, ' ').trim()
  if (normalized === '') return undefined
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1))}…`
    : normalized
}

function readRelationshipId(
  relationships: Record<string, unknown>,
  key: string,
): string | undefined {
  const relationship = relationships[key]
  if (!isRecord(relationship) || !isRecord(relationship.data)) return undefined
  return readString(relationship.data, 'id')
}

function readSubjectTexts(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const subjects: string[] = []
  for (const branch of value) {
    if (!Array.isArray(branch)) continue
    for (const subject of branch) {
      if (isRecord(subject)) {
        const text = readString(subject, 'text')
        if (text !== undefined) subjects.push(text)
      }
    }
  }
  return [...new Set(subjects)]
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

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => (
    typeof entry === 'string' && entry.trim() !== ''
  ))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
