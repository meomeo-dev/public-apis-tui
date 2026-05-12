import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CHAINLINK_RDD_BASE_URL = 'https://reference-data-directory.vercel.app'

export type ChainlinkFeedNetwork = 'ethereum-mainnet' | 'arbitrum-mainnet' | 'avalanche-mainnet'

export type ChainlinkFeedsQuery = {
  network: ChainlinkFeedNetwork
}

export type ChainlinkFeed = {
  name: string
  path?: string | undefined
  proxyAddress?: string | null | undefined
  contractAddress?: string | null | undefined
  pair?: string[] | undefined
  heartbeat?: number | null | undefined
  assetName?: string | undefined
  feedCategory?: string | undefined
  docs?: {
    assetClass?: string | undefined
  } | undefined
}

export type ChainlinkClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ChainlinkClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ChainlinkClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? CHAINLINK_RDD_BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listFeeds(query: ChainlinkFeedsQuery): Promise<ChainlinkFeed[]> {
    const response = await this.fetchImpl(new URL(networkToFile(query.network), `${this.baseUrl.replace(/\/$/u, '')}/`), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Chainlink feeds directory returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Chainlink feeds directory request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Chainlink feeds directory response must be an array.')
    }

    return parsed.map(parseFeed)
  }
}

export function networkToFile(network: ChainlinkFeedNetwork): string {
  switch (network) {
    case 'ethereum-mainnet':
      return 'feeds-mainnet.json'
    case 'arbitrum-mainnet':
      return 'feeds-ethereum-mainnet-arbitrum-1.json'
    case 'avalanche-mainnet':
      return 'feeds-avalanche-mainnet.json'
  }
}

function parseFeed(value: unknown): ChainlinkFeed {
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Chainlink feed rows must be JSON objects with a name field.')
  }

  return {
    name: value.name,
    ...(typeof value.path === 'string' ? { path: value.path } : {}),
    ...(typeof value.proxyAddress === 'string' || value.proxyAddress === null ? { proxyAddress: value.proxyAddress } : {}),
    ...(typeof value.contractAddress === 'string' || value.contractAddress === null ? { contractAddress: value.contractAddress } : {}),
    ...(Array.isArray(value.pair) ? { pair: value.pair.filter((entry): entry is string => typeof entry === 'string') } : {}),
    ...(typeof value.heartbeat === 'number' || value.heartbeat === null ? { heartbeat: value.heartbeat } : {}),
    ...(typeof value.assetName === 'string' ? { assetName: value.assetName } : {}),
    ...(typeof value.feedCategory === 'string' ? { feedCategory: value.feedCategory } : {}),
    ...(isRecord(value.docs) ? { docs: parseFeedDocs(value.docs) } : {}),
  }
}

function parseFeedDocs(value: Record<string, unknown>): NonNullable<ChainlinkFeed['docs']> {
  return {
    ...(typeof value.assetClass === 'string' ? { assetClass: value.assetClass } : {}),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
