import {
  clampPoetryDbLineLimit,
  normalizePoetryDbRandomQuery,
  normalizePoetryDbSearchQuery,
  PoetryDbClient,
  POETRYDB_DEFAULT_LINE_LIMIT,
  POETRYDB_DEFAULT_RANDOM_COUNT,
  POETRYDB_DEFAULT_SEARCH_COUNT,
  POETRYDB_MAX_COUNT,
  POETRYDB_MAX_LINE_LIMIT,
  type PoetryDbPoem,
  type PoetryDbSearchField,
} from '../../infrastructure/openApis/poetryDbClient.js'

export type PoetryDbSearchInput = {
  field?: PoetryDbSearchField | undefined
  term?: string | undefined
  exact?: boolean | undefined
  count?: number | undefined
  includeLines?: boolean | undefined
  lineLimit?: number | undefined
}

export type PoetryDbRandomInput = {
  count?: number | undefined
  includeLines?: boolean | undefined
  lineLimit?: number | undefined
}

export async function searchPoetryDb(input: PoetryDbSearchInput = {}): Promise<Record<string, unknown>> {
  const client = new PoetryDbClient()
  const query = normalizePoetryDbSearchQuery(input)
  const lineLimit = clampPoetryDbLineLimit(input.lineLimit)
  const poems = await client.search(query)
  return {
    kind: 'poetrydb.search',
    api: createPoetryDbApiMeta('GET /{field}/{term}/poemcount/{count}/{fields}.json'),
    query: { ...query, lineLimit },
    count: poems.length,
    poems: poems.map(poem => projectPoem(poem, lineLimit)),
  }
}

export async function getPoetryDbRandom(input: PoetryDbRandomInput = {}): Promise<Record<string, unknown>> {
  const client = new PoetryDbClient()
  const query = normalizePoetryDbRandomQuery(input)
  const lineLimit = clampPoetryDbLineLimit(input.lineLimit)
  const poems = await client.random(query)
  return {
    kind: 'poetrydb.random',
    api: createPoetryDbApiMeta('GET /random/{count}/{fields}.json'),
    query: { ...query, lineLimit },
    count: poems.length,
    poems: poems.map(poem => projectPoem(poem, lineLimit)),
  }
}

function createPoetryDbApiMeta(endpoint: string): Record<string, unknown> {
  return {
    provider: 'poetrydb',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    documentedDefaultFormat: 'json',
    documentedMaximumCount: 'not documented',
    cliDefaultSearchCount: POETRYDB_DEFAULT_SEARCH_COUNT,
    cliDefaultRandomCount: POETRYDB_DEFAULT_RANDOM_COUNT,
    cliCountCap: POETRYDB_MAX_COUNT,
    cliDefaultLineLimit: POETRYDB_DEFAULT_LINE_LIMIT,
    cliLineLimitCap: POETRYDB_MAX_LINE_LIMIT,
    docs: 'https://github.com/thundercomb/poetrydb#readme',
  }
}

function projectPoem(poem: PoetryDbPoem, lineLimit: number): Record<string, unknown> {
  return {
    title: poem.title,
    author: poem.author,
    ...(poem.linecount !== undefined ? { linecount: poem.linecount } : {}),
    lines: poem.lines.slice(0, lineLimit),
    truncatedLines: Math.max(poem.lines.length - lineLimit, 0),
  }
}
