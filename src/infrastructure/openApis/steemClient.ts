import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const STEEM_DEFAULT_RPC_URL = 'https://api.steemit.com'

export type SteemDiscussionSort = 'trending' | 'created' | 'hot'

export type SteemDiscussionsQuery = {
  sort: SteemDiscussionSort
  tag: string
  limit: number
  truncateBody: number
}

export type SteemDiscussion = {
  postId?: number | undefined
  author: string
  permlink: string
  category?: string | undefined
  title: string
  body?: string | undefined
  created?: string | undefined
  children?: number | undefined
  pendingPayoutValue?: string | undefined
  url?: string | undefined
  bodyLength?: number | undefined
}

export type SteemClientOptions = {
  rpcUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class SteemClient {
  private readonly rpcUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: SteemClientOptions = {}) {
    this.rpcUrl = options.rpcUrl ?? STEEM_DEFAULT_RPC_URL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listDiscussions(query: SteemDiscussionsQuery): Promise<SteemDiscussion[]> {
    const parsed = await this.callRpc(`condenser_api.get_discussions_by_${query.sort}`, [{
      tag: query.tag,
      limit: query.limit,
      truncate_body: query.truncateBody,
    }])
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Steem discussion RPC result must be an array.')
    }
    return parsed.map(parseDiscussion)
  }

  async getContent(author: string, permlink: string): Promise<SteemDiscussion> {
    return parseDiscussion(await this.callRpc('condenser_api.get_content', [author, permlink]))
  }

  async getContentReplies(author: string, permlink: string): Promise<SteemDiscussion[]> {
    const parsed = await this.callRpc('condenser_api.get_content_replies', [author, permlink])
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Steem content replies RPC result must be an array.')
    }
    return parsed.map(parseDiscussion)
  }

  private async callRpc(method: string, params: unknown[]): Promise<unknown> {
    const response = await this.fetchImpl(this.rpcUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: 1,
      }),
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Steem RPC returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Steem RPC request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Steem RPC response must be a JSON object.')
    }
    if (isRecord(parsed.error)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed.error) ?? 'Steem RPC returned an error.', {
        response: parsed.error,
      })
    }
    return parsed.result
  }
}

function parseDiscussion(value: unknown): SteemDiscussion {
  if (!isRecord(value) || typeof value.author !== 'string' || typeof value.permlink !== 'string' || typeof value.title !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Steem discussion rows must include author, permlink, and title.')
  }

  return {
    ...(typeof value.post_id === 'number' ? { postId: value.post_id } : {}),
    author: value.author,
    permlink: value.permlink,
    ...(typeof value.category === 'string' ? { category: value.category } : {}),
    title: value.title,
    ...(typeof value.body === 'string' ? { body: value.body } : {}),
    ...(typeof value.created === 'string' ? { created: value.created } : {}),
    ...(typeof value.children === 'number' ? { children: value.children } : {}),
    ...(typeof value.pending_payout_value === 'string' ? { pendingPayoutValue: value.pending_payout_value } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    ...(typeof value.body_length === 'number' ? { bodyLength: value.body_length } : {}),
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
