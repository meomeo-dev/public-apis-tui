import { z } from 'zod'
import { searchPostalCodes, type PostalCodesSearchInput } from '../../application/usecases/postalCodes.js'
import {
  POSTAL_CODES_DEFAULT_COUNTRY,
  POSTAL_CODES_DEFAULT_LIMIT,
  POSTAL_CODES_DEFAULT_QUERY,
  POSTAL_CODES_DOCS_URL,
  POSTAL_CODES_MAX_LIMIT,
  normalizePostalCodesSearchInput,
} from '../../infrastructure/openApis/postalCodesClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  country: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<PostalCodesSearchInput>

const searchOperation: PublicApiOperationDefinition<PostalCodesSearchInput> = {
  id: 'postalcodes.search',
  providerId: 'postalcodes',
  name: 'Search',
  commandPath: ['postalcodes', 'search'],
  rpcMethod: 'postalcodes.search',
  description: 'Search PostalCodes.info postal-code and locality suggestions using the no-auth /search endpoint.',
  category: 'geocoding',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search term, default ${POSTAL_CODES_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented search endpoint requires a q parameter with at least 2 characters.',
      defaultValue: POSTAL_CODES_DEFAULT_QUERY,
    },
    {
      name: 'country',
      flag: '--country <code>',
      description: `Optional ISO 3166-1 alpha-2 country filter, default ${POSTAL_CODES_DEFAULT_COUNTRY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Country filtering is documented and keeps search suggestions relevant.',
      defaultValue: POSTAL_CODES_DEFAULT_COUNTRY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Suggestions to show, default ${String(POSTAL_CODES_DEFAULT_LIMIT)}, max ${String(POSTAL_CODES_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Search can return many suggestions; CLI caps output and cached payload size.',
      valueType: 'integer',
      defaultValue: String(POSTAL_CODES_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchPostalCodes(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePostalCodesSearchInput(params),
  resultKind: 'postalcodes.search',
  defaultFormat: 'text',
}

export const postalCodesProvider: PublicApiProviderModule = {
  manifest: {
    id: 'postalcodes',
    name: 'PostalCodes.info',
    description: 'No-auth HTTPS JSON postal-code and locality search suggestions.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://postalcodes.info/',
    docsUrl: POSTAL_CODES_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented /search endpoint requires no API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'postal-codes', 'addresses', 'search', 'json', 'no-auth'],
    freePlanNotes: [
      'Search data is reference/search data, not an official delivery-grade postal authority API.',
      'OpenAPI documents tokenized same-origin country downloads; CLI intentionally exposes only lightweight /search.',
      'Data licence is Open Database License 1.0 according to the OpenAPI document.',
    ],
  },
  operations: [searchOperation],
  endpoints: [
    {
      id: 'postalcodes-search',
      method: 'GET',
      urlPattern: 'https://postalcodes.info/search*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'PostalCodes.info lightweight search suggestions endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [POSTAL_CODES_DOCS_URL, 'https://postalcodes.info/search?q=90210&country=US', 'https://postalcodes.info/search?q=madrid&country=ES'],
      consumedBy: ['public-apis apis run postalcodes.search'],
      notes: ['No authentication required for /search.', 'Tokenized download.php country exports are intentionally not exposed.', 'Reference data only; validate shipping/compliance decisions against national postal authorities.'],
    },
  ],
}

export type { PostalCodesSearchInput } from '../../application/usecases/postalCodes.js'
