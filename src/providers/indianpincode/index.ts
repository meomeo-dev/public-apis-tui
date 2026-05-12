import { z } from 'zod'
import { searchIndianPincode, type IndianPincodeSearchInput } from '../../application/usecases/indianPincode.js'
import {
  INDIAN_PINCODE_DEFAULT_LIMIT,
  INDIAN_PINCODE_DEFAULT_QUERY,
  INDIAN_PINCODE_DEFAULT_TYPE,
  normalizeIndianPincodeSearchInput,
} from '../../infrastructure/openApis/indianPincodeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
  type: z.enum(['all', 'state', 'district', 'pincode']).optional(),
}) satisfies z.ZodType<IndianPincodeSearchInput>

const rawSearchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
  type: z.string().optional(),
})

const searchOperation: PublicApiOperationDefinition<IndianPincodeSearchInput> = {
  id: 'indianpincode.search',
  providerId: 'indianpincode',
  name: 'Search',
  commandPath: ['indianpincode', 'search'],
  rpcMethod: 'indianpincode.search',
  description: 'Search Indian pincodes, post offices, districts, and states.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search text or PIN code, default ${INDIAN_PINCODE_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented SearchAction and JSON endpoint are driven by the q search term.',
      defaultValue: INDIAN_PINCODE_DEFAULT_QUERY,
    },
    {
      name: 'type',
      flag: '--type <all|state|district|pincode>',
      description: `Local result type filter, default ${INDIAN_PINCODE_DEFAULT_TYPE}`,
      exposure: 'advanced',
      group: 'filters',
      reason: 'The upstream endpoint returns mixed result types; a local filter supports focused terminal review without inventing upstream parameters.',
      defaultValue: INDIAN_PINCODE_DEFAULT_TYPE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Results to show/cache, default/cap ${INDIAN_PINCODE_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show the endpoint returns at most 10 results and ignores page/limit parameters, so CLI defaults/caps at the observed maximum.',
      valueType: 'integer',
      defaultValue: String(INDIAN_PINCODE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchIndianPincode(params),
  normalizeParams: params => normalizeIndianPincodeSearchParams(params),
  createCacheKeyParams: params => normalizeIndianPincodeSearchInput(params),
  resultKind: 'indianpincode.search',
  defaultFormat: 'text',
}

function normalizeIndianPincodeSearchParams(params: Record<string, unknown>): IndianPincodeSearchInput {
  const rawParams = rawSearchParamsSchema.parse(params)
  return normalizeIndianPincodeSearchInput({
    query: rawParams.query,
    limit: rawParams.limit,
    type: rawParams.type as IndianPincodeSearchInput['type'],
  })
}

export const indianPincodeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'indianpincode',
    name: 'Indian Pincode',
    description: 'No-auth HTTPS JSON search endpoint for Indian PIN codes, post offices, districts, and states.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://indianpincode.com/',
    docsUrl: 'https://indianpincode.com/',
    auth: {
      mode: 'none',
      notes: ['The implemented /api/search endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['government', 'india', 'pincode', 'postal-code', 'post-office', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'The site exposes SearchAction metadata pointing to https://indianpincode.com/api/search?q={search_term_string}.',
      'Live probes show the endpoint returns up to 10 mixed state/district/pincode rows and ignores page/limit parameters.',
      'HTML detail pages are intentionally not scraped; only repeatable JSON search is implemented.',
    ],
  },
  operations: [searchOperation],
  endpoints: [
    {
      id: 'indianpincode-search',
      method: 'GET',
      urlPattern: 'https://indianpincode.com/api/search',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Indian Pincode Directory JSON search endpoint.',
      observedOn: '2026-05-04',
      sampleSources: ['https://indianpincode.com/', 'https://indianpincode.com/api/search?q=mumbai'],
      consumedBy: ['public-apis apis run indianpincode.search'],
      notes: ['No authentication required; endpoint returns mixed state, district, and pincode results.', 'No Chrome clickstream or HTML scraping is used.'],
    },
  ],
}
