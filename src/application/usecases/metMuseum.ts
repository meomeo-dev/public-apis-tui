import { MetMuseumClient, type MetMuseumObject } from '../../infrastructure/openApis/metMuseumClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type MetMuseumSearchInput = {
  query?: string | undefined
  departmentId?: number | undefined
  hasImages?: boolean | undefined
  isPublicDomain?: boolean | undefined
  limit?: number | undefined
  detailLimit?: number | undefined
}

export type MetMuseumObjectInput = {
  objectId: number
}

export type MetMuseumDepartmentsInput = {
  limit?: number | undefined
}

export type MetMuseumApiMeta = {
  provider: 'metmuseum'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /search' | 'GET /objects/:objectID' | 'GET /departments'
  docsUrl: 'https://metmuseum.github.io/'
  baseUrl: 'https://collectionapi.metmuseum.org/public/collection/v1'
  usesBrowserClickstream: false
  authentication: 'none'
  rateLimit: '80 requests/second'
  documentedMaximumResult: 'Search returns matching object ids; CLI caps ids at 100 and hydrated details at 20'
}

export type MetMuseumObjectResult = {
  objectId: number
  title: string
  department: string
  objectName: string
  artistDisplayName: string
  objectDate: string
  medium: string
  dimensions: string
  isPublicDomain: boolean
  primaryImage?: string | undefined
  primaryImageSmall?: string | undefined
  objectUrl: string
}

export type MetMuseumSearchResult = {
  kind: 'metmuseum.search'
  api: MetMuseumApiMeta
  query: {
    query: string
    departmentId?: number | undefined
    hasImages?: boolean | undefined
    isPublicDomain?: boolean | undefined
    limit: number
    detailLimit: number
  }
  total: number
  count: number
  objectIds: number[]
  objects: MetMuseumObjectResult[]
}

export type MetMuseumObjectLookupResult = {
  kind: 'metmuseum.object'
  api: MetMuseumApiMeta
  query: {
    objectId: number
  }
  object: MetMuseumObjectResult
}

export type MetMuseumDepartmentsResult = {
  kind: 'metmuseum.departments'
  api: MetMuseumApiMeta
  query: {
    limit: number
  }
  count: number
  departments: Array<{
    departmentId: number
    displayName: string
  }>
}

export async function searchMetMuseum(input: MetMuseumSearchInput = {}): Promise<MetMuseumSearchResult> {
  const query = normalizeSearchInput(input)
  const client = new MetMuseumClient()
  const search = await client.searchObjects({
    q: query.query,
    departmentId: query.departmentId,
    hasImages: query.hasImages,
    isPublicDomain: query.isPublicDomain,
  })
  const objectIds = search.objectIDs.slice(0, query.limit)
  const hydratedIds = objectIds.slice(0, query.detailLimit)
  const objects = await Promise.all(hydratedIds.map(objectId => client.getObject(objectId).then(toObjectResult)))
  return {
    kind: 'metmuseum.search',
    api: createApiMeta('GET /search'),
    query,
    total: search.total,
    count: objectIds.length,
    objectIds,
    objects,
  }
}

export async function getMetMuseumObject(input: MetMuseumObjectInput): Promise<MetMuseumObjectLookupResult> {
  const query = { objectId: normalizeObjectId(input.objectId) }
  const client = new MetMuseumClient()
  return {
    kind: 'metmuseum.object',
    api: createApiMeta('GET /objects/:objectID'),
    query,
    object: toObjectResult(await client.getObject(query.objectId)),
  }
}

export async function listMetMuseumDepartments(input: MetMuseumDepartmentsInput = {}): Promise<MetMuseumDepartmentsResult> {
  const query = { limit: normalizeLimit(input.limit, 100, 'limit') }
  const client = new MetMuseumClient()
  const departments = (await client.listDepartments()).slice(0, query.limit)
  return {
    kind: 'metmuseum.departments',
    api: createApiMeta('GET /departments'),
    query,
    count: departments.length,
    departments,
  }
}

function normalizeSearchInput(input: MetMuseumSearchInput): MetMuseumSearchResult['query'] {
  return {
    query: normalizeQuery(input.query),
    ...normalizeOptionalInteger(input.departmentId, 'departmentId'),
    ...normalizeOptionalBoolean(input.hasImages, 'hasImages'),
    ...normalizeOptionalBoolean(input.isPublicDomain, 'isPublicDomain'),
    limit: normalizeLimit(input.limit, 100, 'limit'),
    detailLimit: normalizeLimit(input.detailLimit, 20, 'detailLimit', 5),
  }
}

function normalizeQuery(value: string | undefined): string {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Met Museum search requires --query text.', {
      option: 'query',
    })
  }
  return normalized
}

function normalizeObjectId(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Met Museum --object-id must be a positive integer.', {
      objectId: value,
    })
  }
  return value
}

function normalizeLimit(value: number | undefined, max: number, label: string, defaultValue = max): number {
  const limit = value ?? defaultValue
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Met Museum --${label.replace(/[A-Z]/gu, match => `-${match.toLowerCase()}`)} must be an integer from 1 to ${max}.`, {
      [label]: value,
    })
  }
  return limit
}

function normalizeOptionalInteger<TName extends 'departmentId'>(
  value: number | undefined,
  name: TName,
): { [key in TName]?: number } {
  if (value === undefined) {
    return {}
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Met Museum --department-id must be a positive integer.', {
      departmentId: value,
    })
  }
  return { [name]: value } as { [key in TName]?: number }
}

function normalizeOptionalBoolean<TName extends 'hasImages' | 'isPublicDomain'>(
  value: boolean | undefined,
  name: TName,
): { [key in TName]?: boolean } {
  return value === undefined ? {} : { [name]: value } as { [key in TName]?: boolean }
}

function toObjectResult(object: MetMuseumObject): MetMuseumObjectResult {
  return {
    objectId: object.objectID,
    title: object.title,
    department: object.department,
    objectName: object.objectName,
    artistDisplayName: object.artistDisplayName,
    objectDate: object.objectDate,
    medium: object.medium,
    dimensions: object.dimensions,
    isPublicDomain: object.isPublicDomain,
    ...(object.primaryImage.trim() !== '' ? { primaryImage: object.primaryImage } : {}),
    ...(object.primaryImageSmall.trim() !== '' ? { primaryImageSmall: object.primaryImageSmall } : {}),
    objectUrl: object.objectURL,
  }
}

function createApiMeta(endpoint: MetMuseumApiMeta['endpoint']): MetMuseumApiMeta {
  return {
    provider: 'metmuseum',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://metmuseum.github.io/',
    baseUrl: 'https://collectionapi.metmuseum.org/public/collection/v1',
    usesBrowserClickstream: false,
    authentication: 'none',
    rateLimit: '80 requests/second',
    documentedMaximumResult: 'Search returns matching object ids; CLI caps ids at 100 and hydrated details at 20',
  }
}
