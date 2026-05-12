import { z } from 'zod'
import { searchTheNews } from '../../application/usecases/theNews.js'
import {
  THENEWS_DEFAULT_LANGUAGE,
  THENEWS_DEFAULT_PAGE,
  THENEWS_DEFAULT_SEARCH,
  THENEWS_ENV_API_KEY,
  THENEWS_MAX_LIMIT,
  normalizeTheNewsAllInput,
  type TheNewsAllInput,
} from '../../infrastructure/openApis/theNewsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const allParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  locale: z.string().min(1).optional(),
  categories: z.string().min(1).optional(),
  domains: z.string().min(1).optional(),
  publishedAfter: z.string().min(1).optional(),
  publishedBefore: z.string().min(1).optional(),
  publishedOn: z.string().min(1).optional(),
  sort: z.enum(['published_at', 'published_on', 'relevance_score']).optional(),
  limit: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<TheNewsAllInput>

const allOperation: PublicApiOperationDefinition<TheNewsAllInput> = {
  id: 'thenews.all',
  providerId: 'thenews',
  name: 'All News Search',
  commandPath: ['thenews', 'all'],
  rpcMethod: 'thenews.all',
  description: 'Search TheNewsAPI all-news endpoint through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `TheNewsAPI token; defaults to ${THENEWS_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'search', flag: '--search <text>', description: `Search query, default "${THENEWS_DEFAULT_SEARCH}"`, exposure: 'primary', group: 'query', reason: 'Primary all-news search intent.', defaultValue: THENEWS_DEFAULT_SEARCH },
    { name: 'language', flag: '--language <codes>', description: `Comma-separated languages, default ${THENEWS_DEFAULT_LANGUAGE}`, exposure: 'primary', group: 'filters', reason: 'Language materially affects readable terminal results.', defaultValue: THENEWS_DEFAULT_LANGUAGE },
    { name: 'locale', flag: '--locale <codes>', description: 'Comma-separated source country/locale codes such as us,ca', exposure: 'primary', group: 'filters', reason: 'Locale is a high-value market/geography filter.' },
    { name: 'categories', flag: '--categories <names>', description: 'Comma-separated categories such as business,tech', exposure: 'primary', group: 'filters', reason: 'Category is a high-value topical filter.' },
    { name: 'domains', flag: '--domains <names>', description: 'Comma-separated domains to include', exposure: 'advanced', group: 'filters', reason: 'Domain filtering is useful but requires source knowledge.' },
    { name: 'publishedAfter', flag: '--published-after <date>', description: 'Only articles published after this date/datetime', exposure: 'advanced', group: 'filters', reason: 'Date windows are useful for bounded searches.' },
    { name: 'publishedBefore', flag: '--published-before <date>', description: 'Only articles published before this date/datetime', exposure: 'advanced', group: 'filters', reason: 'Pairs with --published-after for bounded searches.' },
    { name: 'publishedOn', flag: '--published-on <YYYY-MM-DD>', description: 'Only articles published on this date', exposure: 'advanced', group: 'filters', reason: 'Useful for exact-day replay and offline cache keys.' },
    { name: 'sort', flag: '--sort <published_at|published_on|relevance_score>', description: 'Sort order; relevance_score requires a search query', exposure: 'advanced', group: 'presentation', reason: 'Sorting changes result order but is secondary to query/filter UX.' },
    { name: 'limit', flag: '--limit <count>', description: `Requested article count, provider defaults to plan maximum; CLI cap ${THENEWS_MAX_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Docs state the default is the current plan maximum; explicit values are capped for terminal safety.', valueType: 'integer' },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${THENEWS_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Needed to continue result pages without a separate pager UI.', valueType: 'integer', defaultValue: String(THENEWS_DEFAULT_PAGE) },
  ],
  paramsSchema: allParamsSchema,
  execute: params => searchTheNews(params),
  normalizeParams: params => allParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeTheNewsAllInput(params),
  resultKind: 'thenews.all',
  defaultFormat: 'text',
}

export const theNewsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'thenews',
    name: 'TheNewsAPI',
    description: 'Keyed TheNewsAPI all-news search provider with plan-aware pagination.',
    publicApisCategory: 'News',
    homepageUrl: 'https://www.thenewsapi.com/',
    docsUrl: 'https://www.thenewsapi.com/documentation',
    auth: {
      mode: 'api-key',
      envVars: [THENEWS_ENV_API_KEY],
      notes: ['Uses api_token query authentication; store secrets only in environment or local provider config.'],
    },
    tags: ['news', 'headlines', 'media', 'keyed'],
    freePlanNotes: ['Docs say limit maximum is plan-based and default limit is the current plan maximum; headlines endpoint may be subscription-gated.'],
  },
  operations: [allOperation],
  endpoints: [
    {
      id: 'thenews-all-news',
      method: 'GET',
      urlPattern: 'https://api.thenewsapi.com/v1/news/all',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.thenewsapi.com/documentation'],
      consumedBy: ['thenews.all'],
      description: 'TheNewsAPI all-news search endpoint with api_token query authentication.',
      notes: ['Requires API token; provider plan may lower requested limit.'],
    },
  ],
}
