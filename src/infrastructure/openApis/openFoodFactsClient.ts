import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_FOOD_FACTS_DEFAULT_BASE_URL = 'https://world.openfoodfacts.org'
export const OPEN_FOOD_FACTS_DEFAULT_BARCODE = '737628064502'
export const OPEN_FOOD_FACTS_DEFAULT_SEARCH = 'nutella'
export const OPEN_FOOD_FACTS_DEFAULT_PAGE_SIZE = 100
export const OPEN_FOOD_FACTS_MAX_PAGE_SIZE = 100
export const OPEN_FOOD_FACTS_DEFAULT_PAGE = 1
export const OPEN_FOOD_FACTS_USER_AGENT = 'public-apis-tui/0.5.0 (https://github.com/meomeo-dev/public-apis-tui)'

const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'brands',
  'quantity',
  'nutriscore_grade',
  'nova_group',
  'categories_tags',
  'labels_tags',
  'ingredients_text',
  'nutriments',
  'url',
].join(',')

const SEARCH_FIELDS = [
  'code',
  'product_name',
  'brands',
  'quantity',
  'nutriscore_grade',
  'nova_group',
  'categories_tags',
  'labels_tags',
  'url',
].join(',')

export type OpenFoodFactsProductInput = {
  barcode?: string | undefined
}

export type NormalizedOpenFoodFactsProductInput = {
  barcode: string
}

export type OpenFoodFactsSearchInput = {
  query?: string | undefined
  pageSize?: number | undefined
  page?: number | undefined
  tagType?: string | undefined
  tag?: string | undefined
}

export type NormalizedOpenFoodFactsSearchInput = {
  query: string
  pageSize: number
  page: number
  tagType?: string | undefined
  tag?: string | undefined
}

export type OpenFoodFactsProduct = {
  code: string
  name?: string | undefined
  brands?: string | undefined
  quantity?: string | undefined
  nutriscoreGrade?: string | undefined
  novaGroup?: number | undefined
  categoriesTags: string[]
  labelsTags: string[]
  ingredientsText?: string | undefined
  nutriments: Record<string, unknown>
  url?: string | undefined
}

export type OpenFoodFactsProductEnvelope = {
  code: string
  status: number
  statusVerbose?: string | undefined
  product?: OpenFoodFactsProduct | undefined
}

export type OpenFoodFactsSearchEnvelope = {
  count: number
  page: number
  pageCount: number
  pageSize: number
  products: OpenFoodFactsProduct[]
}

export class OpenFoodFactsClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async getProduct(input: NormalizedOpenFoodFactsProductInput): Promise<OpenFoodFactsProductEnvelope> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(input.barcode)}.json`, this.options.baseUrl ?? OPEN_FOOD_FACTS_DEFAULT_BASE_URL)
    url.searchParams.set('fields', PRODUCT_FIELDS)
    const parsed = await this.fetchJson(url)
    return parseProductEnvelope(parsed)
  }

  async searchProducts(input: NormalizedOpenFoodFactsSearchInput): Promise<OpenFoodFactsSearchEnvelope> {
    const url = new URL('/cgi/search.pl', this.options.baseUrl ?? OPEN_FOOD_FACTS_DEFAULT_BASE_URL)
    url.searchParams.set('search_terms', input.query)
    url.searchParams.set('search_simple', '1')
    url.searchParams.set('action', 'process')
    url.searchParams.set('json', '1')
    url.searchParams.set('page_size', String(input.pageSize))
    url.searchParams.set('page', String(input.page))
    url.searchParams.set('fields', SEARCH_FIELDS)
    if (input.tagType !== undefined && input.tag !== undefined) {
      url.searchParams.set(`${input.tagType}_tags`, input.tag)
    }
    const parsed = await this.fetchJson(url)
    return parseSearchEnvelope(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': OPEN_FOOD_FACTS_USER_AGENT,
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Food Facts request failed: ${String(error)}`, {
        provider: 'openfoodfacts',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Food Facts returned a non-JSON response: ${String(error)}`, {
        provider: 'openfoodfacts',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Food Facts request failed with HTTP ${response.status}.`, {
        provider: 'openfoodfacts',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeOpenFoodFactsProductInput(input: OpenFoodFactsProductInput = {}): NormalizedOpenFoodFactsProductInput {
  return { barcode: normalizeBarcode(input.barcode ?? OPEN_FOOD_FACTS_DEFAULT_BARCODE) }
}

export function normalizeOpenFoodFactsSearchInput(input: OpenFoodFactsSearchInput = {}): NormalizedOpenFoodFactsSearchInput {
  const tagType = input.tagType === undefined ? undefined : normalizeTagType(input.tagType)
  const tag = input.tag === undefined ? undefined : normalizeText(input.tag, '--tag')
  if ((tagType === undefined) !== (tag === undefined)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--tag-type and --tag must be provided together.')
  }
  return {
    query: normalizeText(input.query ?? OPEN_FOOD_FACTS_DEFAULT_SEARCH, '--query'),
    pageSize: normalizePageSize(input.pageSize),
    page: normalizePage(input.page),
    ...(tagType !== undefined ? { tagType } : {}),
    ...(tag !== undefined ? { tag } : {}),
  }
}

function normalizeBarcode(value: string): string {
  const barcode = value.trim()
  if (!/^\d{6,18}$/u.test(barcode)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--barcode must be a numeric product barcode from 6 to 18 digits.')
  }
  return barcode
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = value ?? OPEN_FOOD_FACTS_DEFAULT_PAGE_SIZE
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > OPEN_FOOD_FACTS_MAX_PAGE_SIZE) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--page-size must be an integer from 1 to ${OPEN_FOOD_FACTS_MAX_PAGE_SIZE}.`)
  }
  return pageSize
}

function normalizePage(value: number | undefined): number {
  const page = value ?? OPEN_FOOD_FACTS_DEFAULT_PAGE
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--page must be a positive integer.')
  }
  return page
}

function normalizeTagType(value: string): string {
  const tagType = normalizeText(value, '--tag-type')
  if (!['categories', 'brands', 'labels', 'countries'].includes(tagType)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--tag-type must be one of categories, brands, labels, or countries.')
  }
  return tagType
}

function normalizeText(value: string, label: string): string {
  const text = value.trim()
  if (text.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return text
}

function parseProductEnvelope(value: unknown): OpenFoodFactsProductEnvelope {
  if (!isRecord(value) || typeof value.code !== 'string' || typeof value.status !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Food Facts product response had an unexpected schema.')
  }
  return {
    code: value.code,
    status: value.status,
    statusVerbose: optionalString(value.status_verbose),
    product: value.product === undefined || value.status !== 1 ? undefined : parseProduct(value.product, value.code),
  }
}

function parseSearchEnvelope(value: unknown): OpenFoodFactsSearchEnvelope {
  if (!isRecord(value) || !isNumericValue(value.count) || !isNumericValue(value.page) || !isNumericValue(value.page_size) || !Array.isArray(value.products)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Food Facts search response had an unexpected schema.')
  }
  return {
    count: toNumber(value.count),
    page: toNumber(value.page),
    pageCount: isNumericValue(value.page_count) ? toNumber(value.page_count) : value.products.length,
    pageSize: toNumber(value.page_size),
    products: value.products.map(product => parseProduct(product, undefined)),
  }
}

function parseProduct(value: unknown, fallbackCode: string | undefined): OpenFoodFactsProduct {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Food Facts product item had an unexpected schema.')
  }
  const code = optionalString(value.code) ?? fallbackCode
  if (code === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Food Facts product item was missing code.')
  }
  return {
    code,
    name: optionalString(value.product_name),
    brands: optionalString(value.brands),
    quantity: optionalString(value.quantity),
    nutriscoreGrade: optionalString(value.nutriscore_grade),
    novaGroup: optionalNumber(value.nova_group),
    categoriesTags: parseStringArray(value.categories_tags),
    labelsTags: parseStringArray(value.labels_tags),
    ingredientsText: optionalString(value.ingredients_text),
    nutriments: isRecord(value.nutriments) ? value.nutriments : {},
    url: optionalString(value.url),
  }
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isNumericValue(value: unknown): value is number | string {
  return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
