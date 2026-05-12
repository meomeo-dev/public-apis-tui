import { z } from 'zod'
import { listNewsApiEverything, listNewsApiHeadlines } from '../../application/usecases/newsApi.js'
import {
  NEWSAPI_DEFAULT_COUNTRY,
  NEWSAPI_DEFAULT_PAGE,
  NEWSAPI_DEFAULT_PAGE_SIZE,
  NEWSAPI_DEFAULT_QUERY,
  NEWSAPI_ENV_API_KEY,
  normalizeNewsApiEverythingInput,
  normalizeNewsApiHeadlinesInput,
  type NewsApiEverythingInput,
  type NewsApiHeadlinesInput,
} from '../../infrastructure/openApis/newsApiClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const headlinesParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  sources: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  pageSize: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<NewsApiHeadlinesInput>

const everythingParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  searchIn: z.string().min(1).optional(),
  sources: z.string().min(1).optional(),
  domains: z.string().min(1).optional(),
  excludeDomains: z.string().min(1).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  sortBy: z.enum(['relevancy', 'popularity', 'publishedAt']).optional(),
  pageSize: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<NewsApiEverythingInput>

const headlinesOperation: PublicApiOperationDefinition<NewsApiHeadlinesInput> = {
  id: 'newsapi.headlines',
  providerId: 'newsapi',
  name: 'Top Headlines',
  commandPath: ['newsapi', 'headlines'],
  rpcMethod: 'newsapi.headlines',
  description: 'Fetch NewsAPI top headlines through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `NewsAPI key; defaults to ${NEWSAPI_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'country', flag: '--country <code>', description: `Two-letter country code, default ${NEWSAPI_DEFAULT_COUNTRY}`, exposure: 'primary', group: 'filters', reason: 'Country is the main top-headlines localization dimension.', defaultValue: NEWSAPI_DEFAULT_COUNTRY },
    { name: 'category', flag: '--category <name>', description: 'Headline category such as business or technology', exposure: 'primary', group: 'filters', reason: 'Category is a high-value curated headline filter.' },
    { name: 'query', flag: '--query <text>', description: 'Keyword filter for top headlines', exposure: 'primary', group: 'query', reason: 'Allows targeted headline browsing without switching operation.' },
    { name: 'sources', flag: '--sources <csv>', description: 'Comma-separated NewsAPI source ids', exposure: 'advanced', group: 'filters', reason: 'Source IDs require separate discovery and conflict with country/category in NewsAPI rules.' },
    { name: 'pageSize', flag: '--page-size <count>', description: `Articles per page, default/cap ${NEWSAPI_DEFAULT_PAGE_SIZE}`, exposure: 'primary', group: 'pagination', reason: 'Docs list pageSize max 100; defaulting to max conserves requests.', valueType: 'integer', defaultValue: String(NEWSAPI_DEFAULT_PAGE_SIZE) },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${NEWSAPI_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Needed to continue paginated headline results.', valueType: 'integer', defaultValue: String(NEWSAPI_DEFAULT_PAGE) },
  ],
  paramsSchema: headlinesParamsSchema,
  execute: params => listNewsApiHeadlines(params),
  normalizeParams: params => headlinesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNewsApiHeadlinesInput(params),
  resultKind: 'newsapi.headlines',
  defaultFormat: 'text',
}

const everythingOperation: PublicApiOperationDefinition<NewsApiEverythingInput> = {
  id: 'newsapi.everything',
  providerId: 'newsapi',
  name: 'Everything',
  commandPath: ['newsapi', 'everything'],
  rpcMethod: 'newsapi.everything',
  description: 'Search NewsAPI everything endpoint through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `NewsAPI key; defaults to ${NEWSAPI_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'query', flag: '--query <text>', description: `Search query, default "${NEWSAPI_DEFAULT_QUERY}"`, exposure: 'primary', group: 'query', reason: 'Primary everything-search intent.', defaultValue: NEWSAPI_DEFAULT_QUERY },
    { name: 'language', flag: '--language <code>', description: 'Two-letter language code', exposure: 'primary', group: 'filters', reason: 'Language materially affects readable terminal results.' },
    { name: 'searchIn', flag: '--search-in <fields>', description: 'Comma-separated fields: title, description, content', exposure: 'advanced', group: 'filters', reason: 'Useful for precision searches without exposing arbitrary raw params.' },
    { name: 'sources', flag: '--sources <csv>', description: 'Comma-separated source ids', exposure: 'advanced', group: 'filters', reason: 'Source IDs require separate discovery.' },
    { name: 'domains', flag: '--domains <csv>', description: 'Comma-separated domains to include', exposure: 'advanced', group: 'filters', reason: 'Domain filters are useful but secondary to query/language.' },
    { name: 'excludeDomains', flag: '--exclude-domains <csv>', description: 'Comma-separated domains to exclude', exposure: 'advanced', group: 'filters', reason: 'Exclusion filters are power-user controls.' },
    { name: 'from', flag: '--from <datetime>', description: 'Start date/datetime filter', exposure: 'advanced', group: 'filters', reason: 'Date range is useful but secondary to query UX.' },
    { name: 'to', flag: '--to <datetime>', description: 'End date/datetime filter', exposure: 'advanced', group: 'filters', reason: 'Pairs with --from for bounded searches.' },
    { name: 'sortBy', flag: '--sort-by <relevancy|popularity|publishedAt>', description: 'Sort order', exposure: 'advanced', group: 'presentation', reason: 'Sorting affects result order but is secondary to search UX.', defaultValue: 'publishedAt' },
    { name: 'pageSize', flag: '--page-size <count>', description: `Articles per page, default/cap ${NEWSAPI_DEFAULT_PAGE_SIZE}`, exposure: 'primary', group: 'pagination', reason: 'Docs list pageSize max 100; defaulting to max conserves requests.', valueType: 'integer', defaultValue: String(NEWSAPI_DEFAULT_PAGE_SIZE) },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${NEWSAPI_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Needed to continue paginated search results.', valueType: 'integer', defaultValue: String(NEWSAPI_DEFAULT_PAGE) },
  ],
  paramsSchema: everythingParamsSchema,
  execute: params => listNewsApiEverything(params),
  normalizeParams: params => everythingParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNewsApiEverythingInput(params),
  resultKind: 'newsapi.everything',
  defaultFormat: 'text',
}

export const newsApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'newsapi',
    name: 'NewsAPI',
    description: 'Keyed NewsAPI.org headlines and everything search API.',
    publicApisCategory: 'News',
    homepageUrl: 'https://newsapi.org/',
    docsUrl: 'https://newsapi.org/docs',
    auth: { mode: 'api-key', envVars: [NEWSAPI_ENV_API_KEY], notes: ['Uses apiKey query authentication; store secrets only in environment or local provider config.'] },
    tags: ['news', 'headlines', 'media', 'keyed'],
    freePlanNotes: ['Docs list pageSize max 100; development keys may have plan/origin restrictions.'],
  },
  operations: [headlinesOperation, everythingOperation],
  endpoints: [
    { id: 'newsapi-top-headlines', method: 'GET', urlPattern: 'https://newsapi.org/v2/top-headlines', category: 'public-api:news', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://newsapi.org/docs/endpoints/top-headlines'], consumedBy: ['newsapi.headlines'], description: 'NewsAPI top headlines endpoint with apiKey query authentication.', notes: ['Requires API key; cache keys must omit apiKey.'] },
    { id: 'newsapi-everything', method: 'GET', urlPattern: 'https://newsapi.org/v2/everything', category: 'public-api:news', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://newsapi.org/docs/endpoints/everything'], consumedBy: ['newsapi.everything'], description: 'NewsAPI everything search endpoint with apiKey query authentication.', notes: ['Requires API key; cache keys must omit apiKey.'] },
  ],
}
