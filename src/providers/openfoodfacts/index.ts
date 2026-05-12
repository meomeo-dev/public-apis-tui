import { z } from 'zod'
import { getOpenFoodFactsProduct } from '../../application/usecases/openFoodFacts.js'
import {
  OPEN_FOOD_FACTS_DEFAULT_BARCODE,
  normalizeOpenFoodFactsProductInput,
  type OpenFoodFactsProductInput,
} from '../../infrastructure/openApis/openFoodFactsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const productParamsSchema = z.object({
  barcode: z.string().optional(),
}) satisfies z.ZodType<OpenFoodFactsProductInput>

const productOperation: PublicApiOperationDefinition<OpenFoodFactsProductInput> = {
  id: 'openfoodfacts.product',
  providerId: 'openfoodfacts',
  name: 'Product by Barcode',
  commandPath: ['openfoodfacts', 'product'],
  rpcMethod: 'openfoodfacts.product',
  description: 'Read one Open Food Facts product by barcode.',
  category: 'food-drink',
  options: [
    {
      name: 'barcode',
      flag: '--barcode <code>',
      description: `Product barcode, default ${OPEN_FOOD_FACTS_DEFAULT_BARCODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Barcode lookup is the documented primary product-read workflow and has the higher 100 req/min read limit.',
      defaultValue: OPEN_FOOD_FACTS_DEFAULT_BARCODE,
    },
  ],
  paramsSchema: productParamsSchema,
  execute: params => getOpenFoodFactsProduct(params),
  normalizeParams: params => productParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenFoodFactsProductInput(params),
  resultKind: 'openfoodfacts.product',
  defaultFormat: 'text',
}

export const openFoodFactsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'openfoodfacts',
    name: 'Open Food Facts',
    description: 'No-auth HTTPS JSON API for open food product data and barcode lookup.',
    publicApisCategory: 'Food & Drink',
    homepageUrl: 'https://world.openfoodfacts.org/data',
    docsUrl: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
    auth: {
      mode: 'none',
      notes: ['Read endpoints require no API key; write/contribution workflows are intentionally excluded.'],
    },
    tags: ['food-drink', 'nutrition', 'products', 'barcode', 'open-data', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs require a custom User-Agent for API calls.',
      'Official docs state 100 req/min for product reads and 10 req/min for search reads.',
      'Search is hidden because repeated audit probes returned intermittent HTML 503 pages to direct no-auth clients.',
    ],
  },
  operations: [productOperation],
  endpoints: [
    {
      id: 'openfoodfacts-product-v2',
      method: 'GET',
      urlPattern: 'https://world.openfoodfacts.org/api/v2/product/*.json*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Open Food Facts v2 product lookup endpoint by barcode.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://openfoodfacts.github.io/openfoodfacts-server/api/', 'https://world.openfoodfacts.org/api/v2/product/737628064502.json'],
      consumedBy: ['openfoodfacts product'],
      notes: ['No authentication required for read endpoint.', 'Custom User-Agent required by official conditions.'],
    },
    {
      id: 'openfoodfacts-search-v2',
      method: 'GET',
      urlPattern: 'https://world.openfoodfacts.org/cgi/search.pl*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Open Food Facts JSON product search endpoint with search terms, page, and page size.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://openfoodfacts.github.io/openfoodfacts-server/api/', 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=nutella&search_simple=1&action=process&json=1&page_size=2'],
      consumedBy: [],
      notes: [
        'No authentication required for read endpoint.',
        'Hidden from TUI/CLI after 2026-05-07 audit because repeated direct no-auth probes intermittently returned HTTP 503 text/html maintenance pages instead of JSON.',
      ],
    },
  ],
}
