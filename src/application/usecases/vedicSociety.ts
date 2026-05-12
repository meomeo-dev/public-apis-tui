import {
  VedicSocietyClient,
  type VedicSocietyEntry,
} from '../../infrastructure/openApis/vedicSocietyClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const VEDIC_SOCIETY_DEFAULT_WORD = 'agni'
export const VEDIC_SOCIETY_DEFAULT_DESCRIPTION = 'fire'
export const VEDIC_SOCIETY_DEFAULT_CATEGORY = 'river'
export const VEDIC_SOCIETY_DEFAULT_LIMIT = 20
export const VEDIC_SOCIETY_MAX_LIMIT = 100
export const VEDIC_SOCIETY_MAX_OFFSET = 20_000

export const VEDIC_SOCIETY_CATEGORIES = [
  'grass',
  'plant',
  'tree',
  'animal',
  'bird',
  'cattle',
  'fish',
  'insect',
  'snake',
  'worm',
  'building',
  'chariot',
  'food',
  'grain',
  'metal',
  'object',
  'ship',
  'weapon',
  'war',
  'number',
  'distance',
  'time',
  'weight',
  'mountain',
  'place',
  'river',
  'astronomy',
  'disease',
  'literature',
  'medicine',
  'poison',
  'subject',
  'dicing',
  'games',
  'music',
  'clothing',
  'hair',
  'ornament',
  'law',
  'morals',
  'agriculture',
  'caste',
  'family',
  'occupation',
  'priest',
  'royalty',
  'trade',
  'tribe',
] as const

export type VedicSocietyCategory = typeof VEDIC_SOCIETY_CATEGORIES[number]

type VedicSocietyEndpoint =
  | 'GET /words/{word}'
  | 'GET /descriptions/{description}'
  | 'GET /categories/{category}'

type VedicSocietyApiMeta = {
  provider: 'vedicsociety'
  endpoint: VedicSocietyEndpoint
  docsUrl: 'https://aninditabasu.github.io/indica/topics/api_vs.html'
  openApiUrl: 'https://aninditabasu.github.io/indica/assets/openapi_vs.json'
  apiUrl: 'https://indica-1hwj.onrender.com/vs/v2'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  legacyListedUrl: string
  queryPolicy: string
  categoryPolicy: string
  paginationPolicy: string
  emptyPolicy: string
  excluded: string[]
}

type VedicSocietyPagination = {
  total: number
  returned: number
  limit: number
  offset: number
  nextOffset?: number | undefined
  maxLimit: number
}

type VedicSocietyFacetSummary = {
  words: string[]
  categories: string[]
  descriptions: string[]
}

export type VedicSocietyWordsInput = {
  word?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type VedicSocietyDescriptionsInput = {
  description?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type VedicSocietyCategoryInput = {
  category?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type VedicSocietyWordsQuery = {
  word: string
  limit: number
  offset: number
}

export type VedicSocietyDescriptionsQuery = {
  description: string
  limit: number
  offset: number
}

export type VedicSocietyCategoryQuery = {
  category: VedicSocietyCategory
  limit: number
  offset: number
}

export type VedicSocietyWordsResult = {
  kind: 'vedicsociety.words'
  api: VedicSocietyApiMeta
  query: VedicSocietyWordsQuery
  pagination: VedicSocietyPagination
  count: number
  facets: VedicSocietyFacetSummary
  entries: VedicSocietyEntry[]
}

export type VedicSocietyDescriptionsResult = {
  kind: 'vedicsociety.descriptions'
  api: VedicSocietyApiMeta
  query: VedicSocietyDescriptionsQuery
  pagination: VedicSocietyPagination
  count: number
  facets: VedicSocietyFacetSummary
  entries: VedicSocietyEntry[]
}

export type VedicSocietyCategoryResult = {
  kind: 'vedicsociety.category'
  api: VedicSocietyApiMeta
  query: VedicSocietyCategoryQuery
  pagination: VedicSocietyPagination
  count: number
  facets: VedicSocietyFacetSummary
  entries: VedicSocietyEntry[]
}

export async function searchVedicSocietyWords(
  input: VedicSocietyWordsInput = {},
): Promise<VedicSocietyWordsResult> {
  const query = normalizeVedicSocietyWordsInput(input)
  const entries = await new VedicSocietyClient().words(query.word)
  const page = paginateEntries(entries, query)
  return {
    kind: 'vedicsociety.words',
    api: createApiMeta('GET /words/{word}'),
    query,
    pagination: page.pagination,
    count: page.entries.length,
    facets: summarizeFacets(entries),
    entries: page.entries,
  }
}

export async function searchVedicSocietyDescriptions(
  input: VedicSocietyDescriptionsInput = {},
): Promise<VedicSocietyDescriptionsResult> {
  const query = normalizeVedicSocietyDescriptionsInput(input)
  const entries = await new VedicSocietyClient().descriptions(query.description)
  const page = paginateEntries(entries, query)
  return {
    kind: 'vedicsociety.descriptions',
    api: createApiMeta('GET /descriptions/{description}'),
    query,
    pagination: page.pagination,
    count: page.entries.length,
    facets: summarizeFacets(entries),
    entries: page.entries,
  }
}

export async function getVedicSocietyCategory(
  input: VedicSocietyCategoryInput = {},
): Promise<VedicSocietyCategoryResult> {
  const query = normalizeVedicSocietyCategoryInput(input)
  const entries = await new VedicSocietyClient().category(query.category)
  const page = paginateEntries(entries, query)
  return {
    kind: 'vedicsociety.category',
    api: createApiMeta('GET /categories/{category}'),
    query,
    pagination: page.pagination,
    count: page.entries.length,
    facets: summarizeFacets(entries),
    entries: page.entries,
  }
}

export function normalizeVedicSocietyWordsInput(
  input: VedicSocietyWordsInput = {},
): VedicSocietyWordsQuery {
  return {
    word: normalizeText(input.word ?? VEDIC_SOCIETY_DEFAULT_WORD, '--word'),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeVedicSocietyDescriptionsInput(
  input: VedicSocietyDescriptionsInput = {},
): VedicSocietyDescriptionsQuery {
  return {
    description: normalizeText(
      input.description ?? VEDIC_SOCIETY_DEFAULT_DESCRIPTION,
      '--description',
    ),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeVedicSocietyCategoryInput(
  input: VedicSocietyCategoryInput = {},
): VedicSocietyCategoryQuery {
  return {
    category: normalizeCategory(input.category ?? VEDIC_SOCIETY_DEFAULT_CATEGORY),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

function paginateEntries(
  entries: VedicSocietyEntry[],
  query: { limit: number; offset: number },
): { entries: VedicSocietyEntry[]; pagination: VedicSocietyPagination } {
  const sliced = entries.slice(query.offset, query.offset + query.limit)
  const nextOffset = query.offset + query.limit < entries.length
    ? query.offset + query.limit
    : undefined
  return {
    entries: sliced,
    pagination: {
      total: entries.length,
      returned: sliced.length,
      limit: query.limit,
      offset: query.offset,
      ...(nextOffset !== undefined ? { nextOffset } : {}),
      maxLimit: VEDIC_SOCIETY_MAX_LIMIT,
    },
  }
}

function summarizeFacets(entries: VedicSocietyEntry[]): VedicSocietyFacetSummary {
  return {
    words: summarizeUnique(entries.map(entry => entry.word)),
    categories: summarizeUnique(entries.map(entry => entry.category)),
    descriptions: summarizeUnique(entries.map(entry => entry.description)),
  }
}

function summarizeUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function createApiMeta(endpoint: VedicSocietyEndpoint): VedicSocietyApiMeta {
  return {
    provider: 'vedicsociety',
    endpoint,
    docsUrl: 'https://aninditabasu.github.io/indica/topics/api_vs.html',
    openApiUrl: 'https://aninditabasu.github.io/indica/assets/openapi_vs.json',
    apiUrl: 'https://indica-1hwj.onrender.com/vs/v2',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'Read-only Vedic Society noun metadata endpoints only; static HTML',
      'pages, browser scraping, arbitrary route proxying, warning text,',
      'upload, delete, and account workflows are excluded.',
    ].join(' '),
    legacyListedUrl: [
      'The public-apis listed /indica/html/vs.html URL now returns GitHub',
      'Pages 404; current same-project docs and OpenAPI JSON are used.',
    ].join(' '),
    queryPolicy: [
      'Path parameters are bounded and reject slash, control, query,',
      'fragment, and backslash characters before requests are sent.',
    ].join(' '),
    categoryPolicy: [
      'Categories are locally validated against the documented enum to avoid',
      'treating HTTP 200 text/html warning payloads as data.',
    ].join(' '),
    paginationPolicy: [
      'Upstream endpoints are unpaginated arrays; CLI applies local limit',
      `and offset with limit cap ${VEDIC_SOCIETY_MAX_LIMIT}.`,
    ].join(' '),
    emptyPolicy: [
      'Known text/plain or text/html not-found responses for word and',
      'description searches are mapped to empty results, not displayed.',
    ].join(' '),
    excluded: [
      'Deprecated /indica/html/vs.html page',
      'Undocumented raw path proxying',
      'HTML warning payloads',
      'Browser scraping or clickstream',
      'Upload, delete, or account workflows',
    ],
  }
}

function normalizeCategory(value: string): VedicSocietyCategory {
  const category = normalizeText(value, '--category').toLowerCase()
  if (VEDIC_SOCIETY_CATEGORIES.includes(category as VedicSocietyCategory)) {
    return category as VedicSocietyCategory
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    [
      'Vedic Society --category must be one of',
      `${VEDIC_SOCIETY_CATEGORIES.join(', ')}.`,
    ].join(' '),
    { category: value },
  )
}

function normalizeText(value: string, label: string): string {
  const text = value.trim()
  if (text.length < 1 || text.length > 80) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Vedic Society ${label} must be between 1 and 80 characters.`,
      { value },
    )
  }
  if (hasUnsafePathCharacter(text)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        `Vedic Society ${label} must not include slash, query, fragment,`,
        'backslash, or control characters.',
      ].join(' '),
      { value },
    )
  }
  return text.replace(/\s+/gu, ' ')
}

function hasUnsafePathCharacter(value: string): boolean {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (
      codePoint < 32
      || codePoint === 127
      || character === '/'
      || character === '?'
      || character === '#'
      || character === '\\'
    )
  })
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? VEDIC_SOCIETY_DEFAULT_LIMIT
  if (
    !Number.isInteger(limit)
    || limit < 1
    || limit > VEDIC_SOCIETY_MAX_LIMIT
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Vedic Society --limit must be an integer from 1 to',
        `${VEDIC_SOCIETY_MAX_LIMIT}.`,
      ].join(' '),
      { limit: value },
    )
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (
    !Number.isInteger(offset)
    || offset < 0
    || offset > VEDIC_SOCIETY_MAX_OFFSET
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Vedic Society --offset must be an integer from 0 to',
        `${VEDIC_SOCIETY_MAX_OFFSET}.`,
      ].join(' '),
      { offset: value },
    )
  }
  return offset
}
