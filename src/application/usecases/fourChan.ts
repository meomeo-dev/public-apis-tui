import {
  FOURCHAN_MAX_LIMIT,
  FourChanClient,
  normalizeFourChanBoardsInput,
  normalizeFourChanCatalogInput,
  type FourChanBoard,
  type FourChanBoardsInput,
  type FourChanCatalogInput,
  type FourChanThreadPreview,
} from '../../infrastructure/openApis/fourChanClient.js'

export type FourChanApiMeta = {
  provider: '4chan'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  contentSafety: string
  limitPolicy: string
}

export type FourChanBoardsResult = {
  kind: '4chan.boards'
  api: FourChanApiMeta
  query: ReturnType<typeof normalizeFourChanBoardsInput>
  count: number
  totalBoards: number
  boards: FourChanBoard[]
}

export type FourChanCatalogResult = {
  kind: '4chan.catalog'
  api: FourChanApiMeta
  query: ReturnType<typeof normalizeFourChanCatalogInput>
  pagination: {
    returned: number
    totalThreads: number
    pageCount: number
    limit: number
    maxLimit: number
  }
  threads: FourChanThreadPreview[]
}

export async function listFourChanBoards(input: FourChanBoardsInput = {}): Promise<FourChanBoardsResult> {
  const query = normalizeFourChanBoardsInput(input)
  const boards = await new FourChanClient().boards()
  const filtered = query.query === undefined
    ? boards
    : boards.filter(board => `${board.board} ${board.title} ${board.metaDescription ?? ''}`.toLowerCase().includes(query.query ?? ''))
  const shown = filtered.slice(0, query.limit)
  return {
    kind: '4chan.boards',
    api: createApiMeta('GET https://a.4cdn.org/boards.json'),
    query,
    count: shown.length,
    totalBoards: filtered.length,
    boards: shown,
  }
}

export async function listFourChanCatalog(input: FourChanCatalogInput = {}): Promise<FourChanCatalogResult> {
  const query = normalizeFourChanCatalogInput(input)
  const catalog = await new FourChanClient().catalog(query)
  return {
    kind: '4chan.catalog',
    api: createApiMeta(`GET https://a.4cdn.org/${query.board}/catalog.json`),
    query,
    pagination: {
      returned: catalog.threads.length,
      totalThreads: catalog.totalThreads,
      pageCount: catalog.pageCount,
      limit: query.limit,
      maxLimit: FOURCHAN_MAX_LIMIT,
    },
    threads: catalog.threads,
  }
}

function createApiMeta(endpoint: string): FourChanApiMeta {
  return {
    provider: '4chan',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://github.com/4chan/4chan-API',
    usesBrowserClickstream: false,
    authentication: 'none',
    contentSafety: 'Public 4chan responses are untrusted user-generated content; renderers strip HTML but do not browser-scrape or execute content.',
    limitPolicy: `Catalog/boards endpoints return fixed JSON documents; CLI caps returned rows at ${FOURCHAN_MAX_LIMIT} for readable terminal output.`,
  }
}
