import {
  HACKER_NEWS_THREAD_FETCH_CONCURRENCY,
  HackerNewsClient,
  normalizeHackerNewsItemInput,
  normalizeHackerNewsStoriesInput,
  normalizeHackerNewsThreadInput,
  storyListToEndpoint,
  type HackerNewsItem,
  type HackerNewsItemInput,
  type HackerNewsStoriesInput,
  type HackerNewsThreadInput,
} from '../../infrastructure/openApis/hackerNewsClient.js'

const docsUrl = 'https://github.com/HackerNews/API'

export type HackerNewsStoriesResult = {
  kind: 'hackernews.stories'
  api: {
    provider: 'hackernews'
    endpoint: string
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    fanoutLimit: number
    upstreamListSize?: number | undefined
  }
  query: {
    list: string
    limit: number
  }
  ids: number[]
  stories: Array<Record<string, unknown>>
  pagination: {
    returned: number
    upstreamTotal: number
    limit: number
  }
}

export type HackerNewsItemResult = {
  kind: 'hackernews.item'
  api: {
    provider: 'hackernews'
    endpoint: 'GET /item/{id}.json'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
  }
  query: {
    id: number
  }
  item: Record<string, unknown>
  pagination: {
    returned: number
  }
}

export type HackerNewsThreadNode = {
  item: HackerNewsItem
  depth: number
  path: number[]
  childIds: number[]
  children: HackerNewsThreadNode[]
}

export type HackerNewsThreadEntry = {
  index: number
  id: number
  parent?: number | undefined
  depth: number
  path: number[]
  childCount: number
  type?: string | undefined
  by?: string | undefined
  time?: number | undefined
  text?: string | undefined
  title?: string | undefined
  url?: string | undefined
  score?: number | undefined
  descendants?: number | undefined
  deleted?: boolean | undefined
  dead?: boolean | undefined
}

export type HackerNewsThreadResult = {
  kind: 'hackernews.thread'
  api: {
    provider: 'hackernews'
    endpoint: 'GET /item/{id}.json recursive kids'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    traversal: string
    fetchConcurrency: number
  }
  query: ReturnType<typeof normalizeHackerNewsThreadInput>
  root: HackerNewsThreadEntry
  tree: HackerNewsThreadNode
  items: HackerNewsThreadEntry[]
  visibleItems: HackerNewsThreadEntry[]
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

export async function getHackerNewsStories(input: HackerNewsStoriesInput = {}): Promise<HackerNewsStoriesResult> {
  const query = normalizeHackerNewsStoriesInput(input)
  const client = new HackerNewsClient()
  const ids = await client.getStoryIds(query.list)
  const selectedIds = ids.slice(0, query.limit)
  const stories = (await Promise.all(selectedIds.map(id => client.getItemOrNull(id))))
    .filter((item): item is HackerNewsItem => item !== undefined)
  return {
    kind: 'hackernews.stories',
    api: {
      provider: 'hackernews',
      endpoint: `GET /${storyListToEndpoint(query.list)}`,
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
      fanoutLimit: query.limit,
      upstreamListSize: ids.length,
    },
    query,
    ids: selectedIds,
    stories,
    pagination: {
      returned: stories.length,
      upstreamTotal: ids.length,
      limit: query.limit,
    },
  }
}

export async function getHackerNewsItem(input: HackerNewsItemInput = {}): Promise<HackerNewsItemResult> {
  const query = normalizeHackerNewsItemInput(input)
  const client = new HackerNewsClient()
  const item = await client.getItemOrNull(query.id)
  return {
    kind: 'hackernews.item',
    api: {
      provider: 'hackernews',
      endpoint: 'GET /item/{id}.json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
    },
    query,
    item: item ?? {},
    pagination: { returned: item === undefined ? 0 : 1 },
  }
}

export async function getHackerNewsThread(input: HackerNewsThreadInput = {}): Promise<HackerNewsThreadResult> {
  const query = normalizeHackerNewsThreadInput(input)
  const client = new HackerNewsClient()
  const rootItem = await client.getItemOrNull(query.id)
  if (rootItem === undefined) {
    const placeholder = { id: query.id, deleted: true } satisfies HackerNewsItem
    return {
      kind: 'hackernews.thread',
      api: {
        provider: 'hackernews',
        endpoint: 'GET /item/{id}.json recursive kids',
        authentication: 'none',
        usesBrowserClickstream: false,
        docsUrl,
        traversal: 'Depth-first pre-order traversal preserves Hacker News kids[] order and reply nesting.',
        fetchConcurrency: HACKER_NEWS_THREAD_FETCH_CONCURRENCY,
      },
      query,
      root: { ...toThreadEntry(placeholder, 0, [], 0), index: 0 },
      tree: {
        item: placeholder,
        depth: 0,
        path: [],
        childIds: [],
        children: [],
      },
      items: [],
      visibleItems: [],
      scroll: computeThreadScroll(query, 0),
    }
  }
  const tree = await buildThreadTree(client, rootItem, 0, [])
  const items = flattenThread(tree).map((entry, index) => ({ ...entry, index }))
  const scroll = computeThreadScroll(query, items.length)
  const visibleItems = items.slice(scroll.start, scroll.end)
  return {
    kind: 'hackernews.thread',
    api: {
      provider: 'hackernews',
      endpoint: 'GET /item/{id}.json recursive kids',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
      traversal: 'Depth-first pre-order traversal preserves Hacker News kids[] order and reply nesting.',
      fetchConcurrency: HACKER_NEWS_THREAD_FETCH_CONCURRENCY,
    },
    query,
    root: items[0] ?? { ...toThreadEntry(rootItem, 0, [], 0), index: 0 },
    tree,
    items,
    visibleItems,
    scroll,
  }
}

async function buildThreadTree(
  client: HackerNewsClient,
  item: HackerNewsItem,
  depth: number,
  path: number[],
): Promise<HackerNewsThreadNode> {
  const childIds = item.kids ?? []
  const childItems = await mapWithConcurrency(childIds, HACKER_NEWS_THREAD_FETCH_CONCURRENCY, async (childId, childIndex) => {
    const childItem = await client.getItemOrNull(childId)
    return buildThreadTree(client, childItem ?? { id: childId, deleted: true, parent: item.id }, depth + 1, [...path, childIndex])
  })
  return {
    item,
    depth,
    path,
    childIds,
    children: childItems,
  }
}

function flattenThread(node: HackerNewsThreadNode): Omit<HackerNewsThreadEntry, 'index'>[] {
  return [
    toThreadEntry(node.item, node.depth, node.path, node.children.length),
    ...node.children.flatMap(child => flattenThread(child)),
  ]
}

function toThreadEntry(item: HackerNewsItem, depth: number, path: number[], childCount: number): Omit<HackerNewsThreadEntry, 'index'> {
  return {
    id: item.id,
    ...(item.parent !== undefined ? { parent: item.parent } : {}),
    depth,
    path,
    childCount,
    ...(item.type !== undefined ? { type: item.type } : {}),
    ...(item.by !== undefined ? { by: item.by } : {}),
    ...(item.time !== undefined ? { time: item.time } : {}),
    ...(item.text !== undefined ? { text: item.text } : {}),
    ...(item.title !== undefined ? { title: item.title } : {}),
    ...(item.url !== undefined ? { url: item.url } : {}),
    ...(item.score !== undefined ? { score: item.score } : {}),
    ...(item.descendants !== undefined ? { descendants: item.descendants } : {}),
    ...(item.deleted !== undefined ? { deleted: item.deleted } : {}),
    ...(item.dead !== undefined ? { dead: item.dead } : {}),
  }
}

function computeThreadScroll(
  query: ReturnType<typeof normalizeHackerNewsThreadInput>,
  total: number,
): HackerNewsThreadResult['scroll'] {
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
    ...(query.direction === 'up' && atTop ? { notice: 'Already at the top of this Hacker News thread.' } : {}),
    ...(query.direction === 'down' && atBottom ? { notice: 'Already at the bottom of this Hacker News thread.' } : {}),
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const outputs = new Array<TOutput>(inputs.length)
  let nextIndex = 0
  async function worker(): Promise<void> {
    while (nextIndex < inputs.length) {
      const index = nextIndex
      nextIndex += 1
      const input = inputs[index]
      if (input !== undefined) {
        outputs[index] = await mapper(input, index)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker()))
  return outputs
}
