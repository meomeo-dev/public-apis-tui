import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WAIFU_IM_DEFAULT_BASE_URL = 'https://api.waifu.im'

export type WaifuImImagesQuery = {
  isNsfw?: 'False' | 'True' | 'All' | undefined
  includedTags?: string[] | undefined
  excludedTags?: string[] | undefined
  isAnimated?: 'False' | 'True' | 'All' | undefined
  orderBy?: 'Random' | 'UploadedAt' | 'Favorites' | 'AddedToAlbum' | undefined
  orientation?: 'All' | 'Landscape' | 'Portrait' | 'Square' | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export type WaifuImTagsQuery = {
  name?: string | undefined
  includedSlugs?: string[] | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export type WaifuImArtist = {
  id: number
  name: string
  pixiv?: string | undefined
  twitter?: string | undefined
}

export type WaifuImTag = {
  id: number
  name: string
  slug: string
  description: string
  imageCount: number
}

export type WaifuImImage = {
  id: number
  extension: string
  dominantColor: string
  source?: string | undefined
  artists: WaifuImArtist[]
  uploadedAt: string
  isNsfw: boolean
  isAnimated: boolean
  width: number
  height: number
  byteSize: number
  url: string
  tags: WaifuImTag[]
  favorites: number
}

export type WaifuImPagedResponse<TItem> = {
  items: TItem[]
  pageNumber: number
  totalPages: number
  totalCount: number
  maxPageSize: number
  defaultPageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type WaifuImClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class WaifuImClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: WaifuImClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? WAIFU_IM_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listImages(query: WaifuImImagesQuery = {}): Promise<WaifuImPagedResponse<WaifuImImage>> {
    const value = await this.getJson('/images', query)
    return parsePagedResponse(value, parseImage, 'Waifu.im images')
  }

  async listTags(query: WaifuImTagsQuery = {}): Promise<WaifuImPagedResponse<WaifuImTag>> {
    const value = await this.getJson('/tags', query)
    return parsePagedResponse(value, parseTag, 'Waifu.im tags')
  }

  private async getJson(path: string, query: Record<string, unknown>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    appendOptionalStringParam(url, 'IsNsfw', query.isNsfw)
    appendRepeatedStringParams(url, 'IncludedTags', query.includedTags)
    appendRepeatedStringParams(url, 'ExcludedTags', query.excludedTags)
    appendOptionalStringParam(url, 'IsAnimated', query.isAnimated)
    appendOptionalStringParam(url, 'OrderBy', query.orderBy)
    appendOptionalStringParam(url, 'Orientation', query.orientation)
    appendOptionalStringParam(url, 'Name', query.name)
    appendRepeatedStringParams(url, 'IncludedSlugs', query.includedSlugs)
    appendOptionalNumberParam(url, 'Page', query.page)
    appendOptionalNumberParam(url, 'PageSize', query.pageSize)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Waifu.im returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'Waifu.im request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalStringParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'string' && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendRepeatedStringParams(url: URL, key: string, value: unknown): void {
  if (!Array.isArray(value)) {
    return
  }
  for (const item of value) {
    if (typeof item === 'string' && item.trim() !== '') {
      url.searchParams.append(key, item.trim())
    }
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function parsePagedResponse<TItem>(
  value: unknown,
  parseItem: (value: unknown) => TItem,
  label: string,
): WaifuImPagedResponse<TItem> {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} response must be an object.`)
  }
  const items = value.items
  if (!Array.isArray(items)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} response field items must be an array.`)
  }
  return {
    items: items.map(parseItem),
    pageNumber: readNumber(value, 'pageNumber'),
    totalPages: readNumber(value, 'totalPages'),
    totalCount: readNumber(value, 'totalCount'),
    maxPageSize: readNumber(value, 'maxPageSize'),
    defaultPageSize: readNumber(value, 'defaultPageSize'),
    hasPreviousPage: readBoolean(value, 'hasPreviousPage'),
    hasNextPage: readBoolean(value, 'hasNextPage'),
  }
}

function parseImage(value: unknown): WaifuImImage {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Waifu.im image item must be an object.')
  }
  return {
    id: readNumber(value, 'id'),
    extension: readString(value, 'extension'),
    dominantColor: readString(value, 'dominantColor'),
    ...readOptionalString(value, 'source', 'source'),
    artists: readArray(value, 'artists').map(parseArtist),
    uploadedAt: readString(value, 'uploadedAt'),
    isNsfw: readBoolean(value, 'isNsfw'),
    isAnimated: readBoolean(value, 'isAnimated'),
    width: readNumber(value, 'width'),
    height: readNumber(value, 'height'),
    byteSize: readNumber(value, 'byteSize'),
    url: readString(value, 'url'),
    tags: readArray(value, 'tags').map(parseTag),
    favorites: readNumber(value, 'favorites'),
  }
}

function parseArtist(value: unknown): WaifuImArtist {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Waifu.im artist item must be an object.')
  }
  return {
    id: readNumber(value, 'id'),
    name: readString(value, 'name'),
    ...readOptionalString(value, 'pixiv', 'pixiv'),
    ...readOptionalString(value, 'twitter', 'twitter'),
  }
}

function parseTag(value: unknown): WaifuImTag {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Waifu.im tag item must be an object.')
  }
  return {
    id: readNumber(value, 'id'),
    name: readString(value, 'name'),
    slug: readString(value, 'slug'),
    description: readString(value, 'description'),
    imageCount: readNumber(value, 'imageCount'),
  }
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Waifu.im field ${key} must be an array.`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Waifu.im field ${key} must be a string.`)
  }
  return value
}

function readOptionalString<TName extends 'source' | 'pixiv' | 'twitter'>(
  record: Record<string, unknown>,
  sourceKey: string,
  targetKey: TName,
): { [key in TName]?: string } {
  const value = record[sourceKey]
  return typeof value === 'string' && value.trim() !== '' ? { [targetKey]: value } as { [key in TName]?: string } : {}
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Waifu.im field ${key} must be a number.`)
  }
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Waifu.im field ${key} must be a boolean.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
