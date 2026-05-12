import { z } from 'zod'
import { getJsonPlaceholderPost, listJsonPlaceholderPosts } from '../../application/usecases/jsonPlaceholder.js'
import {
  JSON_PLACEHOLDER_DEFAULT_LIMIT,
  JSON_PLACEHOLDER_DEFAULT_POST_ID,
  JSON_PLACEHOLDER_MAX_LIMIT,
  normalizeJsonPlaceholderPostInput,
  normalizeJsonPlaceholderPostsInput,
  type JsonPlaceholderPostInput,
  type JsonPlaceholderPostsInput,
} from '../../infrastructure/openApis/jsonPlaceholderClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const postsParamsSchema = z.object({
  userId: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<JsonPlaceholderPostsInput>

const postParamsSchema = z.object({
  id: z.coerce.number().optional(),
}) satisfies z.ZodType<JsonPlaceholderPostInput>

const postsOperation: PublicApiOperationDefinition<JsonPlaceholderPostsInput> = {
  id: 'jsonplaceholder.posts',
  providerId: 'jsonplaceholder',
  name: 'Posts',
  commandPath: ['jsonplaceholder', 'posts'],
  rpcMethod: 'jsonplaceholder.posts',
  description: 'List JSONPlaceholder fake posts for testing and prototyping.',
  category: 'test-data',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Posts to return, default/cap ${JSON_PLACEHOLDER_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The posts collection contains exactly 100 records; defaulting to 100 uses the documented full collection in one request.',
      valueType: 'integer',
      defaultValue: String(JSON_PLACEHOLDER_DEFAULT_LIMIT),
    },
    {
      name: 'userId',
      flag: '--user-id <id>',
      description: 'Optional user id filter',
      exposure: 'advanced',
      group: 'filters',
      reason: 'JSONPlaceholder supports filtering posts by userId; useful for prototyping but not required for the default overview.',
      valueType: 'integer',
    },
  ],
  paramsSchema: postsParamsSchema,
  execute: params => listJsonPlaceholderPosts(params),
  normalizeParams: params => postsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeJsonPlaceholderPostsInput(params),
  resultKind: 'jsonplaceholder.posts',
  defaultFormat: 'text',
}

const postOperation: PublicApiOperationDefinition<JsonPlaceholderPostInput> = {
  id: 'jsonplaceholder.post',
  providerId: 'jsonplaceholder',
  name: 'Post Detail',
  commandPath: ['jsonplaceholder', 'post'],
  rpcMethod: 'jsonplaceholder.post',
  description: 'Read one JSONPlaceholder fake post by id.',
  category: 'test-data',
  options: [
    {
      name: 'id',
      flag: '--id <number>',
      description: `Post id to fetch, default ${JSON_PLACEHOLDER_DEFAULT_POST_ID}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented post detail endpoint is keyed by numeric id.',
      valueType: 'integer',
      defaultValue: String(JSON_PLACEHOLDER_DEFAULT_POST_ID),
    },
  ],
  paramsSchema: postParamsSchema,
  execute: params => getJsonPlaceholderPost(params),
  normalizeParams: params => postParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeJsonPlaceholderPostInput(params),
  resultKind: 'jsonplaceholder.post',
  defaultFormat: 'text',
}

export const jsonPlaceholderProvider: PublicApiProviderModule = {
  manifest: {
    id: 'jsonplaceholder',
    name: 'JSONPlaceholder',
    description: 'No-auth HTTPS JSON fake REST API for posts, comments, albums, photos, todos, and users.',
    publicApisCategory: 'Test Data',
    homepageUrl: 'https://jsonplaceholder.typicode.com/',
    docsUrl: 'https://jsonplaceholder.typicode.com/',
    auth: {
      mode: 'none',
      notes: ['Read-only fake REST endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['test-data', 'fake-api', 'rest', 'prototype', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs list 100 posts and support GET all/list/detail routes.',
      `Posts default and cap are ${JSON_PLACEHOLDER_MAX_LIMIT}, matching the documented posts collection size.`,
      'Write routes are intentionally excluded because the provider fakes writes and this CLI starts with repeatable read operations.',
    ],
  },
  operations: [postsOperation, postOperation],
  endpoints: [
    {
      id: 'jsonplaceholder-posts',
      method: 'GET',
      urlPattern: 'https://jsonplaceholder.typicode.com/posts*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'JSONPlaceholder fake posts collection endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://jsonplaceholder.typicode.com/', 'https://jsonplaceholder.typicode.com/posts?_limit=2'],
      consumedBy: ['jsonplaceholder posts'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'jsonplaceholder-post',
      method: 'GET',
      urlPattern: 'https://jsonplaceholder.typicode.com/posts/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'JSONPlaceholder fake post detail endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://jsonplaceholder.typicode.com/', 'https://jsonplaceholder.typicode.com/posts/1'],
      consumedBy: ['jsonplaceholder post'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.'],
    },
  ],
}
