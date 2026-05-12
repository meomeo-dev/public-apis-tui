import { z } from 'zod'
import { listOpenGovernmentUsKeywords, listOpenGovernmentUsOrganizations, searchOpenGovernmentUsDatasets } from '../../application/usecases/openGovernmentUs.js'
import {
  OPEN_GOVERNMENT_US_DEFAULT_QUERY,
  OPEN_GOVERNMENT_US_KEYWORDS_DEFAULT_LIMIT,
  OPEN_GOVERNMENT_US_ORGANIZATIONS_DEFAULT_LIMIT,
  OPEN_GOVERNMENT_US_SEARCH_DEFAULT_LIMIT,
  OPEN_GOVERNMENT_US_SEARCH_MAX_LIMIT,
  normalizeOpenGovernmentUsKeywordsInput,
  normalizeOpenGovernmentUsOrganizationsInput,
  normalizeOpenGovernmentUsSearchInput,
  type OpenGovernmentUsKeywordsInput,
  type OpenGovernmentUsOrganizationsInput,
  type OpenGovernmentUsSearchInput,
} from '../../infrastructure/openApis/openGovernmentUsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
  orgSlug: z.string().optional(),
  after: z.string().optional(),
}) satisfies z.ZodType<OpenGovernmentUsSearchInput>

const organizationsParamsSchema = z.object({
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentUsOrganizationsInput>

const keywordsParamsSchema = z.object({
  size: z.coerce.number().optional(),
  minCount: z.coerce.number().optional(),
}) satisfies z.ZodType<OpenGovernmentUsKeywordsInput>

const searchOperation: PublicApiOperationDefinition<OpenGovernmentUsSearchInput> = {
  id: 'opengovernmentusa.search',
  providerId: 'opengovernmentusa',
  name: 'Dataset Search',
  commandPath: ['opengovernmentusa', 'search'],
  rpcMethod: 'opengovernmentusa.search',
  description: 'Search data.gov datasets through the public catalog API.',
  category: 'government',
  options: [
    { name: 'query', flag: '--query <text>', description: `Search text, default ${OPEN_GOVERNMENT_US_DEFAULT_QUERY}`, exposure: 'primary', group: 'query', reason: 'Primary terminal entrypoint for discovering datasets.', defaultValue: OPEN_GOVERNMENT_US_DEFAULT_QUERY },
    { name: 'limit', flag: '--limit <count>', description: `Results to request, default/cap ${OPEN_GOVERNMENT_US_SEARCH_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: `Catalog search caps at ${OPEN_GOVERNMENT_US_SEARCH_MAX_LIMIT} and uses cursor pagination.`, valueType: 'integer', defaultValue: String(OPEN_GOVERNMENT_US_SEARCH_DEFAULT_LIMIT) },
    { name: 'orgSlug', flag: '--org-slug <slug>', description: 'Filter by organization slug, e.g. census', exposure: 'advanced', group: 'filters', reason: 'Organizations are often the fastest way to narrow large catalog searches.' },
    { name: 'after', flag: '--after <cursor>', description: 'Cursor token for next page', exposure: 'advanced', group: 'pagination', reason: 'The catalog API uses cursor pagination for stable large result sets.' },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchOpenGovernmentUsDatasets(params),
  normalizeParams: params => searchParamsSchema.parse(toOpenGovernmentUsSearchParams(params)),
  createCacheKeyParams: params => normalizeOpenGovernmentUsSearchInput(params),
  resultKind: 'opengovernmentusa.search',
  defaultFormat: 'text',
}

const organizationsOperation: PublicApiOperationDefinition<OpenGovernmentUsOrganizationsInput> = {
  id: 'opengovernmentusa.organizations',
  providerId: 'opengovernmentusa',
  name: 'Organizations',
  commandPath: ['opengovernmentusa', 'organizations'],
  rpcMethod: 'opengovernmentusa.organizations',
  description: 'List catalog publishing organizations.',
  category: 'government',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `Organizations to request, default/cap ${OPEN_GOVERNMENT_US_ORGANIZATIONS_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The API returns all organizations and the CLI keeps the result bounded for terminal use.', valueType: 'integer', defaultValue: String(OPEN_GOVERNMENT_US_ORGANIZATIONS_DEFAULT_LIMIT) },
  ],
  paramsSchema: organizationsParamsSchema,
  execute: params => listOpenGovernmentUsOrganizations(params),
  normalizeParams: params => organizationsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenGovernmentUsOrganizationsInput(params),
  resultKind: 'opengovernmentusa.organizations',
  defaultFormat: 'text',
}

const keywordsOperation: PublicApiOperationDefinition<OpenGovernmentUsKeywordsInput> = {
  id: 'opengovernmentusa.keywords',
  providerId: 'opengovernmentusa',
  name: 'Keywords',
  commandPath: ['opengovernmentusa', 'keywords'],
  rpcMethod: 'opengovernmentusa.keywords',
  description: 'List catalog keywords.',
  category: 'government',
  options: [
    { name: 'size', flag: '--size <count>', description: `Keywords to request, default/cap ${OPEN_GOVERNMENT_US_KEYWORDS_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Keywords help humans explore common catalog themes, and the API caps at 1000.', valueType: 'integer', defaultValue: String(OPEN_GOVERNMENT_US_KEYWORDS_DEFAULT_LIMIT) },
    { name: 'minCount', flag: '--min-count <count>', description: 'Minimum dataset count for each keyword', exposure: 'advanced', group: 'filters', reason: 'Keeps the output focused on the most common keywords for terminal browsing.', valueType: 'integer', defaultValue: '1' },
  ],
  paramsSchema: keywordsParamsSchema,
  execute: params => listOpenGovernmentUsKeywords(params),
  normalizeParams: params => keywordsParamsSchema.parse(toOpenGovernmentUsKeywordsParams(params)),
  createCacheKeyParams: params => normalizeOpenGovernmentUsKeywordsInput(params),
  resultKind: 'opengovernmentusa.keywords',
  defaultFormat: 'text',
}

export const openGovernmentUsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opengovernmentusa',
    name: 'Open Government USA',
    description: 'No-auth catalog.data.gov search, organizations, and keywords.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://catalog.data.gov/',
    docsUrl: 'https://resources.data.gov/catalog-api/',
    auth: { mode: 'none', notes: ['Data.gov catalog API documentation states no API key is required and all endpoints are publicly accessible.'] },
    tags: ['government', 'usa', 'data-gov', 'catalog', 'datasets', 'organizations', 'keywords', 'no-auth', 'json'],
    freePlanNotes: [
      'Search uses cursor pagination and defaults/caps at 1000 rows.',
      'Organizations returns the published organization list for terminal exploration.',
      'Keywords returns the catalog keyword list for terminal exploration.',
    ],
  },
  operations: [searchOperation, organizationsOperation, keywordsOperation],
  endpoints: [
    { id: 'opengovernmentusa-search', method: 'GET', urlPattern: 'https://catalog.data.gov/search', category: 'public-apis:government', evidenceStatus: 'confirmed', description: 'data.gov search datasets endpoint.', observedOn: '2026-05-04', sampleSources: ['https://resources.data.gov/catalog-api/', 'https://catalog.data.gov/search?q=business&per_page=5'], consumedBy: ['public-apis apis run opengovernmentusa.search'], notes: ['No authentication required; cursor pagination via after.'] },
    { id: 'opengovernmentusa-organizations', method: 'GET', urlPattern: 'https://catalog.data.gov/api/organizations', category: 'public-apis:government', evidenceStatus: 'confirmed', description: 'data.gov organizations endpoint.', observedOn: '2026-05-04', sampleSources: ['https://resources.data.gov/catalog-api/', 'https://catalog.data.gov/api/organizations'], consumedBy: ['public-apis apis run opengovernmentusa.organizations'], notes: ['No authentication required.'] },
    { id: 'opengovernmentusa-keywords', method: 'GET', urlPattern: 'https://catalog.data.gov/api/keywords', category: 'public-apis:government', evidenceStatus: 'confirmed', description: 'data.gov keywords endpoint.', observedOn: '2026-05-04', sampleSources: ['https://resources.data.gov/catalog-api/', 'https://catalog.data.gov/api/keywords?size=5&min_count=100'], consumedBy: ['public-apis apis run opengovernmentusa.keywords'], notes: ['No authentication required.'] },
  ],
}

function toOpenGovernmentUsSearchParams(params: Record<string, unknown>): Record<string, unknown> {
  return {
    ...params,
    orgSlug: params.orgSlug ?? params['org-slug'],
  }
}

function toOpenGovernmentUsKeywordsParams(params: Record<string, unknown>): Record<string, unknown> {
  return {
    ...params,
    minCount: params.minCount ?? params['min-count'],
  }
}
