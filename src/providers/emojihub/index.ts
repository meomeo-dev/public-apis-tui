import { z } from 'zod'
import {
  getEmojiHubRandom,
  listEmojiHubCategories,
  listEmojiHubGroups,
  searchEmojiHub,
  type EmojiHubRandomInput,
  type EmojiHubSearchInput,
  type EmojiHubTaxonomyInput,
} from '../../application/usecases/emojiHub.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const randomParamsSchema = z.object({}) satisfies z.ZodType<EmojiHubRandomInput>

const searchParamsSchema = z.object({
  query: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  group: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<EmojiHubSearchInput>

const taxonomyParamsSchema = z.object({
  limit: z.number().int().optional(),
}) satisfies z.ZodType<EmojiHubTaxonomyInput>

const randomOperation: PublicApiOperationDefinition<EmojiHubRandomInput> = {
  id: 'emojihub.random',
  providerId: 'emojihub',
  name: 'Random emoji',
  commandPath: ['emojihub', 'random'],
  rpcMethod: 'emojihub.random',
  description: 'Fetch one random emoji from EmojiHub.',
  category: 'art-design',
  options: [],
  paramsSchema: randomParamsSchema,
  execute: params => getEmojiHubRandom(params),
  normalizeParams: params => randomParamsSchema.parse(params),
  resultKind: 'emojihub.random',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<EmojiHubSearchInput> = {
  id: 'emojihub.search',
  providerId: 'emojihub',
  name: 'Search emojis',
  commandPath: ['emojihub', 'search'],
  rpcMethod: 'emojihub.search',
  description: 'Search emojis by text, category slug, or group slug.',
  category: 'art-design',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Search text, such as cat',
      exposure: 'primary',
      group: 'query',
      reason: 'Primary discovery path for users who do not already know EmojiHub categories or groups.',
    },
    {
      name: 'category',
      flag: '--category <slug>',
      description: 'Category slug or name, such as animals-and-nature',
      exposure: 'primary',
      group: 'filters',
      reason: 'Documented collection filter that maps to /all/category/:category.',
    },
    {
      name: 'group',
      flag: '--group <slug>',
      description: 'Group slug or name, such as cat-face',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful documented filter after users discover available groups.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum emojis to show, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output because the provider does not document a result maximum.',
      valueType: 'integer',
      defaultValue: '100',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchEmojiHub(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  resultKind: 'emojihub.search',
  defaultFormat: 'text',
}

const categoriesOperation: PublicApiOperationDefinition<EmojiHubTaxonomyInput> = {
  id: 'emojihub.categories',
  providerId: 'emojihub',
  name: 'Categories',
  commandPath: ['emojihub', 'categories'],
  rpcMethod: 'emojihub.categories',
  description: 'List EmojiHub category names.',
  category: 'art-design',
  options: [createLimitOption('category')],
  paramsSchema: taxonomyParamsSchema,
  execute: params => listEmojiHubCategories(params),
  normalizeParams: params => taxonomyParamsSchema.parse(params),
  resultKind: 'emojihub.categories',
  defaultFormat: 'text',
}

const groupsOperation: PublicApiOperationDefinition<EmojiHubTaxonomyInput> = {
  id: 'emojihub.groups',
  providerId: 'emojihub',
  name: 'Groups',
  commandPath: ['emojihub', 'groups'],
  rpcMethod: 'emojihub.groups',
  description: 'List EmojiHub group names.',
  category: 'art-design',
  options: [createLimitOption('group')],
  paramsSchema: taxonomyParamsSchema,
  execute: params => listEmojiHubGroups(params),
  normalizeParams: params => taxonomyParamsSchema.parse(params),
  resultKind: 'emojihub.groups',
  defaultFormat: 'text',
}

export const emojiHubProvider: PublicApiProviderModule = {
  manifest: {
    id: 'emojihub',
    name: 'EmojiHub',
    description: 'No-auth HTTPS JSON API for emoji lookup by random, search, category, and group.',
    publicApisCategory: 'Art & Design',
    homepageUrl: 'https://github.com/cheatsnake/emojihub',
    docsUrl: 'https://github.com/cheatsnake/emojihub',
    auth: {
      mode: 'none',
      notes: ['GitHub README documents public HTTPS endpoints without API keys.'],
    },
    tags: ['art', 'emoji', 'unicode', 'taxonomy', 'no-auth'],
    freePlanNotes: ['No documented rate limit or maximum result count found in README; CLI caps list/search output at 100.'],
  },
  operations: [randomOperation, searchOperation, categoriesOperation, groupsOperation],
  endpoints: [
    {
      id: 'emojihub-random',
      method: 'GET',
      urlPattern: 'https://emojihub.yurace.pro/api/random',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'EmojiHub random emoji endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/cheatsnake/emojihub'],
      consumedBy: ['emojihub random'],
      notes: ['No authentication required.'],
    },
    {
      id: 'emojihub-search',
      method: 'GET',
      urlPattern: 'https://emojihub.yurace.pro/api/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'EmojiHub search endpoint using q query parameter.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/cheatsnake/emojihub'],
      consumedBy: ['emojihub search'],
      notes: ['No authentication required.'],
    },
    {
      id: 'emojihub-category',
      method: 'GET',
      urlPattern: 'https://emojihub.yurace.pro/api/all/category/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'EmojiHub category-filtered emoji list endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/cheatsnake/emojihub'],
      consumedBy: ['emojihub search'],
      notes: ['No authentication required.', 'Category path uses slug values such as animals-and-nature.'],
    },
    {
      id: 'emojihub-group',
      method: 'GET',
      urlPattern: 'https://emojihub.yurace.pro/api/all/group/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'EmojiHub group-filtered emoji list endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/cheatsnake/emojihub'],
      consumedBy: ['emojihub search'],
      notes: ['No authentication required.', 'Group path uses slug values such as cat-face.'],
    },
    {
      id: 'emojihub-categories',
      method: 'GET',
      urlPattern: 'https://emojihub.yurace.pro/api/categories',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'EmojiHub category taxonomy endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/cheatsnake/emojihub'],
      consumedBy: ['emojihub categories'],
      notes: ['No authentication required.'],
    },
    {
      id: 'emojihub-groups',
      method: 'GET',
      urlPattern: 'https://emojihub.yurace.pro/api/groups',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'EmojiHub group taxonomy endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://github.com/cheatsnake/emojihub'],
      consumedBy: ['emojihub groups'],
      notes: ['No authentication required.'],
    },
  ],
}

function createLimitOption(label: 'category' | 'group') {
  return {
    name: 'limit',
    flag: '--limit <count>',
    description: `Maximum ${label} names to show, 1-100; default 100`,
    exposure: 'primary' as const,
    group: 'pagination' as const,
    reason: `Bounds terminal output because EmojiHub does not document a ${label} list maximum.`,
    valueType: 'integer' as const,
    defaultValue: '100',
  }
}
