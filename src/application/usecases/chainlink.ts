import {
  ChainlinkClient,
  networkToFile,
  type ChainlinkFeed,
  type ChainlinkFeedNetwork,
} from '../../infrastructure/openApis/chainlinkClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const supportedNetworks = ['ethereum-mainnet', 'arbitrum-mainnet', 'avalanche-mainnet'] as const

export type ChainlinkFeedsInput = {
  network?: string | undefined
  query?: string | undefined
  category?: string | undefined
  assetClass?: string | undefined
  limit?: number | undefined
}

export type ChainlinkApiMeta = {
  provider: 'chainlink'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /feeds-*.json'
  docsUrl: 'https://docs.chain.link/data-feeds/price-feeds/addresses'
  devHubUrl: 'https://dev.chain.link/'
  dataFeedsUrl: 'https://data.chain.link/'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximumResult: 'No finite maximum documented for reference-data-directory JSON files; CLI caps output at 100 and defaults to 100.'
}

export type ChainlinkFeedResult = {
  name: string
  path?: string | undefined
  assetName?: string | undefined
  pair: string[]
  proxyAddress?: string | null | undefined
  contractAddress?: string | null | undefined
  heartbeatSeconds?: number | undefined
  category?: string | undefined
  assetClass?: string | undefined
}

export type ChainlinkFeedsResult = {
  kind: 'chainlink.feeds'
  api: ChainlinkApiMeta
  query: {
    network: ChainlinkFeedNetwork
    query?: string | undefined
    category?: string | undefined
    assetClass?: string | undefined
    limit: number
  }
  source: {
    url: string
    file: string
  }
  count: number
  totalMatched: number
  feeds: ChainlinkFeedResult[]
}

export async function listChainlinkFeeds(input: ChainlinkFeedsInput = {}): Promise<ChainlinkFeedsResult> {
  const query = normalizeFeedsInput(input)
  const client = new ChainlinkClient()
  const feeds = await client.listFeeds({ network: query.network })
  const matched = feeds
    .map(toFeedResult)
    .filter(feed => matchesText(feed.name, query.query) || matchesText(feed.assetName, query.query) || matchesText(feed.path, query.query))
    .filter(feed => matchesText(feed.category, query.category))
    .filter(feed => matchesText(feed.assetClass, query.assetClass))

  return {
    kind: 'chainlink.feeds',
    api: {
      provider: 'chainlink',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /feeds-*.json',
      docsUrl: 'https://docs.chain.link/data-feeds/price-feeds/addresses',
      devHubUrl: 'https://dev.chain.link/',
      dataFeedsUrl: 'https://data.chain.link/',
      usesBrowserClickstream: false,
      authentication: 'none',
      documentedMaximumResult: 'No finite maximum documented for reference-data-directory JSON files; CLI caps output at 100 and defaults to 100.',
    },
    query,
    source: {
      url: `https://reference-data-directory.vercel.app/${networkToFile(query.network)}`,
      file: networkToFile(query.network),
    },
    count: Math.min(matched.length, query.limit),
    totalMatched: matched.length,
    feeds: matched.slice(0, query.limit),
  }
}

function normalizeFeedsInput(input: ChainlinkFeedsInput): ChainlinkFeedsResult['query'] {
  return {
    network: normalizeNetwork(input.network),
    ...normalizeOptionalText(input.query, 'query'),
    ...normalizeOptionalText(input.category, 'category'),
    ...normalizeOptionalText(input.assetClass, 'assetClass'),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeNetwork(value: string | undefined): ChainlinkFeedNetwork {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'ethereum-mainnet'
  }
  if (supportedNetworks.includes(normalized as ChainlinkFeedNetwork)) {
    return normalized as ChainlinkFeedNetwork
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Chainlink --network must be a supported reference-data-directory feed file alias.', {
    network: value,
    supported: supportedNetworks,
  })
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 100
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Chainlink --limit must be an integer from 1 to 100.', {
      limit: value,
      note: 'No finite maximum documented; CLI cap/default is 100.',
    })
  }
  return limit
}

function normalizeOptionalText<TName extends 'query' | 'category' | 'assetClass'>(
  value: string | undefined,
  name: TName,
): { [key in TName]?: string } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { [name]: normalized } as { [key in TName]?: string }
}

function toFeedResult(feed: ChainlinkFeed): ChainlinkFeedResult {
  return {
    name: feed.name,
    ...(feed.path !== undefined ? { path: feed.path } : {}),
    ...(feed.assetName !== undefined ? { assetName: feed.assetName } : {}),
    pair: feed.pair?.filter(entry => entry.trim() !== '') ?? [],
    ...(feed.proxyAddress !== undefined ? { proxyAddress: feed.proxyAddress } : {}),
    ...(feed.contractAddress !== undefined ? { contractAddress: feed.contractAddress } : {}),
    ...(typeof feed.heartbeat === 'number' ? { heartbeatSeconds: feed.heartbeat } : {}),
    ...(feed.feedCategory !== undefined && feed.feedCategory.trim() !== '' ? { category: feed.feedCategory } : {}),
    ...(feed.docs?.assetClass !== undefined ? { assetClass: feed.docs.assetClass } : {}),
  }
}

function matchesText(value: string | undefined, query: string | undefined): boolean {
  if (query === undefined || query.trim() === '') {
    return true
  }
  return value?.toLowerCase().includes(query.toLowerCase()) ?? false
}
