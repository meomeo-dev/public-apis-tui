import { EmojiHubClient, type EmojiHubEmoji } from '../../infrastructure/openApis/emojiHubClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type EmojiHubRandomInput = Record<string, never>

export type EmojiHubSearchInput = {
  query?: string | undefined
  category?: string | undefined
  group?: string | undefined
  limit?: number | undefined
}

export type EmojiHubTaxonomyInput = {
  limit?: number | undefined
}

export type EmojiHubApiMeta = {
  provider: 'emojihub'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /random' | 'GET /search' | 'GET /all/category/:category' | 'GET /all/group/:group' | 'GET /categories' | 'GET /groups'
  docsUrl: 'https://github.com/cheatsnake/emojihub'
  baseUrl: 'https://emojihub.yurace.pro/api'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximumResult: 'No finite maximum documented; CLI caps list/search output at 100'
}

export type EmojiHubEmojiResult = {
  name: string
  category: string
  group: string
  htmlCode: string[]
  unicode: string[]
  character: string
}

export type EmojiHubRandomResult = {
  kind: 'emojihub.random'
  api: EmojiHubApiMeta
  query: Record<string, never>
  emoji: EmojiHubEmojiResult
}

export type EmojiHubSearchResult = {
  kind: 'emojihub.search'
  api: EmojiHubApiMeta
  query: {
    query?: string | undefined
    category?: string | undefined
    group?: string | undefined
    limit: number
  }
  count: number
  emojis: EmojiHubEmojiResult[]
}

export type EmojiHubCategoriesResult = {
  kind: 'emojihub.categories'
  api: EmojiHubApiMeta
  query: {
    limit: number
  }
  count: number
  categories: string[]
}

export type EmojiHubGroupsResult = {
  kind: 'emojihub.groups'
  api: EmojiHubApiMeta
  query: {
    limit: number
  }
  count: number
  groups: string[]
}

export async function getEmojiHubRandom(_input: EmojiHubRandomInput = {}): Promise<EmojiHubRandomResult> {
  const client = new EmojiHubClient()
  const emoji = await client.getRandomEmoji()
  return {
    kind: 'emojihub.random',
    api: createApiMeta('GET /random'),
    query: {},
    emoji: toEmojiResult(emoji),
  }
}

export async function searchEmojiHub(input: EmojiHubSearchInput = {}): Promise<EmojiHubSearchResult> {
  const query = normalizeSearchInput(input)
  const client = new EmojiHubClient()
  const endpoint = resolveSearchEndpoint(query)
  const emojis = await client.searchEmojis(query)
  const limited = emojis.slice(0, query.limit).map(toEmojiResult)
  return {
    kind: 'emojihub.search',
    api: createApiMeta(endpoint),
    query,
    count: limited.length,
    emojis: limited,
  }
}

export async function listEmojiHubCategories(input: EmojiHubTaxonomyInput = {}): Promise<EmojiHubCategoriesResult> {
  const query = { limit: normalizeLimit(input.limit) }
  const client = new EmojiHubClient()
  const categories = (await client.listCategories()).slice(0, query.limit)
  return {
    kind: 'emojihub.categories',
    api: createApiMeta('GET /categories'),
    query,
    count: categories.length,
    categories,
  }
}

export async function listEmojiHubGroups(input: EmojiHubTaxonomyInput = {}): Promise<EmojiHubGroupsResult> {
  const query = { limit: normalizeLimit(input.limit) }
  const client = new EmojiHubClient()
  const groups = (await client.listGroups()).slice(0, query.limit)
  return {
    kind: 'emojihub.groups',
    api: createApiMeta('GET /groups'),
    query,
    count: groups.length,
    groups,
  }
}

function normalizeSearchInput(input: EmojiHubSearchInput): EmojiHubSearchResult['query'] {
  const query = normalizeOptionalText(input.query, 'query')
  const category = normalizeOptionalSlug(input.category, 'category')
  const group = normalizeOptionalSlug(input.group, 'group')
  const specified = [query.query, category.category, group.group].filter(value => value !== undefined)
  if (specified.length !== 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'EmojiHub search requires exactly one of --query, --category, or --group.', {
      supported: ['query', 'category', 'group'],
    })
  }
  return {
    ...query,
    ...category,
    ...group,
    limit: normalizeLimit(input.limit),
  }
}

function normalizeOptionalText<TName extends 'query'>(
  value: string | undefined,
  name: TName,
): { [key in TName]?: string } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { [name]: normalized } as { [key in TName]?: string }
}

function normalizeOptionalSlug<TName extends 'category' | 'group'>(
  value: string | undefined,
  name: TName,
): { [key in TName]?: string } {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return {}
  }
  const slug = normalized.toLowerCase().replace(/\s+/gu, '-')
  if (!/^[a-z0-9-]+$/u.test(slug)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `EmojiHub --${name} must be a documented slug or name using letters, numbers, spaces, or hyphens.`, {
      [name]: value,
    })
  }
  return { [name]: slug } as { [key in TName]?: string }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 100
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'EmojiHub --limit must be an integer from 1 to 100.', {
      limit: value,
      note: 'No provider max was found; CLI caps list/search output at 100.',
    })
  }
  return limit
}

function resolveSearchEndpoint(query: EmojiHubSearchResult['query']): EmojiHubApiMeta['endpoint'] {
  if (query.category !== undefined) {
    return 'GET /all/category/:category'
  }
  if (query.group !== undefined) {
    return 'GET /all/group/:group'
  }
  return 'GET /search'
}

function toEmojiResult(emoji: EmojiHubEmoji): EmojiHubEmojiResult {
  return {
    name: emoji.name,
    category: emoji.category,
    group: emoji.group,
    htmlCode: emoji.htmlCode,
    unicode: emoji.unicode,
    character: htmlCodesToCharacter(emoji.htmlCode),
  }
}

function htmlCodesToCharacter(codes: string[]): string {
  return codes.map(code => {
    const match = /^&#(x[0-9A-Fa-f]+|\d+);$/u.exec(code)
    if (match?.[1] === undefined) {
      return ''
    }
    const codePoint = match[1].startsWith('x')
      ? Number.parseInt(match[1].slice(1), 16)
      : Number.parseInt(match[1], 10)
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
  }).join('')
}

function createApiMeta(endpoint: EmojiHubApiMeta['endpoint']): EmojiHubApiMeta {
  return {
    provider: 'emojihub',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://github.com/cheatsnake/emojihub',
    baseUrl: 'https://emojihub.yurace.pro/api',
    usesBrowserClickstream: false,
    authentication: 'none',
    documentedMaximumResult: 'No finite maximum documented; CLI caps list/search output at 100',
  }
}
