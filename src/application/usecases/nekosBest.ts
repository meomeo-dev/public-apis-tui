import { NekosBestClient, type NekosBestAsset, type NekosBestSearchQuery } from '../../infrastructure/openApis/nekosBestClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const imageCategories = ['husbando', 'kitsune', 'neko', 'waifu'] as const
const gifCategories = [
  'angry',
  'baka',
  'bite',
  'bleh',
  'blowkiss',
  'blush',
  'bonk',
  'bored',
  'carry',
  'clap',
  'confused',
  'cry',
  'cuddle',
  'dance',
  'facepalm',
  'feed',
  'handhold',
  'handshake',
  'happy',
  'highfive',
  'hug',
  'kabedon',
  'kick',
  'kiss',
  'lappillow',
  'laugh',
  'lurk',
  'nod',
  'nom',
  'nope',
  'nya',
  'pat',
  'peck',
  'poke',
  'pout',
  'punch',
  'run',
  'salute',
  'shake',
  'shoot',
  'shocked',
  'shrug',
  'sip',
  'slap',
  'sleep',
  'smile',
  'smug',
  'spin',
  'stare',
  'tableflip',
  'teehee',
  'think',
  'thumbsup',
  'tickle',
  'wag',
  'wave',
  'wink',
  'yawn',
  'yeet',
] as const

const allCategories = [...imageCategories, ...gifCategories] as const
const searchTypes = ['image', 'gif'] as const

export type NekosBestRandomInput = {
  category?: string | undefined
  amount?: number | undefined
}

export type NekosBestSearchInput = {
  query: string
  type?: string | undefined
  category?: string | undefined
  amount?: number | undefined
}

export type NekosBestApiMeta = {
  provider: 'nekosbest'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /:category' | 'GET /search'
  docsUrl: 'https://docs.nekos.best/getting-started/api-endpoints.html'
  usesBrowserClickstream: false
  authentication: 'none'
  rateLimit: '200 requests/minute for category endpoints; 7 requests/5 seconds for /search'
  userAgentRequirement: 'Required by official docs'
}

export type NekosBestAssetResult = {
  url: string
  dimensions: {
    width: number
    height: number
  }
  category?: string | undefined
  contentType: 'image' | 'gif' | 'unknown'
  artistName?: string | undefined
  artistHref?: string | undefined
  sourceUrl?: string | undefined
  animeName?: string | undefined
}

export type NekosBestRandomResult = {
  kind: 'nekosbest.random'
  api: NekosBestApiMeta
  query: {
    category: string
    amount: number
  }
  count: number
  assets: NekosBestAssetResult[]
}

export type NekosBestSearchResult = {
  kind: 'nekosbest.search'
  api: NekosBestApiMeta
  query: {
    query: string
    type: 'image' | 'gif'
    typeCode: 1 | 2
    amount: number
    category?: string | undefined
  }
  count: number
  assets: NekosBestAssetResult[]
}

export async function getNekosBestRandom(input: NekosBestRandomInput = {}): Promise<NekosBestRandomResult> {
  const query = normalizeRandomInput(input)
  const client = new NekosBestClient()
  const response = await client.random(query)
  return {
    kind: 'nekosbest.random',
    api: createApiMeta('GET /:category'),
    query,
    count: response.results.length,
    assets: response.results.map(asset => toAssetResult(asset, query.category)),
  }
}

export async function searchNekosBest(input: NekosBestSearchInput): Promise<NekosBestSearchResult> {
  const query = normalizeSearchInput(input)
  const client = new NekosBestClient()
  const response = await client.search(toClientSearchQuery(query))
  return {
    kind: 'nekosbest.search',
    api: createApiMeta('GET /search'),
    query,
    count: response.results.length,
    assets: response.results.map(asset => toAssetResult(asset, query.category)),
  }
}

function createApiMeta(endpoint: NekosBestApiMeta['endpoint']): NekosBestApiMeta {
  return {
    provider: 'nekosbest',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://docs.nekos.best/getting-started/api-endpoints.html',
    usesBrowserClickstream: false,
    authentication: 'none',
    rateLimit: '200 requests/minute for category endpoints; 7 requests/5 seconds for /search',
    userAgentRequirement: 'Required by official docs',
  }
}

function normalizeRandomInput(input: NekosBestRandomInput): NekosBestRandomResult['query'] {
  return {
    category: normalizeCategory(input.category ?? 'neko'),
    amount: normalizeAmount(input.amount),
  }
}

function normalizeSearchInput(input: NekosBestSearchInput): NekosBestSearchResult['query'] {
  return {
    query: normalizeQuery(input.query),
    type: normalizeSearchType(input.type),
    typeCode: normalizeSearchType(input.type) === 'image' ? 1 : 2,
    amount: normalizeAmount(input.amount),
    ...normalizeOptionalCategory(input.category),
  }
}

function toClientSearchQuery(query: NekosBestSearchResult['query']): NekosBestSearchQuery {
  return {
    query: query.query,
    type: query.typeCode,
    category: query.category,
    amount: query.amount,
  }
}

function toAssetResult(asset: NekosBestAsset, category: string | undefined): NekosBestAssetResult {
  const assetCategory = category ?? inferCategoryFromAssetUrl(asset.url)
  return {
    url: asset.url,
    dimensions: asset.dimensions,
    ...(assetCategory !== undefined ? { category: assetCategory } : {}),
    contentType: inferContentType(asset.url),
    ...(asset.artistName !== undefined ? { artistName: asset.artistName } : {}),
    ...(asset.artistHref !== undefined ? { artistHref: asset.artistHref } : {}),
    ...(asset.sourceUrl !== undefined ? { sourceUrl: asset.sourceUrl } : {}),
    ...(asset.animeName !== undefined ? { animeName: asset.animeName } : {}),
  }
}

function normalizeAmount(value: number | undefined): number {
  const amount = value ?? 20
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'NekosBest --amount must be an integer from 1 to 20.', {
      amount: value,
      note: 'Official docs document 1 ≤ amount ≤ 20; the CLI default uses the documented maximum.',
    })
  }
  return amount
}

function normalizeQuery(value: string | undefined): string {
  const query = value?.trim()
  if (query === undefined || query === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'NekosBest --query is required for search.')
  }
  return query
}

function normalizeSearchType(value: string | undefined): 'image' | 'gif' {
  const normalized = value?.trim().toLowerCase() ?? 'image'
  if (isOneOf(normalized, searchTypes)) {
    return normalized
  }
  if (normalized === '1' || normalized === 'images') {
    return 'image'
  }
  if (normalized === '2' || normalized === 'gifs') {
    return 'gif'
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'NekosBest --type must be image or gif.', {
    type: value,
    supported: [...searchTypes],
  })
}

function normalizeOptionalCategory(value: string | undefined): { category?: string | undefined } {
  if (value === undefined || value.trim() === '') {
    return {}
  }
  return { category: normalizeCategory(value) }
}

function normalizeCategory(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (isOneOf(normalized, allCategories)) {
    return normalized
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'NekosBest --category must be a documented category.', {
    category: value,
    supported: [...allCategories],
  })
}

function inferContentType(url: string): NekosBestAssetResult['contentType'] {
  const pathname = readUrlPathname(url)
  if (pathname.endsWith('.gif')) {
    return 'gif'
  }
  if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.webp')) {
    return 'image'
  }
  return 'unknown'
}

function inferCategoryFromAssetUrl(url: string): string | undefined {
  const pathname = readUrlPathname(url)
  const match = /^\/api\/v2\/([^/]+)\//u.exec(pathname)
  if (match === null) {
    return undefined
  }
  const category = match[1]
  return category !== undefined && isOneOf(category, allCategories) ? category : undefined
}

function readUrlPathname(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value)
}
