import { SteemClient, type SteemDiscussion, type SteemDiscussionSort } from '../../infrastructure/openApis/steemClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const discussionSorts = ['trending', 'created', 'hot'] as const
const threadDirections = ['down', 'up'] as const

export type SteemDiscussionsInput = {
  sort?: string | undefined
  tag?: string | undefined
  limit?: number | undefined
  truncateBody?: number | undefined
}

export type SteemThreadInput = {
  author?: string | undefined
  permlink?: string | undefined
  cursor?: number | undefined
  pageSize?: number | undefined
  direction?: string | undefined
  truncateBody?: number | undefined
}

export type SteemApiMeta = {
  provider: 'steem'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'POST condenser_api.get_discussions_by_*' | 'POST condenser_api.get_content + get_content_replies recursive'
  docsUrl: 'https://developers.steem.io/apidefinitions/condenser-api'
  rpcUrl: 'https://api.steemit.com'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximumLimit: 100
  traversal?: string | undefined
  fetchStrategy?: string | undefined
}

export type SteemDiscussionResult = {
  postId?: number | undefined
  author: string
  permlink: string
  category?: string | undefined
  title: string
  body?: string | undefined
  created?: string | undefined
  children?: number | undefined
  pendingPayoutValue?: string | undefined
  url: string
  bodyLength?: number | undefined
}

export type SteemDiscussionsResult = {
  kind: 'steem.discussions'
  api: SteemApiMeta
  query: {
    sort: SteemDiscussionSort
    tag: string
    limit: number
    truncateBody: number
  }
  count: number
  discussions: SteemDiscussionResult[]
}

export type SteemThreadEntry = SteemDiscussionResult & {
  index: number
  parentAuthor?: string | undefined
  parentPermlink?: string | undefined
  depth: number
  path: number[]
  childCount: number
}

export type SteemThreadNode = {
  discussion: SteemDiscussionResult
  depth: number
  path: number[]
  children: SteemThreadNode[]
}

export type SteemThreadResult = {
  kind: 'steem.thread'
  api: SteemApiMeta
  query: ReturnType<typeof normalizeThreadInput>
  root: SteemThreadEntry
  tree: SteemThreadNode
  items: SteemThreadEntry[]
  visibleItems: SteemThreadEntry[]
  scroll: {
    direction: 'down' | 'up'
    cursor: number
    pageSize: number
    start: number
    end: number
    returned: number
    total: number
    atTop: boolean
    atBottom: boolean
    previousCursor?: number | undefined
    nextCursor?: number | undefined
    notice?: string | undefined
  }
}

export async function listSteemDiscussions(input: SteemDiscussionsInput = {}): Promise<SteemDiscussionsResult> {
  const query = normalizeDiscussionsInput(input)
  const client = new SteemClient()
  const discussions = await client.listDiscussions(query)
  return {
    kind: 'steem.discussions',
    api: createApiMeta('POST condenser_api.get_discussions_by_*'),
    query,
    count: discussions.length,
    discussions: discussions.map(toDiscussionResult),
  }
}

export async function getSteemThread(input: SteemThreadInput = {}): Promise<SteemThreadResult> {
  const query = normalizeThreadInput(input)
  const client = new SteemClient()
  const root = await client.getContent(query.author, query.permlink)
  const tree = await buildThreadTree(client, root, query.truncateBody, 0, [])
  const items = flattenThread(tree).map((entry, index) => ({ ...entry, index }))
  const scroll = computeThreadScroll(query, items.length)
  const visibleItems = items.slice(scroll.start, scroll.end)
  return {
    kind: 'steem.thread',
    api: createApiMeta('POST condenser_api.get_content + get_content_replies recursive'),
    query,
    root: items[0] ?? { ...toThreadEntry(toDiscussionResult(root, query.truncateBody), 0, [], 0), index: 0 },
    tree,
    items,
    visibleItems,
    scroll,
  }
}

function normalizeDiscussionsInput(input: SteemDiscussionsInput): SteemDiscussionsResult['query'] {
  return {
    sort: normalizeSort(input.sort),
    tag: normalizeTag(input.tag),
    limit: normalizeInteger(input.limit, 'limit', 1, 100, 100),
    truncateBody: normalizeInteger(input.truncateBody, 'truncate-body', 0, 500, 200),
  }
}

function normalizeThreadInput(input: SteemThreadInput): {
  author: string
  permlink: string
  cursor: number
  pageSize: number
  direction: 'down' | 'up'
  truncateBody: number
} {
  return {
    author: normalizeAccount(input.author),
    permlink: normalizePermlink(input.permlink),
    cursor: normalizeInteger(input.cursor, 'cursor', 0, 100000, 0),
    pageSize: normalizeInteger(input.pageSize, 'page-size', 1, 100, 25),
    direction: normalizeDirection(input.direction),
    truncateBody: normalizeInteger(input.truncateBody, 'truncate-body', 0, 2000, 500),
  }
}

function normalizeSort(value: string | undefined): SteemDiscussionSort {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'trending'
  }
  if (discussionSorts.includes(normalized as SteemDiscussionSort)) {
    return normalized as SteemDiscussionSort
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --sort must be trending, created, or hot.', {
    sort: value,
  })
}

function normalizeTag(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'steem'
  }
  if (!/^[a-z0-9-]{1,32}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --tag must be 1-32 lowercase letters, numbers, or hyphens.', {
      tag: value,
    })
  }
  return normalized
}

function normalizeAccount(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --author is required for thread reading.')
  }
  if (!/^[a-z0-9.-]{3,32}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --author must be a valid account name.', { author: value })
  }
  return normalized
}

function normalizePermlink(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --permlink is required for thread reading.')
  }
  if (!/^[a-z0-9-]{1,256}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --permlink must be lowercase letters, numbers, or hyphens.', { permlink: value })
  }
  return normalized
}

function normalizeInteger(value: number | undefined, label: string, min: number, max: number, defaultValue: number): number {
  const integer = value ?? defaultValue
  if (!Number.isInteger(integer) || integer < min || integer > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Steem --${label} must be an integer from ${min} to ${max}.`, {
      [label]: value,
    })
  }
  return integer
}

function normalizeDirection(value: string | undefined): 'down' | 'up' {
  const normalized = value?.trim().toLowerCase() ?? 'down'
  if (threadDirections.includes(normalized as 'down' | 'up')) {
    return normalized as 'down' | 'up'
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Steem --direction must be down or up.', { direction: value })
}

async function buildThreadTree(
  client: SteemClient,
  discussion: SteemDiscussion,
  truncateBody: number,
  depth: number,
  path: number[],
): Promise<SteemThreadNode> {
  const projected = toDiscussionResult(discussion, truncateBody)
  const replies = await client.getContentReplies(discussion.author, discussion.permlink)
  const children: SteemThreadNode[] = []
  for (const [replyIndex, reply] of replies.entries()) {
    children.push(await buildThreadTree(client, reply, truncateBody, depth + 1, [...path, replyIndex]))
  }
  return { discussion: projected, depth, path, children }
}

function flattenThread(node: SteemThreadNode): Omit<SteemThreadEntry, 'index'>[] {
  return [
    toThreadEntry(node.discussion, node.depth, node.path, node.children.length),
    ...node.children.flatMap(child => flattenThread(child)),
  ]
}

function toThreadEntry(discussion: SteemDiscussionResult, depth: number, path: number[], childCount: number): Omit<SteemThreadEntry, 'index'> {
  const parentPath = discussion.url.match(/#@([^/]+)\/([^#/?]+)/u)
  return {
    ...discussion,
    ...(parentPath?.[1] !== undefined ? { parentAuthor: parentPath[1] } : {}),
    ...(parentPath?.[2] !== undefined ? { parentPermlink: parentPath[2] } : {}),
    depth,
    path,
    childCount,
  }
}

function computeThreadScroll(
  query: ReturnType<typeof normalizeThreadInput>,
  total: number,
): SteemThreadResult['scroll'] {
  if (total === 0) {
    return {
      direction: query.direction,
      cursor: query.cursor,
      pageSize: query.pageSize,
      start: 0,
      end: 0,
      returned: 0,
      total,
      atTop: true,
      atBottom: true,
      notice: 'Thread is empty.',
    }
  }

  const requestedStart = query.direction === 'up'
    ? Math.max(0, query.cursor - query.pageSize)
    : Math.min(query.cursor, Math.max(0, total - 1))
  const start = Math.min(requestedStart, Math.max(0, total - 1))
  const end = Math.min(total, start + query.pageSize)
  const atTop = start === 0
  const atBottom = end >= total
  return {
    direction: query.direction,
    cursor: query.cursor,
    pageSize: query.pageSize,
    start,
    end,
    returned: end - start,
    total,
    atTop,
    atBottom,
    ...(atTop ? {} : { previousCursor: start }),
    ...(atBottom ? {} : { nextCursor: end }),
    ...(query.direction === 'up' && atTop ? { notice: 'Already at the top of this Steem thread.' } : {}),
    ...(query.direction === 'down' && atBottom ? { notice: 'Already at the bottom of this Steem thread.' } : {}),
  }
}

function toDiscussionResult(discussion: SteemDiscussion, truncateBody?: number): SteemDiscussionResult {
  const body = truncateBody === undefined ? discussion.body : truncateBodyText(discussion.body, truncateBody)
  return {
    ...(discussion.postId !== undefined ? { postId: discussion.postId } : {}),
    author: discussion.author,
    permlink: discussion.permlink,
    ...(discussion.category !== undefined ? { category: discussion.category } : {}),
    title: discussion.title,
    ...(body !== undefined ? { body } : {}),
    ...(discussion.created !== undefined ? { created: discussion.created } : {}),
    ...(discussion.children !== undefined ? { children: discussion.children } : {}),
    ...(discussion.pendingPayoutValue !== undefined ? { pendingPayoutValue: discussion.pendingPayoutValue } : {}),
    url: createDiscussionUrl(discussion),
    ...(discussion.bodyLength !== undefined ? { bodyLength: discussion.bodyLength } : {}),
  }
}

function truncateBodyText(value: string | undefined, limit: number): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (limit === 0 || value.length <= limit) {
    return limit === 0 ? '' : value
  }
  return `${value.slice(0, Math.max(0, limit - 1))}…`
}

function createApiMeta(endpoint: SteemApiMeta['endpoint']): SteemApiMeta {
  return {
    provider: 'steem',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://developers.steem.io/apidefinitions/condenser-api',
    rpcUrl: 'https://api.steemit.com',
    usesBrowserClickstream: false,
    authentication: 'none',
    documentedMaximumLimit: 100,
    ...(endpoint.includes('get_content') ? {
      traversal: 'Depth-first pre-order traversal preserves Steem reply hierarchy from get_content_replies.',
      fetchStrategy: 'Sequential recursive read-only JSON-RPC calls avoid mutating blockchain state.',
    } : {}),
  }
}

function createDiscussionUrl(discussion: SteemDiscussion): string {
  if (discussion.url !== undefined && discussion.url.trim() !== '') {
    return discussion.url.startsWith('http') ? discussion.url : `https://steemit.com${discussion.url}`
  }
  const category = discussion.category ?? 'steem'
  return `https://steemit.com/${category}/@${discussion.author}/${discussion.permlink}`
}
