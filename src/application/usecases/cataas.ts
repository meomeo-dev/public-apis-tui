import {
  CATAAS_DEFAULT_BASE_URL,
  CataasClient,
  type CataasCatsQuery,
  type CataasListedCat,
  type CataasRandomCat,
} from '../../infrastructure/openApis/cataasClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type CataasRandomInput = {
  tag?: string | undefined
}

export type CataasCatsInput = {
  tags?: string | undefined
  skip?: number | undefined
  limit?: number | undefined
}

export type CataasApiMeta = {
  provider: 'cataas'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: string
  docsUrl: 'https://cataas.com/doc.html'
  usesBrowserClickstream: false
  authentication: 'none'
}

export type CataasRandomCatResult = {
  kind: 'cataas.cat'
  api: CataasApiMeta
  query: CataasRandomInput
  cat: {
    id: string
    tags: string[]
    createdAt: string
    url: string
    mimetype: string
  }
}

export type CataasTagsResult = {
  kind: 'cataas.tags'
  api: CataasApiMeta
  query: Record<string, never>
  total: number
  tags: string[]
}

export type CataasCatsResult = {
  kind: 'cataas.cats'
  api: CataasApiMeta
  query: CataasCatsQuery
  count: number
  cats: Array<{
    id: string
    tags: string[]
    createdAt: string
    mimetype: string
    url: string
  }>
}

export async function getCataasRandomCat(input: CataasRandomInput = {}): Promise<CataasRandomCatResult> {
  const query = normalizeRandomInput(input)
  const client = new CataasClient()
  const cat = await client.getRandomCat(query)
  return {
    kind: 'cataas.cat',
    api: createApiMeta(query.tag === undefined ? 'GET /cat?json=true' : 'GET /cat/:tag?json=true'),
    query,
    cat: toRandomCat(cat),
  }
}

export async function listCataasTags(): Promise<CataasTagsResult> {
  const client = new CataasClient()
  const tags = await client.listTags()
  return {
    kind: 'cataas.tags',
    api: createApiMeta('GET /api/tags'),
    query: {},
    total: tags.length,
    tags,
  }
}

export async function listCataasCats(input: CataasCatsInput = {}): Promise<CataasCatsResult> {
  const query = normalizeCatsInput(input)
  const client = new CataasClient()
  const cats = await client.listCats(query)
  return {
    kind: 'cataas.cats',
    api: createApiMeta('GET /api/cats'),
    query,
    count: cats.length,
    cats: cats.map(toListedCat),
  }
}

function createApiMeta(endpoint: string): CataasApiMeta {
  return {
    provider: 'cataas',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://cataas.com/doc.html',
    usesBrowserClickstream: false,
    authentication: 'none',
  }
}

function normalizeRandomInput(input: CataasRandomInput): CataasRandomInput {
  return {
    tag: normalizeText(input.tag),
  }
}

function normalizeCatsInput(input: CataasCatsInput): CataasCatsQuery {
  return {
    tags: normalizeText(input.tags),
    skip: normalizeNonNegativeInteger(input.skip, 'skip'),
    limit: normalizePositiveInteger(input.limit, 'limit'),
  }
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized
}

function normalizeNonNegativeInteger(value: number | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Cataas --${label} must be a non-negative integer.`, { [label]: value })
  }
  return value
}

function normalizePositiveInteger(value: number | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Cataas --${label} must be a positive integer.`, { [label]: value })
  }
  return value
}

function toRandomCat(cat: CataasRandomCat): CataasRandomCatResult['cat'] {
  return {
    id: cat.id,
    tags: cat.tags,
    createdAt: cat.created_at,
    url: cat.url,
    mimetype: cat.mimetype,
  }
}

function toListedCat(cat: CataasListedCat): CataasCatsResult['cats'][number] {
  return {
    id: cat.id,
    tags: cat.tags,
    createdAt: cat.createdAt,
    mimetype: cat.mimetype,
    url: `${CATAAS_DEFAULT_BASE_URL}/cat/${encodeURIComponent(cat.id)}`,
  }
}
