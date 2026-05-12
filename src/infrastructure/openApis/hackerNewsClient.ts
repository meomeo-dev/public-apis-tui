import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HACKER_NEWS_DEFAULT_BASE_URL = 'https://hacker-news.firebaseio.com/v0'
export const HACKER_NEWS_DEFAULT_STORY_LIST = 'top'
export const HACKER_NEWS_DEFAULT_LIMIT = 10
export const HACKER_NEWS_MAX_LIMIT = 30
export const HACKER_NEWS_DEFAULT_ITEM_ID = 8863
export const HACKER_NEWS_THREAD_DEFAULT_PAGE_SIZE = 25
export const HACKER_NEWS_THREAD_MAX_PAGE_SIZE = 100
export const HACKER_NEWS_THREAD_FETCH_CONCURRENCY = 8

export const hackerNewsStoryLists = ['top', 'new', 'best', 'ask', 'show', 'job'] as const
export type HackerNewsStoryList = typeof hackerNewsStoryLists[number]

export type HackerNewsStoriesInput = {
  list?: string | undefined
  limit?: number | undefined
}

export type NormalizedHackerNewsStoriesInput = {
  list: HackerNewsStoryList
  limit: number
}

export type HackerNewsItemInput = {
  id?: number | undefined
}

export type NormalizedHackerNewsItemInput = {
  id: number
}

export type HackerNewsThreadDirection = 'down' | 'up'

export type HackerNewsThreadInput = {
  id?: number | undefined
  cursor?: number | undefined
  pageSize?: number | undefined
  direction?: string | undefined
}

export type NormalizedHackerNewsThreadInput = {
  id: number
  cursor: number
  pageSize: number
  direction: HackerNewsThreadDirection
}

export type HackerNewsItem = {
  id: number
  deleted?: boolean | undefined
  type?: string | undefined
  by?: string | undefined
  time?: number | undefined
  text?: string | undefined
  dead?: boolean | undefined
  parent?: number | undefined
  poll?: number | undefined
  kids?: number[] | undefined
  url?: string | undefined
  score?: number | undefined
  title?: string | undefined
  parts?: number[] | undefined
  descendants?: number | undefined
}

export class HackerNewsClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async getStoryIds(list: HackerNewsStoryList): Promise<number[]> {
    const url = new URL(storyListToEndpoint(list), normalizeBaseUrl(this.options.baseUrl ?? HACKER_NEWS_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed) || !parsed.every(value => typeof value === 'number')) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Hacker News stories response must be an array of item ids.')
    }
    return parsed
  }

  async getItem(id: number): Promise<HackerNewsItem> {
    const url = new URL(`item/${id}.json`, normalizeBaseUrl(this.options.baseUrl ?? HACKER_NEWS_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    return parseItem(parsed)
  }

  async getItemOrNull(id: number): Promise<HackerNewsItem | undefined> {
    const url = new URL(`item/${id}.json`, normalizeBaseUrl(this.options.baseUrl ?? HACKER_NEWS_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    return parsed === null ? undefined : parseItem(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hacker News request failed: ${String(error)}`, {
        provider: 'hackernews',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hacker News returned a non-JSON response: ${String(error)}`, {
        provider: 'hackernews',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Hacker News request failed with HTTP ${response.status}.`, {
        provider: 'hackernews',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeHackerNewsStoriesInput(input: HackerNewsStoriesInput = {}): NormalizedHackerNewsStoriesInput {
  return {
    list: normalizeStoryList(input.list),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizeHackerNewsItemInput(input: HackerNewsItemInput = {}): NormalizedHackerNewsItemInput {
  return { id: normalizeItemId(input.id) }
}

export function normalizeHackerNewsThreadInput(input: HackerNewsThreadInput = {}): NormalizedHackerNewsThreadInput {
  return {
    id: normalizeItemId(input.id),
    cursor: normalizeCursor(input.cursor),
    pageSize: normalizePageSize(input.pageSize),
    direction: normalizeDirection(input.direction),
  }
}

export function storyListToEndpoint(list: HackerNewsStoryList): string {
  return `${list}stories.json`
}

function normalizeStoryList(value: string | undefined): HackerNewsStoryList {
  const normalized = (value ?? HACKER_NEWS_DEFAULT_STORY_LIST).toLowerCase()
  if (!hackerNewsStoryLists.includes(normalized as HackerNewsStoryList)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--list must be one of ${hackerNewsStoryLists.join(', ')}.`)
  }
  return normalized as HackerNewsStoryList
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? HACKER_NEWS_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > HACKER_NEWS_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${HACKER_NEWS_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeItemId(value: number | undefined): number {
  const id = value ?? HACKER_NEWS_DEFAULT_ITEM_ID
  if (!Number.isInteger(id) || id < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--id must be a positive integer.')
  }
  return id
}

function normalizeCursor(value: number | undefined): number {
  const cursor = value ?? 0
  if (!Number.isInteger(cursor) || cursor < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--cursor must be a zero-based non-negative integer.')
  }
  return cursor
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = value ?? HACKER_NEWS_THREAD_DEFAULT_PAGE_SIZE
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > HACKER_NEWS_THREAD_MAX_PAGE_SIZE) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--page-size must be an integer from 1 to ${HACKER_NEWS_THREAD_MAX_PAGE_SIZE}.`)
  }
  return pageSize
}

function normalizeDirection(value: string | undefined): HackerNewsThreadDirection {
  const normalized = (value ?? 'down').trim().toLowerCase()
  if (normalized !== 'down' && normalized !== 'up') {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--direction must be down or up.')
  }
  return normalized
}

function parseItem(value: unknown): HackerNewsItem {
  if (!isRecord(value) || typeof value.id !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Hacker News item response had an unexpected schema.')
  }
  return {
    id: value.id,
    ...(typeof value.deleted === 'boolean' ? { deleted: value.deleted } : {}),
    ...(typeof value.type === 'string' ? { type: value.type } : {}),
    ...(typeof value.by === 'string' ? { by: value.by } : {}),
    ...(typeof value.time === 'number' ? { time: value.time } : {}),
    ...(typeof value.text === 'string' ? { text: value.text } : {}),
    ...(typeof value.dead === 'boolean' ? { dead: value.dead } : {}),
    ...(typeof value.parent === 'number' ? { parent: value.parent } : {}),
    ...(typeof value.poll === 'number' ? { poll: value.poll } : {}),
    ...(Array.isArray(value.kids) ? { kids: value.kids.filter(entry => typeof entry === 'number') } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    ...(typeof value.score === 'number' ? { score: value.score } : {}),
    ...(typeof value.title === 'string' ? { title: value.title } : {}),
    ...(Array.isArray(value.parts) ? { parts: value.parts.filter(entry => typeof entry === 'number') } : {}),
    ...(typeof value.descendants === 'number' ? { descendants: value.descendants } : {}),
  }
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
