import {
  OpenFoodFactsClient,
  OPEN_FOOD_FACTS_MAX_PAGE_SIZE,
  OPEN_FOOD_FACTS_USER_AGENT,
  normalizeOpenFoodFactsProductInput,
  normalizeOpenFoodFactsSearchInput,
  type OpenFoodFactsProduct,
  type OpenFoodFactsProductInput,
  type OpenFoodFactsSearchInput,
} from '../../infrastructure/openApis/openFoodFactsClient.js'

export type OpenFoodFactsProductResult = {
  kind: 'openfoodfacts.product'
  api: OpenFoodFactsMeta
  query: ReturnType<typeof normalizeOpenFoodFactsProductInput>
  found: boolean
  status: number
  statusVerbose?: string | undefined
  product?: OpenFoodFactsProduct | undefined
}

export type OpenFoodFactsSearchResult = {
  kind: 'openfoodfacts.search'
  api: OpenFoodFactsMeta
  query: ReturnType<typeof normalizeOpenFoodFactsSearchInput>
  pagination: {
    total: number
    returned: number
    page: number
    pageSize: number
    pageCount: number
    maxPageSize: number
  }
  products: OpenFoodFactsProduct[]
}

type OpenFoodFactsMeta = {
  provider: 'openfoodfacts'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  userAgent: string
  rateLimit: string
}

const commonApiMeta = {
  provider: 'openfoodfacts',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  userAgent: OPEN_FOOD_FACTS_USER_AGENT,
  rateLimit: '100 req/min for product reads; 10 req/min for search reads per official docs',
} satisfies Omit<OpenFoodFactsMeta, 'endpoint'>

export async function getOpenFoodFactsProduct(input: OpenFoodFactsProductInput = {}): Promise<OpenFoodFactsProductResult> {
  const query = normalizeOpenFoodFactsProductInput(input)
  const client = new OpenFoodFactsClient()
  const response = await client.getProduct(query)
  return {
    kind: 'openfoodfacts.product',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/v2/product/{barcode}.json',
    },
    query,
    found: response.product !== undefined,
    status: response.status,
    ...(response.statusVerbose !== undefined ? { statusVerbose: response.statusVerbose } : {}),
    ...(response.product !== undefined ? { product: response.product } : {}),
  }
}

export async function searchOpenFoodFactsProducts(input: OpenFoodFactsSearchInput = {}): Promise<OpenFoodFactsSearchResult> {
  const query = normalizeOpenFoodFactsSearchInput(input)
  const client = new OpenFoodFactsClient()
  const response = await client.searchProducts(query)
  return {
    kind: 'openfoodfacts.search',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /cgi/search.pl',
    },
    query,
    pagination: {
      total: response.count,
      returned: response.products.length,
      page: response.page,
      pageSize: response.pageSize,
      pageCount: response.pageCount,
      maxPageSize: OPEN_FOOD_FACTS_MAX_PAGE_SIZE,
    },
    products: response.products,
  }
}
