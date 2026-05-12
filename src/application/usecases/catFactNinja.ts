import {
  CatFactNinjaClient,
  type CatBreed,
  type CatBreedsQuery,
  type CatFact,
  type CatFactPagination,
  type CatFactQuery,
  type CatFactsQuery,
} from '../../infrastructure/openApis/catFactNinjaClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type CatFactNinjaFactInput = {
  maxLength?: number | undefined
}

export type CatFactNinjaListInput = {
  maxLength?: number | undefined
  limit?: number | undefined
  page?: number | undefined
}

export type CatFactNinjaBreedsInput = {
  limit?: number | undefined
  page?: number | undefined
}

type CatFactNinjaApiMeta = {
  provider: 'catfact-ninja'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: string
  usesBrowserClickstream: false
  authentication: 'none'
  docsUrl: 'https://catfact.ninja/docs'
}

export type CatFactNinjaPagination = {
  currentPage: number
  from?: number | undefined
  lastPage: number
  nextPageUrl?: string | undefined
  pageUrl: string
  perPage: number
  prevPageUrl?: string | undefined
  to?: number | undefined
  total: number
}

export type CatFactNinjaFactResult = {
  kind: 'catfact.fact'
  api: CatFactNinjaApiMeta
  query: CatFactQuery
  fact: CatFact
}

export type CatFactNinjaFactsResult = {
  kind: 'catfact.facts'
  api: CatFactNinjaApiMeta
  query: CatFactsQuery
  pagination: CatFactNinjaPagination
  facts: CatFact[]
}

export type CatFactNinjaBreedsResult = {
  kind: 'catfact.breeds'
  api: CatFactNinjaApiMeta
  query: CatBreedsQuery
  pagination: CatFactNinjaPagination
  breeds: CatBreed[]
}

export async function getCatFactNinjaRandomFact(
  input: CatFactNinjaFactInput = {},
): Promise<CatFactNinjaFactResult> {
  const query = normalizeFactQuery(input)
  const client = new CatFactNinjaClient()
  return {
    kind: 'catfact.fact',
    api: createApiMeta('GET /fact'),
    query,
    fact: await client.getRandomFact(query),
  }
}

export async function listCatFactNinjaFacts(
  input: CatFactNinjaListInput = {},
): Promise<CatFactNinjaFactsResult> {
  const query = normalizeFactsQuery(input)
  const client = new CatFactNinjaClient()
  const response = await client.listFacts(query)
  return {
    kind: 'catfact.facts',
    api: createApiMeta('GET /facts'),
    query,
    pagination: toPagination(response),
    facts: response.data,
  }
}

export async function listCatFactNinjaBreeds(
  input: CatFactNinjaBreedsInput = {},
): Promise<CatFactNinjaBreedsResult> {
  const query = normalizeBreedsQuery(input)
  const client = new CatFactNinjaClient()
  const response = await client.listBreeds(query)
  return {
    kind: 'catfact.breeds',
    api: createApiMeta('GET /breeds'),
    query,
    pagination: toPagination(response),
    breeds: response.data,
  }
}

function createApiMeta(endpoint: string): CatFactNinjaApiMeta {
  return {
    provider: 'catfact-ninja',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    usesBrowserClickstream: false,
    authentication: 'none',
    docsUrl: 'https://catfact.ninja/docs',
  }
}

function normalizeFactQuery(input: CatFactNinjaFactInput): CatFactQuery {
  return {
    maxLength: normalizePositiveInteger(input.maxLength, 'maxLength'),
  }
}

function normalizeFactsQuery(input: CatFactNinjaListInput): CatFactsQuery {
  return {
    maxLength: normalizePositiveInteger(input.maxLength, 'maxLength'),
    limit: normalizePositiveInteger(input.limit, 'limit'),
    page: normalizePositiveInteger(input.page, 'page'),
  }
}

function normalizeBreedsQuery(input: CatFactNinjaBreedsInput): CatBreedsQuery {
  return {
    limit: normalizePositiveInteger(input.limit, 'limit'),
    page: normalizePositiveInteger(input.page, 'page'),
  }
}

function normalizePositiveInteger(value: number | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `CatFact Ninja --${label} must be a positive integer.`, {
      [label]: value,
    })
  }

  return value
}

function toPagination<T>(response: CatFactPagination<T>): CatFactNinjaPagination {
  return {
    currentPage: response.current_page,
    ...(response.from !== null ? { from: response.from } : {}),
    lastPage: response.last_page,
    ...(response.next_page_url !== null ? { nextPageUrl: response.next_page_url } : {}),
    pageUrl: response.path,
    perPage: response.per_page,
    ...(response.prev_page_url !== null ? { prevPageUrl: response.prev_page_url } : {}),
    ...(response.to !== null ? { to: response.to } : {}),
    total: response.total,
  }
}
