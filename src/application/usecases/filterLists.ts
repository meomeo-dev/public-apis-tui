import {
  FilterListsClient,
  FILTER_LISTS_MAX_LIMIT,
  normalizeFilterListsInput,
  type FilterListsInput,
  type FilterListsList,
  type FilterListsSummary,
} from '../../infrastructure/openApis/filterListsClient.js'

type FilterListsApiMeta = {
  provider: 'filterlists'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  platform: 'FilterLists Directory API v1'
  safety: string
  limitPolicy: string
}

export type FilterListsResult = {
  kind: 'filterlists.lists'
  api: FilterListsApiMeta
  query: ReturnType<typeof normalizeFilterListsInput>
  count: number
  pagination: FilterListsSummary & {
    limit: number
    maxLimit: number
  }
  lists: FilterListsList[]
}

export async function listFilterLists(input: FilterListsInput = {}): Promise<FilterListsResult> {
  const query = normalizeFilterListsInput(input)
  const client = new FilterListsClient()
  const response = await client.listLists(query)
  return {
    kind: 'filterlists.lists',
    api: {
      provider: 'filterlists',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /lists plus metadata joins',
      docsUrl: 'https://api.filterlists.com/index.html',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      platform: 'FilterLists Directory API v1',
      safety: 'Catalog metadata only; the CLI does not download raw adblock/firewall filter-list contents or arbitrary view URLs.',
      limitPolicy: 'FilterLists /lists is unpaginated; CLI applies local search/filtering, excludes restricted NSFW/proxy/gambling/piracy/paywall metadata categories, and caps terminal output at 100 rows.',
    },
    query,
    count: response.lists.length,
    pagination: {
      ...response.summary,
      limit: query.limit,
      maxLimit: FILTER_LISTS_MAX_LIMIT,
    },
    lists: response.lists,
  }
}
