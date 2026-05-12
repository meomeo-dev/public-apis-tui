import { WaifuImClient, type WaifuImImagesQuery, type WaifuImPagedResponse, type WaifuImTag } from '../../infrastructure/openApis/waifuImClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const nsfwModes = ['False', 'True', 'All'] as const
const animatedModes = ['False', 'True', 'All'] as const
const imageOrderBy = ['Random', 'UploadedAt', 'Favorites'] as const
const orientations = ['All', 'Landscape', 'Portrait', 'Square'] as const

export type WaifuImImagesInput = {
  includedTags?: string | undefined
  excludedTags?: string | undefined
  nsfw?: string | undefined
  animated?: string | undefined
  orderBy?: string | undefined
  orientation?: string | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export type WaifuImTagsInput = {
  name?: string | undefined
  slugs?: string | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export type WaifuImApiMeta = {
  provider: 'waifu.im'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /images' | 'GET /tags'
  docsUrl: 'https://waifu.im/docs'
  openApiUrl: 'https://api.waifu.im/openapi/v1.json'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedPageSize: 'PageSize max unlimited; CLI caps default interactive requests at 100'
}

export type WaifuImImageResult = {
  id: number
  url: string
  source?: string | undefined
  extension: string
  dominantColor: string
  width: number
  height: number
  byteSize: number
  isNsfw: boolean
  isAnimated: boolean
  favorites: number
  uploadedAt: string
  artists: string[]
  tags: string[]
}

export type WaifuImTagResult = {
  id: number
  name: string
  slug: string
  description: string
  imageCount: number
}

export type WaifuImImagesResult = {
  kind: 'waifuim.images'
  api: WaifuImApiMeta
  query: {
    includedTags: string[]
    excludedTags: string[]
    nsfw: 'False' | 'True' | 'All'
    animated: 'False' | 'True' | 'All'
    orderBy: 'Random' | 'UploadedAt' | 'Favorites'
    orientation: 'All' | 'Landscape' | 'Portrait' | 'Square'
    page: number
    pageSize: number
  }
  pagination: WaifuImPagination
  count: number
  images: WaifuImImageResult[]
}

export type WaifuImTagsResult = {
  kind: 'waifuim.tags'
  api: WaifuImApiMeta
  query: {
    name?: string | undefined
    slugs: string[]
    page: number
    pageSize: number
  }
  pagination: WaifuImPagination
  count: number
  tags: WaifuImTagResult[]
}

type WaifuImPagination = {
  pageNumber: number
  totalPages: number
  totalCount: number
  maxPageSize: number
  defaultPageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export async function listWaifuImImages(input: WaifuImImagesInput = {}): Promise<WaifuImImagesResult> {
  const query = normalizeImagesInput(input)
  const client = new WaifuImClient()
  const response = await client.listImages(toClientImagesQuery(query))
  return {
    kind: 'waifuim.images',
    api: createApiMeta('GET /images'),
    query,
    pagination: toPagination(response),
    count: response.items.length,
    images: response.items.map(image => ({
      id: image.id,
      url: image.url,
      ...(image.source !== undefined ? { source: image.source } : {}),
      extension: image.extension,
      dominantColor: image.dominantColor,
      width: image.width,
      height: image.height,
      byteSize: image.byteSize,
      isNsfw: image.isNsfw,
      isAnimated: image.isAnimated,
      favorites: image.favorites,
      uploadedAt: image.uploadedAt,
      artists: image.artists.map(artist => artist.name),
      tags: image.tags.map(tag => tag.slug),
    })),
  }
}

export async function listWaifuImTags(input: WaifuImTagsInput = {}): Promise<WaifuImTagsResult> {
  const query = normalizeTagsInput(input)
  const client = new WaifuImClient()
  const response = await client.listTags({
    name: query.name,
    includedSlugs: query.slugs,
    page: query.page,
    pageSize: query.pageSize,
  })
  return {
    kind: 'waifuim.tags',
    api: createApiMeta('GET /tags'),
    query,
    pagination: toPagination(response),
    count: response.items.length,
    tags: response.items.map(toTagResult),
  }
}

function createApiMeta(endpoint: WaifuImApiMeta['endpoint']): WaifuImApiMeta {
  return {
    provider: 'waifu.im',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://waifu.im/docs',
    openApiUrl: 'https://api.waifu.im/openapi/v1.json',
    usesBrowserClickstream: false,
    authentication: 'none',
    documentedPageSize: 'PageSize max unlimited; CLI caps default interactive requests at 100',
  }
}

function normalizeImagesInput(input: WaifuImImagesInput): WaifuImImagesResult['query'] {
  return {
    includedTags: parseCsv(input.includedTags),
    excludedTags: parseCsv(input.excludedTags),
    nsfw: normalizeEnum(input.nsfw, nsfwModes, 'nsfw') ?? 'False',
    animated: normalizeEnum(input.animated, animatedModes, 'animated') ?? 'All',
    orderBy: normalizeEnum(input.orderBy, imageOrderBy, 'orderBy') ?? 'Random',
    orientation: normalizeEnum(input.orientation, orientations, 'orientation') ?? 'All',
    page: normalizePage(input.page),
    pageSize: normalizePageSize(input.pageSize),
  }
}

function normalizeTagsInput(input: WaifuImTagsInput): WaifuImTagsResult['query'] {
  return {
    ...normalizeOptionalText(input.name, 'name'),
    slugs: parseCsv(input.slugs),
    page: normalizePage(input.page),
    pageSize: normalizePageSize(input.pageSize),
  }
}

function toClientImagesQuery(query: WaifuImImagesResult['query']): WaifuImImagesQuery {
  return {
    isNsfw: query.nsfw,
    includedTags: query.includedTags,
    excludedTags: query.excludedTags,
    isAnimated: query.animated,
    orderBy: query.orderBy,
    orientation: query.orientation,
    page: query.page,
    pageSize: query.pageSize,
  }
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Waifu.im --page must be a positive integer.', { page: value })
  }
  return page
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = value ?? 100
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Waifu.im --page-size must be an integer from 1 to 100.', {
      pageSize: value,
      note: 'OpenAPI says PageSize max is unlimited; the CLI caps interactive requests at 100.',
    })
  }
  return pageSize
}

function normalizeEnum<TValues extends readonly string[]>(
  value: string | undefined,
  values: TValues,
  name: string,
): TValues[number] | undefined {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return undefined
  }
  const match = values.find(entry => entry.toLowerCase() === normalized.toLowerCase())
  if (match !== undefined) {
    return match
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `Waifu.im --${name} must be one of ${values.join(', ')}.`, {
    [name]: value,
    supported: [...values],
  })
}

function parseCsv(value: string | undefined): string[] {
  return value?.split(',').map(entry => entry.trim()).filter(entry => entry !== '') ?? []
}

function normalizeOptionalText<TName extends 'name'>(value: string | undefined, name: TName): { [key in TName]?: string } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { [name]: normalized } as { [key in TName]?: string }
}

function toPagination(response: WaifuImPagedResponse<unknown>): WaifuImPagination {
  return {
    pageNumber: response.pageNumber,
    totalPages: response.totalPages,
    totalCount: response.totalCount,
    maxPageSize: response.maxPageSize,
    defaultPageSize: response.defaultPageSize,
    hasNextPage: response.hasNextPage,
    hasPreviousPage: response.hasPreviousPage,
  }
}

function toTagResult(tag: WaifuImTag): WaifuImTagResult {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    imageCount: tag.imageCount,
  }
}
