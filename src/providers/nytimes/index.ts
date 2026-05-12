import { z } from 'zod'
import { listNyTimesTopStories, searchNyTimes } from '../../application/usecases/nytimes.js'
import {
  NYTIMES_DEFAULT_PAGE,
  NYTIMES_DEFAULT_QUERY,
  NYTIMES_DEFAULT_TOP_LIMIT,
  NYTIMES_DEFAULT_TOP_SECTION,
  NYTIMES_ENV_API_KEY,
  normalizeNyTimesSearchInput,
  normalizeNyTimesTopStoriesInput,
  type NyTimesSearchInput,
  type NyTimesTopStoriesInput,
} from '../../infrastructure/openApis/nytimesClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  filterQuery: z.string().min(1).optional(),
  beginDate: z.string().min(8).optional(),
  endDate: z.string().min(8).optional(),
  sort: z.enum(['newest', 'oldest', 'relevance']).optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<NyTimesSearchInput>

const topStoriesParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<NyTimesTopStoriesInput>

const searchOperation: PublicApiOperationDefinition<NyTimesSearchInput> = {
  id: 'nytimes.search',
  providerId: 'nytimes',
  name: 'Article Search',
  commandPath: ['nytimes', 'search'],
  rpcMethod: 'nytimes.search',
  description: 'Search New York Times articles through the documented keyed Article Search API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `NYTimes API key; defaults to ${NYTIMES_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'query', flag: '--query <text>', description: `Search query, default "${NYTIMES_DEFAULT_QUERY}"`, exposure: 'primary', group: 'query', reason: 'Primary Article Search discovery intent.', defaultValue: NYTIMES_DEFAULT_QUERY },
    { name: 'filterQuery', flag: '--filter-query <lucene>', description: 'NYTimes fq filter query', exposure: 'advanced', group: 'filters', reason: 'Power-user Lucene-style filter; exposed as advanced only.' },
    { name: 'beginDate', flag: '--begin-date <YYYYMMDD>', description: 'Begin date filter', exposure: 'advanced', group: 'filters', reason: 'Date filters are useful but secondary to query.' },
    { name: 'endDate', flag: '--end-date <YYYYMMDD>', description: 'End date filter', exposure: 'advanced', group: 'filters', reason: 'Pairs with --begin-date for bounded searches.' },
    { name: 'sort', flag: '--sort <newest|oldest|relevance>', description: 'Sort order', exposure: 'advanced', group: 'presentation', reason: 'Sorting affects result order but is secondary to search UX.', defaultValue: 'newest' },
    { name: 'page', flag: '--page <number>', description: `Zero-based page number, default ${NYTIMES_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Article Search pages are zero-based and return 10 docs/page.', valueType: 'integer', defaultValue: String(NYTIMES_DEFAULT_PAGE) },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchNyTimes(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNyTimesSearchInput(params),
  resultKind: 'nytimes.search',
  defaultFormat: 'text',
}

const topStoriesOperation: PublicApiOperationDefinition<NyTimesTopStoriesInput> = {
  id: 'nytimes.topStories',
  providerId: 'nytimes',
  name: 'Top Stories',
  commandPath: ['nytimes', 'top-stories'],
  rpcMethod: 'nytimes.topStories',
  description: 'Fetch New York Times top stories through the documented keyed Top Stories API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `NYTimes API key; defaults to ${NYTIMES_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'section', flag: '--section <slug>', description: `Top Stories section, default ${NYTIMES_DEFAULT_TOP_SECTION}`, exposure: 'primary', group: 'filters', reason: 'Section is the main Top Stories browsing dimension.', defaultValue: NYTIMES_DEFAULT_TOP_SECTION },
    { name: 'limit', flag: '--limit <count>', description: `Local story limit, default/cap ${NYTIMES_DEFAULT_TOP_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Top Stories endpoint has no page-size parameter; local cap bounds terminal/cache output.', valueType: 'integer', defaultValue: String(NYTIMES_DEFAULT_TOP_LIMIT) },
  ],
  paramsSchema: topStoriesParamsSchema,
  execute: params => listNyTimesTopStories(params),
  normalizeParams: params => topStoriesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNyTimesTopStoriesInput(params),
  resultKind: 'nytimes.topStories',
  defaultFormat: 'text',
}

export const nyTimesProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nytimes',
    name: 'New York Times',
    description: 'Keyed New York Times Developer APIs for article search and top stories.',
    publicApisCategory: 'News',
    homepageUrl: 'https://developer.nytimes.com/',
    docsUrl: 'https://developer.nytimes.com/docs',
    auth: {
      mode: 'api-key',
      envVars: [NYTIMES_ENV_API_KEY],
      notes: ['Uses api-key query authentication; store secrets only in environment or local provider config.'],
    },
    tags: ['news', 'newspaper', 'articles', 'keyed'],
    freePlanNotes: ['Article Search returns 10 documents per page; Top Stories has no page-size parameter so CLI applies a local output cap.'],
  },
  operations: [searchOperation, topStoriesOperation],
  endpoints: [
    {
      id: 'nytimes-article-search',
      method: 'GET',
      urlPattern: 'https://api.nytimes.com/svc/search/v2/articlesearch.json',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://developer.nytimes.com/docs/articlesearch-product/1/overview', 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=public%20api&page=0'],
      consumedBy: ['nytimes.search'],
      description: 'NYTimes Article Search endpoint with api-key query authentication.',
      notes: ['Requires API key; cache keys must omit api-key.'],
    },
    {
      id: 'nytimes-top-stories',
      method: 'GET',
      urlPattern: 'https://api.nytimes.com/svc/topstories/v2/{section}.json',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://developer.nytimes.com/docs/top-stories-product/1/overview', 'https://api.nytimes.com/svc/topstories/v2/home.json'],
      consumedBy: ['nytimes.topStories'],
      description: 'NYTimes Top Stories endpoint with api-key query authentication.',
      notes: ['Requires API key; output limit is local projection.'],
    },
  ],
}
