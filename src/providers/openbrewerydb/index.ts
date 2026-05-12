import { z } from 'zod'
import {
  getOpenBreweryDbMeta,
  listOpenBreweryDbBreweries,
  searchOpenBreweryDbBreweries,
} from '../../application/usecases/openBreweryDb.js'
import {
  OPEN_BREWERY_DB_DEFAULT_PAGE,
  OPEN_BREWERY_DB_DEFAULT_PER_PAGE,
  OPEN_BREWERY_DB_DEFAULT_SEARCH_QUERY,
  OPEN_BREWERY_DB_MAX_PER_PAGE,
  normalizeOpenBreweryDbListInput,
  normalizeOpenBreweryDbMetaInput,
  normalizeOpenBreweryDbSearchInput,
  type OpenBreweryDbListInput,
  type OpenBreweryDbMetaInput,
  type OpenBreweryDbSearchInput,
} from '../../infrastructure/openApis/openBreweryDbClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const listParamsSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  type: z.string().optional(),
  postal: z.string().optional(),
  perPage: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  sort: z.string().optional(),
}) satisfies z.ZodType<OpenBreweryDbListInput>

const searchParamsSchema = z.object({
  query: z.string().optional(),
  perPage: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenBreweryDbSearchInput>

const metaParamsSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  type: z.string().optional(),
  postal: z.string().optional(),
}) satisfies z.ZodType<OpenBreweryDbMetaInput>

const filterOptions = [
  {
    name: 'city',
    flag: '--city <name>',
    description: 'Filter by city, e.g. san_diego',
    exposure: 'primary',
    group: 'filters',
    reason: 'City filtering is documented and useful for local brewery discovery.',
  },
  {
    name: 'state',
    flag: '--state <name>',
    description: 'Filter by state or province, e.g. california',
    exposure: 'primary',
    group: 'filters',
    reason: 'State/province filtering is documented and useful for regional analysis.',
  },
  {
    name: 'country',
    flag: '--country <name>',
    description: 'Filter by country, e.g. united_states',
    exposure: 'advanced',
    group: 'filters',
    reason: 'Country filtering is useful but secondary to city/state terminal workflows.',
  },
  {
    name: 'type',
    flag: '--type <type>',
    description: 'Filter by brewery type such as micro, brewpub, large, closed',
    exposure: 'primary',
    group: 'filters',
    reason: 'Brewery type is a documented high-signal filter for market segmentation.',
  },
  {
    name: 'postal',
    flag: '--postal <code>',
    description: 'Filter by postal code prefix or exact code',
    exposure: 'advanced',
    group: 'filters',
    reason: 'Postal filtering is documented but more specialized than city/state/type.',
  },
] satisfies PublicApiOperationDefinition<OpenBreweryDbListInput>['options']

const paginationOptions = [
  {
    name: 'perPage',
    flag: '--per-page <count>',
    description: `Results per page, default/cap ${OPEN_BREWERY_DB_DEFAULT_PER_PAGE}`,
    exposure: 'primary',
    group: 'pagination',
    reason: 'Docs state the maximum per_page is 200; defaulting to 200 uses one free request efficiently.',
    valueType: 'integer',
    defaultValue: String(OPEN_BREWERY_DB_DEFAULT_PER_PAGE),
  },
  {
    name: 'page',
    flag: '--page <number>',
    description: `Page number, default ${OPEN_BREWERY_DB_DEFAULT_PAGE}`,
    exposure: 'advanced',
    group: 'pagination',
    reason: 'Page is documented for browsing beyond the default page while keeping cache keys deterministic.',
    valueType: 'integer',
    defaultValue: String(OPEN_BREWERY_DB_DEFAULT_PAGE),
  },
] satisfies PublicApiOperationDefinition<OpenBreweryDbListInput>['options']

const breweriesOperation: PublicApiOperationDefinition<OpenBreweryDbListInput> = {
  id: 'openbrewerydb.breweries',
  providerId: 'openbrewerydb',
  name: 'Breweries',
  commandPath: ['openbrewerydb', 'breweries'],
  rpcMethod: 'openbrewerydb.breweries',
  description: 'List Open Brewery DB breweries with curated location/type filters.',
  category: 'food-drink',
  options: [
    ...filterOptions,
    ...paginationOptions,
    {
      name: 'sort',
      flag: '--sort <field>',
      description: 'Sort field such as name:asc or type:desc',
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Sort is documented but optional for the default discovery workflow.',
    },
  ],
  paramsSchema: listParamsSchema,
  execute: params => listOpenBreweryDbBreweries(params),
  normalizeParams: params => listParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenBreweryDbListInput(params),
  resultKind: 'openbrewerydb.breweries',
  defaultFormat: 'text',
}

const searchOperation: PublicApiOperationDefinition<OpenBreweryDbSearchInput> = {
  id: 'openbrewerydb.search',
  providerId: 'openbrewerydb',
  name: 'Search Breweries',
  commandPath: ['openbrewerydb', 'search'],
  rpcMethod: 'openbrewerydb.search',
  description: 'Search Open Brewery DB breweries by name or text query.',
  category: 'food-drink',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search query, default ${OPEN_BREWERY_DB_DEFAULT_SEARCH_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented search endpoint is the primary full-text discovery workflow.',
      defaultValue: OPEN_BREWERY_DB_DEFAULT_SEARCH_QUERY,
    },
    ...paginationOptions,
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchOpenBreweryDbBreweries(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenBreweryDbSearchInput(params),
  resultKind: 'openbrewerydb.search',
  defaultFormat: 'text',
}

const metaOperation: PublicApiOperationDefinition<OpenBreweryDbMetaInput> = {
  id: 'openbrewerydb.meta',
  providerId: 'openbrewerydb',
  name: 'Brewery Metadata',
  commandPath: ['openbrewerydb', 'meta'],
  rpcMethod: 'openbrewerydb.meta',
  description: 'Read Open Brewery DB aggregate counts for the same curated filters.',
  category: 'food-drink',
  options: filterOptions,
  paramsSchema: metaParamsSchema,
  execute: params => getOpenBreweryDbMeta(params),
  normalizeParams: params => metaParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenBreweryDbMetaInput(params),
  resultKind: 'openbrewerydb.meta',
  defaultFormat: 'text',
}

export const openBreweryDbProvider: PublicApiProviderModule = {
  manifest: {
    id: 'openbrewerydb',
    name: 'Open Brewery DB',
    description: 'No-auth HTTPS JSON API for breweries, cideries, and bottle shops.',
    publicApisCategory: 'Food & Drink',
    homepageUrl: 'https://www.openbrewerydb.org',
    docsUrl: 'https://www.openbrewerydb.org/documentation',
    auth: {
      mode: 'none',
      notes: ['Documented v1 endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['food-drink', 'breweries', 'locations', 'market-research', 'no-auth', 'json'],
    freePlanNotes: [
      'Live responses expose 120 requests/minute rate-limit headers.',
      `Docs state per_page can be set from 1 to ${OPEN_BREWERY_DB_MAX_PER_PAGE}; CLI defaults to the maximum to conserve requests.`,
      'Implementation focuses on list/search/meta read workflows that support local discovery and market analysis.',
    ],
  },
  operations: [breweriesOperation, searchOperation, metaOperation],
  endpoints: [
    {
      id: 'openbrewerydb-breweries',
      method: 'GET',
      urlPattern: 'https://api.openbrewerydb.org/v1/breweries*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Open Brewery DB breweries collection endpoint with documented filters and pagination.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.openbrewerydb.org/documentation', 'https://api.openbrewerydb.org/v1/breweries?per_page=2'],
      consumedBy: ['openbrewerydb breweries'],
      notes: ['No authentication required.', 'Docs state per_page maximum is 200.'],
    },
    {
      id: 'openbrewerydb-search',
      method: 'GET',
      urlPattern: 'https://api.openbrewerydb.org/v1/breweries/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Open Brewery DB full-text brewery search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.openbrewerydb.org/documentation', 'https://api.openbrewerydb.org/v1/breweries/search?query=dogfish&per_page=2'],
      consumedBy: ['openbrewerydb search'],
      notes: ['No authentication required.', 'Supports query, page, and per_page.'],
    },
    {
      id: 'openbrewerydb-meta',
      method: 'GET',
      urlPattern: 'https://api.openbrewerydb.org/v1/breweries/meta*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Open Brewery DB aggregate metadata endpoint for brewery counts by state/type.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.openbrewerydb.org/documentation', 'https://api.openbrewerydb.org/v1/breweries/meta?by_city=san_diego'],
      consumedBy: ['openbrewerydb meta'],
      notes: ['No authentication required.', 'Useful for counts without fetching full pages.'],
    },
  ],
}
