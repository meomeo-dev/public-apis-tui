import {
  IsroClient,
  ISRO_RESOURCES,
  normalizeIsroResource,
  type IsroCatalogItem,
  type IsroResource,
} from '../../infrastructure/openApis/isroClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ISRO_DEFAULT_RESOURCE: IsroResource = 'spacecrafts'
export const ISRO_DEFAULT_LIMIT = 20
export const ISRO_MAX_LIMIT = 100
export const ISRO_MAX_OFFSET = 500

export type IsroCatalogInput = {
  resource?: string | undefined
  search?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type IsroCatalogQuery = {
  resource: IsroResource
  search?: string | undefined
  limit: number
  offset: number
}

export type IsroCatalogResult = {
  kind: 'isro.catalog'
  api: {
    provider: 'isro'
    endpoint: 'GET /api/{resource}'
    docsUrl: 'https://github.com/isro/api'
    apiUrl: 'https://isro.vercel.app/api/'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    availableResources: IsroResource[]
    excludedResources: string[]
    boundary: string
    limitPolicy: string
  }
  query: IsroCatalogQuery
  pagination: {
    total: number
    matched: number
    returned: number
    offset: number
    limit: number
    hasMore: boolean
  }
  items: IsroCatalogItem[]
}

export async function listIsroCatalog(
  input: IsroCatalogInput = {},
): Promise<IsroCatalogResult> {
  const query = normalizeIsroCatalogInput(input)
  const items = await new IsroClient().listResource(query.resource) as IsroCatalogItem[]
  const filtered = filterItems(items, query.search)
  const page = filtered.slice(query.offset, query.offset + query.limit)

  return {
    kind: 'isro.catalog',
    api: createApiMeta(),
    query,
    pagination: {
      total: items.length,
      matched: filtered.length,
      returned: page.length,
      offset: query.offset,
      limit: query.limit,
      hasMore: query.offset + page.length < filtered.length,
    },
    items: page,
  }
}

export function normalizeIsroCatalogInput(
  input: IsroCatalogInput = {},
): IsroCatalogQuery {
  const resource = normalizeIsroResource(input.resource ?? ISRO_DEFAULT_RESOURCE)
  const search = normalizeSearch(input.search)
  const limit = normalizeInteger({
    name: 'limit',
    value: input.limit,
    defaultValue: ISRO_DEFAULT_LIMIT,
    min: 1,
    max: ISRO_MAX_LIMIT,
  })
  const offset = normalizeInteger({
    name: 'offset',
    value: input.offset,
    defaultValue: 0,
    min: 0,
    max: ISRO_MAX_OFFSET,
  })
  return {
    resource,
    ...(search !== undefined ? { search } : {}),
    limit,
    offset,
  }
}

function createApiMeta(): IsroCatalogResult['api'] {
  return {
    provider: 'isro',
    endpoint: 'GET /api/{resource}',
    docsUrl: 'https://github.com/isro/api',
    apiUrl: 'https://isro.vercel.app/api/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    availableResources: [...ISRO_RESOURCES],
    excludedResources: ['spacecraft_missions'],
    boundary: [
      'Read-only JSON catalog resources only; no API key, OAuth, account',
      'setup, browser clickstream, scraping, upload, delete, share, binary',
      'payload, or guessed mission endpoint exposure.',
    ].join(' '),
    limitPolicy: [
      'The upstream API returns whole resource arrays. The CLI applies local',
      `search, offset, and a ${ISRO_MAX_LIMIT} row limit cap for readable`,
      'terminal and cache output.',
    ].join(' '),
  }
}

function filterItems<TItem extends IsroCatalogItem>(
  items: TItem[],
  search: string | undefined,
): TItem[] {
  if (search === undefined) return items
  const needle = search.toLowerCase()
  return items.filter(item => Object.values(item).some(value => (
    String(value).toLowerCase().includes(needle)
  )))
}

function normalizeSearch(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function normalizeInteger(input: {
  name: string
  value: number | undefined
  defaultValue: number
  min: number
  max: number
}): number {
  const value = input.value ?? input.defaultValue
  if (!Number.isInteger(value)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `ISRO --${input.name} must be an integer.`,
      { [input.name]: input.value },
    )
  }
  if (value < input.min || value > input.max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `ISRO --${input.name} must be between ${input.min} and ${input.max}.`,
      { [input.name]: input.value },
    )
  }
  return value
}

export type { IsroCatalogItem, IsroResource } from '../../infrastructure/openApis/isroClient.js'
