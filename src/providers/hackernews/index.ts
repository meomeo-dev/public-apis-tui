import { z } from 'zod'
import { getHackerNewsItem, getHackerNewsStories, getHackerNewsThread } from '../../application/usecases/hackerNews.js'
import {
  HACKER_NEWS_DEFAULT_ITEM_ID,
  HACKER_NEWS_DEFAULT_LIMIT,
  HACKER_NEWS_DEFAULT_STORY_LIST,
  HACKER_NEWS_MAX_LIMIT,
  HACKER_NEWS_THREAD_DEFAULT_PAGE_SIZE,
  HACKER_NEWS_THREAD_MAX_PAGE_SIZE,
  hackerNewsStoryLists,
  normalizeHackerNewsItemInput,
  normalizeHackerNewsStoriesInput,
  normalizeHackerNewsThreadInput,
  type HackerNewsItemInput,
  type HackerNewsStoriesInput,
  type HackerNewsThreadInput,
} from '../../infrastructure/openApis/hackerNewsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const storiesParamsSchema = z.object({
  list: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<HackerNewsStoriesInput>

const itemParamsSchema = z.object({
  id: z.coerce.number().optional(),
}) satisfies z.ZodType<HackerNewsItemInput>

const threadParamsSchema = z.object({
  id: z.coerce.number().optional(),
  cursor: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  direction: z.string().optional(),
}) satisfies z.ZodType<HackerNewsThreadInput>

const storiesOperation: PublicApiOperationDefinition<HackerNewsStoriesInput> = {
  id: 'hackernews.stories',
  providerId: 'hackernews',
  name: 'Story Lists',
  commandPath: ['hackernews', 'stories'],
  rpcMethod: 'hackernews.stories',
  description: 'Read a Hacker News story list and fetch bounded story details.',
  category: 'social',
  options: [
    {
      name: 'list',
      flag: '--list <top|new|best|ask|show|job>',
      description: `Story list to read, default ${HACKER_NEWS_DEFAULT_STORY_LIST}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'The official API exposes separate story-list endpoints; a single curated list selector avoids duplicating commands.',
      defaultValue: HACKER_NEWS_DEFAULT_STORY_LIST,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Story details to fetch, default ${HACKER_NEWS_DEFAULT_LIMIT}, cap ${HACKER_NEWS_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The upstream list returns up to hundreds of ids but detail fetches fan out per item; CLI caps fan-out for quota/network safety.',
      valueType: 'integer',
      defaultValue: String(HACKER_NEWS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: storiesParamsSchema,
  execute: params => getHackerNewsStories(params),
  normalizeParams: params => storiesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHackerNewsStoriesInput(params),
  resultKind: 'hackernews.stories',
  defaultFormat: 'text',
}

const itemOperation: PublicApiOperationDefinition<HackerNewsItemInput> = {
  id: 'hackernews.item',
  providerId: 'hackernews',
  name: 'Item Detail',
  commandPath: ['hackernews', 'item'],
  rpcMethod: 'hackernews.item',
  description: 'Read one Hacker News item by id.',
  category: 'social',
  options: [
    {
      name: 'id',
      flag: '--id <number>',
      description: `Item id to fetch, default ${HACKER_NEWS_DEFAULT_ITEM_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The official item endpoint is keyed by numeric item id.',
      valueType: 'integer',
      defaultValue: String(HACKER_NEWS_DEFAULT_ITEM_ID),
    },
  ],
  paramsSchema: itemParamsSchema,
  execute: params => getHackerNewsItem(params),
  normalizeParams: params => itemParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHackerNewsItemInput(params),
  resultKind: 'hackernews.item',
  defaultFormat: 'text',
}

const threadOperation: PublicApiOperationDefinition<HackerNewsThreadInput> = {
  id: 'hackernews.thread',
  providerId: 'hackernews',
  name: 'Thread Reader',
  commandPath: ['hackernews', 'thread'],
  rpcMethod: 'hackernews.thread',
  description: 'Fetch a full Hacker News story/comment tree and render a scrollable thread window.',
  category: 'social',
  options: [
    {
      name: 'id',
      flag: '--id <number>',
      description: `Story item id to fetch recursively, default ${HACKER_NEWS_DEFAULT_ITEM_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The root story id determines the full recursive kids[] traversal.',
      valueType: 'integer',
      defaultValue: String(HACKER_NEWS_DEFAULT_ITEM_ID),
    },
    {
      name: 'cursor',
      flag: '--cursor <index>',
      description: 'Zero-based scroll cursor for the flattened thread, default 0',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Cursor simulates terminal page scrolling without losing full JSON thread content.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'direction',
      flag: '--direction <down|up>',
      description: 'Scroll direction from cursor, default down',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Explicit direction lets users page down by default or page up from a known cursor.',
      defaultValue: 'down',
    },
    {
      name: 'pageSize',
      flag: '--page-size <count>',
      description: `Visible thread rows, default ${HACKER_NEWS_THREAD_DEFAULT_PAGE_SIZE}, cap ${HACKER_NEWS_THREAD_MAX_PAGE_SIZE}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'TUI output must remain readable while JSON still carries the complete fetched thread.',
      valueType: 'integer',
      defaultValue: String(HACKER_NEWS_THREAD_DEFAULT_PAGE_SIZE),
    },
  ],
  paramsSchema: threadParamsSchema,
  execute: params => getHackerNewsThread(params),
  normalizeParams: params => threadParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHackerNewsThreadInput(params),
  resultKind: 'hackernews.thread',
  defaultFormat: 'text',
}

export const hackerNewsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'hackernews',
    name: 'HackerNews',
    description: 'Official no-auth HTTPS JSON Firebase API for Hacker News stories, items, and users.',
    publicApisCategory: 'Social',
    homepageUrl: 'https://github.com/HackerNews/API',
    docsUrl: 'https://github.com/HackerNews/API',
    auth: {
      mode: 'none',
      notes: ['Official Firebase endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['social', 'news', 'startups', 'hacker-news', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official README states there is currently no rate limit.',
      `Story list selector supports: ${hackerNewsStoryLists.join(', ')}.`,
      'Story details are capped to avoid unbounded per-item fan-out even though story id lists may contain hundreds of ids.',
      'Thread reader recursively traverses kids[] in official order and returns complete fetched JSON plus a scroll window for TUI paging.',
    ],
  },
  operations: [storiesOperation, itemOperation, threadOperation],
  endpoints: [
    {
      id: 'hackernews-story-lists',
      method: 'GET',
      urlPattern: 'https://hacker-news.firebaseio.com/v0/*stories.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Official Hacker News story-list endpoints.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://github.com/HackerNews/API', 'https://hacker-news.firebaseio.com/v0/topstories.json'],
      consumedBy: ['hackernews stories'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.', 'No current official rate limit documented.'],
    },
    {
      id: 'hackernews-item',
      method: 'GET',
      urlPattern: 'https://hacker-news.firebaseio.com/v0/item/*.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Official Hacker News item endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://github.com/HackerNews/API', 'https://hacker-news.firebaseio.com/v0/item/8863.json'],
      consumedBy: ['hackernews stories', 'hackernews item', 'hackernews thread'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.'],
    },
  ],
}
