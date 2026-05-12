import {
  RigVedaClient,
  type RigVedaRecord,
} from '../../infrastructure/openApis/rigVedaClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RIG_VEDA_DEFAULT_MANDAL = 1
export const RIG_VEDA_DEFAULT_FIELD = 'god'
export const RIG_VEDA_DEFAULT_VALUE = 'ganga'
export const RIG_VEDA_DEFAULT_LIMIT = 20
export const RIG_VEDA_MAX_LIMIT = 100
export const RIG_VEDA_MAX_OFFSET = 20_000
export const RIG_VEDA_DEFAULT_SEARCH_MANDAL = 1
export const RIG_VEDA_DEFAULT_POET = 'vasishth'
export const RIG_VEDA_DEFAULT_POET_CATEGORY = 'human male'

export const RIG_VEDA_SEARCH_FIELDS = [
  'god',
  'poet',
  'meter',
  'poet-category',
  'god-category',
  'god-in-book',
  'god-by-poet',
  'god-category-by-poet-category',
] as const

export const RIG_VEDA_POET_CATEGORIES = [
  'animal',
  'demon male',
  'divine female',
  'divine male',
  'human female',
  'human male',
] as const

export const RIG_VEDA_GOD_CATEGORIES = [
  'abstract',
  'animal',
  'demon male',
  'divine female',
  'divine human',
  'divine male',
  'human couple',
  'human female',
  'human male',
  'human unborn',
  'object',
  'plant',
] as const

export type RigVedaSearchField = typeof RIG_VEDA_SEARCH_FIELDS[number]
export type RigVedaPoetCategory = typeof RIG_VEDA_POET_CATEGORIES[number]
export type RigVedaGodCategory = typeof RIG_VEDA_GOD_CATEGORIES[number]

export type RigVedaBookInput = {
  mandal?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type RigVedaSearchInput = {
  field?: string | undefined
  value?: string | undefined
  mandal?: number | undefined
  poet?: string | undefined
  poetCategory?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

type RigVedaApiMeta = {
  provider: 'rigveda'
  endpoint: RigVedaEndpoint
  docsUrl: 'https://aninditabasu.github.io/indica/topics/api_rv.html'
  openApiUrl: 'https://aninditabasu.github.io/indica/assets/openapi_rv.json'
  apiUrl: 'https://indica-1hwj.onrender.com/rv/v2/meta'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  legacyListedUrl: string
  queryPolicy: string
  categoryPolicy: string
  paginationPolicy: string
  excluded: string[]
}

type RigVedaEndpoint =
  | 'GET /book/{mandal}'
  | 'GET /meter/{meter}'
  | 'GET /poet/{sungby}'
  | 'GET /poetcategory/{sungbycategory}'
  | 'GET /god/{sungfor}'
  | 'GET /god/{sungfor}/{mandal}'
  | 'GET /godbypoet/{sungfor}/{sungby}'
  | 'GET /godcategory/{sungforcategory}'
  | 'GET /godcategorybypoetcategory/{sungforcategory}/{sungbycategory}'

type RigVedaPagination = {
  total: number
  returned: number
  limit: number
  offset: number
  nextOffset?: number | undefined
  maxLimit: number
}

type RigVedaFacetSummary = {
  meters: string[]
  poets: string[]
  poetCategories: string[]
  gods: string[]
  godCategories: string[]
}

export type RigVedaBookQuery = {
  mandal: number
  limit: number
  offset: number
}

export type RigVedaSearchQuery = {
  field: RigVedaSearchField
  value: string
  mandal?: number | undefined
  poet?: string | undefined
  poetCategory?: RigVedaPoetCategory | undefined
  limit: number
  offset: number
}

export type RigVedaBookResult = {
  kind: 'rigveda.book'
  api: RigVedaApiMeta
  query: RigVedaBookQuery
  pagination: RigVedaPagination
  count: number
  facets: RigVedaFacetSummary
  verses: RigVedaRecord[]
}

export type RigVedaSearchResult = {
  kind: 'rigveda.search'
  api: RigVedaApiMeta
  query: RigVedaSearchQuery
  pagination: RigVedaPagination
  count: number
  facets: RigVedaFacetSummary
  verses: RigVedaRecord[]
}

export async function getRigVedaBook(
  input: RigVedaBookInput = {},
): Promise<RigVedaBookResult> {
  const query = normalizeRigVedaBookInput(input)
  const records = await new RigVedaClient().book(query.mandal)
  const page = paginateRecords(records, query)
  return {
    kind: 'rigveda.book',
    api: createApiMeta('GET /book/{mandal}'),
    query,
    pagination: page.pagination,
    count: page.records.length,
    facets: summarizeFacets(records),
    verses: page.records,
  }
}

export async function searchRigVeda(
  input: RigVedaSearchInput = {},
): Promise<RigVedaSearchResult> {
  const query = normalizeRigVedaSearchInput(input)
  const client = new RigVedaClient()
  const records = await fetchSearchRecords(client, query)
  const page = paginateRecords(records, query)
  return {
    kind: 'rigveda.search',
    api: createApiMeta(endpointForSearchField(query.field)),
    query,
    pagination: page.pagination,
    count: page.records.length,
    facets: summarizeFacets(records),
    verses: page.records,
  }
}

export function normalizeRigVedaBookInput(
  input: RigVedaBookInput = {},
): RigVedaBookQuery {
  return {
    mandal: normalizeMandal(input.mandal, 'Rig Veda --mandal'),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }
}

export function normalizeRigVedaSearchInput(
  input: RigVedaSearchInput = {},
): RigVedaSearchQuery {
  const field = normalizeSearchField(input.field)
  const value = normalizeSearchValue(input.value ?? defaultValueForField(field))
  const base = {
    field,
    value: normalizeFieldValue(field, value),
    limit: normalizeLimit(input.limit),
    offset: normalizeOffset(input.offset),
  }

  if (field === 'god-in-book') {
    return {
      ...base,
      mandal: normalizeMandal(
        input.mandal ?? RIG_VEDA_DEFAULT_SEARCH_MANDAL,
        'Rig Veda --mandal',
      ),
    }
  }
  if (field === 'god-by-poet') {
    return {
      ...base,
      poet: normalizeSearchValue(input.poet ?? RIG_VEDA_DEFAULT_POET),
    }
  }
  if (field === 'god-category-by-poet-category') {
    return {
      ...base,
      poetCategory: normalizePoetCategory(
        input.poetCategory ?? RIG_VEDA_DEFAULT_POET_CATEGORY,
      ),
    }
  }

  return base
}

function fetchSearchRecords(
  client: RigVedaClient,
  query: RigVedaSearchQuery,
): Promise<RigVedaRecord[]> {
  switch (query.field) {
    case 'god':
      return client.god(query.value)
    case 'poet':
      return client.poet(query.value)
    case 'meter':
      return client.meter(query.value)
    case 'poet-category':
      return client.poetCategory(query.value)
    case 'god-category':
      return client.godCategory(query.value)
    case 'god-in-book':
      return client.godInBook(query.value, query.mandal ?? RIG_VEDA_DEFAULT_MANDAL)
    case 'god-by-poet':
      return client.godByPoet(query.value, query.poet ?? RIG_VEDA_DEFAULT_POET)
    case 'god-category-by-poet-category':
      return client.godCategoryByPoetCategory(
        query.value,
        query.poetCategory ?? RIG_VEDA_DEFAULT_POET_CATEGORY,
      )
  }
}

function paginateRecords(
  records: RigVedaRecord[],
  query: { limit: number; offset: number },
): { records: RigVedaRecord[]; pagination: RigVedaPagination } {
  const sliced = records.slice(query.offset, query.offset + query.limit)
  const nextOffset = query.offset + query.limit < records.length
    ? query.offset + query.limit
    : undefined
  return {
    records: sliced,
    pagination: {
      total: records.length,
      returned: sliced.length,
      limit: query.limit,
      offset: query.offset,
      ...(nextOffset !== undefined ? { nextOffset } : {}),
      maxLimit: RIG_VEDA_MAX_LIMIT,
    },
  }
}

function summarizeFacets(records: RigVedaRecord[]): RigVedaFacetSummary {
  return {
    meters: summarizeUnique(records.map(record => record.meter)),
    poets: summarizeUnique(records.map(record => record.sungby)),
    poetCategories: summarizeUnique(records.map(record => record.sungbycategory)),
    gods: summarizeUnique(records.map(record => record.sungfor)),
    godCategories: summarizeUnique(records.map(record => record.sungforcategory)),
  }
}

function summarizeUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function createApiMeta(endpoint: RigVedaEndpoint): RigVedaApiMeta {
  return {
    provider: 'rigveda',
    endpoint,
    docsUrl: 'https://aninditabasu.github.io/indica/topics/api_rv.html',
    openApiUrl: 'https://aninditabasu.github.io/indica/assets/openapi_rv.json',
    apiUrl: 'https://indica-1hwj.onrender.com/rv/v2/meta',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'Read-only Rig Veda metadata endpoints only; static HTML pages,',
      'browser scraping, arbitrary route proxying, warning text, upload,',
      'delete, and account workflows are excluded.',
    ].join(' '),
    legacyListedUrl: [
      'The public-apis listed /indica/html/rv.html URL now returns GitHub',
      'Pages 404; current same-project docs and OpenAPI JSON are used.',
    ].join(' '),
    queryPolicy: [
      'String path parameters are bounded and reject slash, control, query,',
      'and fragment characters before requests are sent.',
    ].join(' '),
    categoryPolicy: [
      'Poet and god categories are locally validated against documented',
      'enums to avoid treating HTTP 200 text/html warnings as data.',
    ].join(' '),
    paginationPolicy: [
      'Upstream endpoints are unpaginated arrays; CLI applies local limit',
      `and offset with limit cap ${RIG_VEDA_MAX_LIMIT}.`,
    ].join(' '),
    excluded: [
      'Deprecated /indica/html/rv.html page',
      'Historical Heroku or guessed hosts',
      'Undocumented raw path proxying',
      'HTML warning payloads',
      'Browser scraping or clickstream',
    ],
  }
}

function endpointForSearchField(field: RigVedaSearchField): RigVedaEndpoint {
  switch (field) {
    case 'god':
      return 'GET /god/{sungfor}'
    case 'poet':
      return 'GET /poet/{sungby}'
    case 'meter':
      return 'GET /meter/{meter}'
    case 'poet-category':
      return 'GET /poetcategory/{sungbycategory}'
    case 'god-category':
      return 'GET /godcategory/{sungforcategory}'
    case 'god-in-book':
      return 'GET /god/{sungfor}/{mandal}'
    case 'god-by-poet':
      return 'GET /godbypoet/{sungfor}/{sungby}'
    case 'god-category-by-poet-category':
      return 'GET /godcategorybypoetcategory/{sungforcategory}/{sungbycategory}'
  }
}

function normalizeSearchField(value: string | undefined): RigVedaSearchField {
  const field = (value ?? RIG_VEDA_DEFAULT_FIELD).trim().toLowerCase()
  if (RIG_VEDA_SEARCH_FIELDS.includes(field as RigVedaSearchField)) {
    return field as RigVedaSearchField
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Rig Veda --field must be one of ${RIG_VEDA_SEARCH_FIELDS.join(', ')}.`,
    { field: value },
  )
}

function normalizeFieldValue(field: RigVedaSearchField, value: string): string {
  if (field === 'poet-category') return normalizePoetCategory(value)
  if (
    field === 'god-category'
    || field === 'god-category-by-poet-category'
  ) {
    return normalizeGodCategory(value)
  }
  return value
}

function defaultValueForField(field: RigVedaSearchField): string {
  if (field === 'poet') return 'tra'
  if (field === 'meter') return 'tup'
  if (field === 'poet-category') return RIG_VEDA_DEFAULT_POET_CATEGORY
  if (field === 'god-category') return 'divine male'
  if (field === 'god-in-book') return 'agni'
  if (field === 'god-by-poet') return 'agni'
  if (field === 'god-category-by-poet-category') return 'divine male'
  return RIG_VEDA_DEFAULT_VALUE
}

function normalizePoetCategory(value: string): RigVedaPoetCategory {
  const category = normalizeCategoryValue(value)
  if (RIG_VEDA_POET_CATEGORIES.includes(category as RigVedaPoetCategory)) {
    return category as RigVedaPoetCategory
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    [
      'Rig Veda --value/--poet-category for poet categories must be one of',
      `${RIG_VEDA_POET_CATEGORIES.join(', ')}.`,
    ].join(' '),
    { value },
  )
}

function normalizeGodCategory(value: string): RigVedaGodCategory {
  const category = normalizeCategoryValue(value)
  if (RIG_VEDA_GOD_CATEGORIES.includes(category as RigVedaGodCategory)) {
    return category as RigVedaGodCategory
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    [
      'Rig Veda --value for god categories must be one of',
      `${RIG_VEDA_GOD_CATEGORIES.join(', ')}.`,
    ].join(' '),
    { value },
  )
}

function normalizeCategoryValue(value: string): string {
  return normalizeSearchValue(value).toLowerCase()
}

function normalizeSearchValue(value: string): string {
  const text = value.trim()
  if (text.length < 1 || text.length > 80) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Rig Veda text parameters must be between 1 and 80 characters.',
      { value },
    )
  }
  if (hasUnsafePathCharacter(text)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Rig Veda text parameters must not include slash, query, fragment,',
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

function normalizeMandal(value: number | undefined, label: string): number {
  const mandal = value ?? RIG_VEDA_DEFAULT_MANDAL
  if (!Number.isInteger(mandal) || mandal < 1 || mandal > 10) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${label} must be an integer from 1 to 10.`,
      { mandal: value },
    )
  }
  return mandal
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? RIG_VEDA_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > RIG_VEDA_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Rig Veda --limit must be an integer from 1 to ${RIG_VEDA_MAX_LIMIT}.`,
      { limit: value },
    )
  }
  return limit
}

function normalizeOffset(value: number | undefined): number {
  const offset = value ?? 0
  if (!Number.isInteger(offset) || offset < 0 || offset > RIG_VEDA_MAX_OFFSET) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Rig Veda --offset must be an integer from 0 to ${RIG_VEDA_MAX_OFFSET}.`,
      { offset: value },
    )
  }
  return offset
}
