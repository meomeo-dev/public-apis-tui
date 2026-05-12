import {
  ItisClient,
  normalizeItisTsn,
  type ItisFullRecord,
  type ItisScientificName,
} from '../../infrastructure/openApis/itisClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ITIS_DEFAULT_SEARCH = 'Quercus robur'
export const ITIS_DEFAULT_TSN = '19405'
export const ITIS_DEFAULT_LIMIT = 10
export const ITIS_MAX_LIMIT = 50
export const ITIS_MAX_OFFSET = 500

export type ItisSearchInput = {
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type ItisRecordInput = {
  tsn?: string | undefined
  commonLimit?: number | undefined
  synonymLimit?: number | undefined
}

export type ItisSearchQuery = {
  query: string
  limit: number
  offset: number
}

export type ItisSearchResult = {
  kind: 'itis.search'
  api: ItisApiMeta
  query: ItisSearchQuery
  pagination: {
    matched: number
    returned: number
    offset: number
    limit: number
    hasMore: boolean
  }
  names: ItisScientificName[]
}

export type ItisRecordResult = {
  kind: 'itis.record'
  api: ItisApiMeta
  query: {
    tsn: string
    commonLimit: number
    synonymLimit: number
  }
  record: ItisFullRecord & {
    links: {
      report: string
      hierarchy: string
    }
  }
  counts: {
    commonNames: number
    synonyms: number
    jurisdictionalOrigins: number
  }
}

type ItisApiMeta = {
  provider: 'itis'
  endpoint: string
  docsUrl: 'https://www.itis.gov/ws_description.html'
  apiUrl: 'https://www.itis.gov/ITISWebService/jsonservice/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  contentType: 'text/json'
  boundary: string
  limitPolicy: string
}

export async function searchItisScientificNames(
  input: ItisSearchInput = {},
): Promise<ItisSearchResult> {
  const query = normalizeItisSearchInput(input)
  const allNames = await new ItisClient().searchByScientificName({
    search: query.query,
  })
  const page = allNames.slice(query.offset, query.offset + query.limit)
  return {
    kind: 'itis.search',
    api: createApiMeta('GET /searchByScientificName?srchKey={query}'),
    query,
    pagination: {
      matched: allNames.length,
      returned: page.length,
      offset: query.offset,
      limit: query.limit,
      hasMore: query.offset + page.length < allNames.length,
    },
    names: page,
  }
}

export async function getItisRecord(
  input: ItisRecordInput = {},
): Promise<ItisRecordResult> {
  const query = normalizeItisRecordInput(input)
  const record = await new ItisClient().getFullRecordFromTsn(query.tsn)
  const commonNames = record.commonNames.slice(0, query.commonLimit)
  const synonyms = record.synonyms.slice(0, query.synonymLimit)
  return {
    kind: 'itis.record',
    api: createApiMeta('GET /getFullRecordFromTSN?tsn={tsn}'),
    query,
    record: {
      ...record,
      commonNames,
      synonyms,
      links: {
        report: `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=${query.tsn}`,
        hierarchy: `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=${query.tsn}#hierarchy`,
      },
    },
    counts: {
      commonNames: record.commonNames.length,
      synonyms: record.synonyms.length,
      jurisdictionalOrigins: record.jurisdictionalOrigins.length,
    },
  }
}

export function normalizeItisSearchInput(
  input: ItisSearchInput = {},
): ItisSearchQuery {
  const query = normalizeQuery(input.query)
  const limit = normalizeInteger({
    name: 'limit',
    value: input.limit,
    defaultValue: ITIS_DEFAULT_LIMIT,
    min: 1,
    max: ITIS_MAX_LIMIT,
  })
  const offset = normalizeInteger({
    name: 'offset',
    value: input.offset,
    defaultValue: 0,
    min: 0,
    max: ITIS_MAX_OFFSET,
  })
  return { query, limit, offset }
}

export function normalizeItisRecordInput(
  input: ItisRecordInput = {},
): ItisRecordResult['query'] {
  const tsn = normalizeItisTsn(input.tsn ?? ITIS_DEFAULT_TSN)
  const commonLimit = normalizeInteger({
    name: 'commonLimit',
    value: input.commonLimit,
    defaultValue: 5,
    min: 0,
    max: 20,
  })
  const synonymLimit = normalizeInteger({
    name: 'synonymLimit',
    value: input.synonymLimit,
    defaultValue: 10,
    min: 0,
    max: 30,
  })
  return { tsn, commonLimit, synonymLimit }
}

function createApiMeta(endpoint: string): ItisApiMeta {
  return {
    provider: 'itis',
    endpoint,
    docsUrl: 'https://www.itis.gov/ws_description.html',
    apiUrl: 'https://www.itis.gov/ITISWebService/jsonservice/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    contentType: 'text/json',
    boundary: [
      'Read-only ITIS JSON service calls only; no API key, OAuth, account',
      'setup, cookies, browser clickstream, HTML scraping, SOAP client',
      'generation, bulk database downloads, or arbitrary service proxying.',
    ].join(' '),
    limitPolicy: [
      'ITIS service calls return bounded taxonomy records for selected',
      'operations; the CLI caps terminal output and cache payloads locally.',
    ].join(' '),
  }
}

function normalizeQuery(value: string | undefined): string {
  const query = (value ?? ITIS_DEFAULT_SEARCH).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'ITIS --query must be between 2 and 120 characters.',
      { query: value },
    )
  }
  return query
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
      `ITIS --${toKebabCase(input.name)} must be an integer.`,
      { [input.name]: input.value },
    )
  }
  if (value < input.min || value > input.max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `ITIS --${toKebabCase(input.name)} must be between ${input.min} and ${input.max}.`,
      { [input.name]: input.value },
    )
  }
  return value
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)
}
