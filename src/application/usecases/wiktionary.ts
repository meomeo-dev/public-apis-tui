import {
  WIKTIONARY_DEFAULT_EXTRACT_CHARS,
  WIKTIONARY_DEFAULT_LIMIT,
  WIKTIONARY_MAX_EXTRACT_CHARS,
  WIKTIONARY_MAX_LIMIT,
  WiktionaryClient,
  normalizeWiktionaryExtractInput,
  normalizeWiktionarySearchInput,
  type WiktionaryExtractInput,
  type WiktionarySearchInput,
} from '../../infrastructure/openApis/wiktionaryClient.js'

type WiktionaryApiMetadata = {
  provider: 'wiktionary'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://www.mediawiki.org/wiki/API:Main_page'
  homepage: 'https://en.wiktionary.org/wiki/Wiktionary:Main_Page'
  transport: 'HTTPS JSON'
  rateLimit: 'Wikimedia public Action API etiquette applies; identify user-agent and avoid high request rates'
  publicApisProject: 'https://github.com/public-apis/public-apis'
}

export type WiktionarySearchResult = {
  kind: 'wiktionary.search'
  api: WiktionaryApiMetadata & {
    endpoint: 'GET /w/api.php?action=query&list=search'
    defaultLimit: number
    limitCap: number
  }
  query: {
    query: string
    limit: number
    offset: number
  }
  pagination: {
    returned: number
    totalHits?: number | undefined
    offset: number
    nextOffset?: number | undefined
    hasNextPage: boolean
  }
  results: Array<{
    pageId: number
    title: string
    size?: number | undefined
    wordCount?: number | undefined
    snippet: string
    timestamp?: string | undefined
    url: string
  }>
}

export type WiktionaryExtractResult = {
  kind: 'wiktionary.extract'
  api: WiktionaryApiMetadata & {
    endpoint: 'GET /w/api.php?action=query&prop=extracts'
    defaultChars: number
    charsCap: number
  }
  query: {
    title: string
    chars: number
    redirects: boolean
  }
  page: {
    pageId?: number | undefined
    title: string
    url: string
    missing: boolean
    extract: string
    extractChars: number
  }
}

export type { WiktionaryExtractInput, WiktionarySearchInput }

export async function searchWiktionary(input: WiktionarySearchInput = {}): Promise<WiktionarySearchResult> {
  const query = normalizeWiktionarySearchInput(input)
  const client = new WiktionaryClient()
  const response = await client.search(query)
  return {
    kind: 'wiktionary.search',
    api: {
      ...createWiktionaryApiMetadata(),
      endpoint: 'GET /w/api.php?action=query&list=search',
      defaultLimit: WIKTIONARY_DEFAULT_LIMIT,
      limitCap: WIKTIONARY_MAX_LIMIT,
    },
    query,
    pagination: {
      returned: response.items.length,
      ...(response.totalHits !== undefined ? { totalHits: response.totalHits } : {}),
      offset: query.offset,
      ...(response.continueOffset !== undefined ? { nextOffset: response.continueOffset } : {}),
      hasNextPage: response.continueOffset !== undefined,
    },
    results: response.items.map(item => ({
      ...item,
      url: `https://en.wiktionary.org/wiki/${encodeURIComponent(item.title.replace(/ /gu, '_'))}`,
    })),
  }
}

export async function extractWiktionary(input: WiktionaryExtractInput = {}): Promise<WiktionaryExtractResult> {
  const query = normalizeWiktionaryExtractInput(input)
  const client = new WiktionaryClient()
  const response = await client.extract(query)
  return {
    kind: 'wiktionary.extract',
    api: {
      ...createWiktionaryApiMetadata(),
      endpoint: 'GET /w/api.php?action=query&prop=extracts',
      defaultChars: WIKTIONARY_DEFAULT_EXTRACT_CHARS,
      charsCap: WIKTIONARY_MAX_EXTRACT_CHARS,
    },
    query,
    page: {
      ...(response.pageId !== undefined ? { pageId: response.pageId } : {}),
      title: response.title,
      url: `https://en.wiktionary.org/wiki/${encodeURIComponent(response.title.replace(/ /gu, '_'))}`,
      missing: response.missing,
      extract: response.extract,
      extractChars: response.extract.length,
    },
  }
}

function createWiktionaryApiMetadata(): WiktionaryApiMetadata {
  return {
    provider: 'wiktionary',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://www.mediawiki.org/wiki/API:Main_page',
    homepage: 'https://en.wiktionary.org/wiki/Wiktionary:Main_Page',
    transport: 'HTTPS JSON',
    rateLimit: 'Wikimedia public Action API etiquette applies; identify user-agent and avoid high request rates',
    publicApisProject: 'https://github.com/public-apis/public-apis',
  }
}
