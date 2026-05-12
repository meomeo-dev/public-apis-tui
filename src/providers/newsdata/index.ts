import { z } from 'zod'
import { listNewsDataLatest } from '../../application/usecases/newsData.js'
import {
  NEWSDATA_DEFAULT_LANGUAGE,
  NEWSDATA_DEFAULT_SIZE,
  NEWSDATA_ENV_API_KEY,
  NEWSDATA_FREE_MAX_SIZE,
  normalizeNewsDataLatestInput,
  type NewsDataLatestInput,
} from '../../infrastructure/openApis/newsDataClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const latestParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  searchIn: z.enum(['all', 'title', 'meta']).optional(),
  language: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  sort: z.enum(['pubdateasc', 'relevancy', 'source', 'fetched_at']).optional(),
  dedupe: z.boolean().optional(),
  size: z.coerce.number().optional(),
  page: z.string().min(1).optional(),
}) satisfies z.ZodType<NewsDataLatestInput>

const latestOperation: PublicApiOperationDefinition<NewsDataLatestInput> = {
  id: 'newsdata.latest',
  providerId: 'newsdata',
  name: 'Latest News',
  commandPath: ['newsdata', 'latest'],
  rpcMethod: 'newsdata.latest',
  description: 'Fetch NewsData.io latest global news through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `NewsData.io key; defaults to ${NEWSDATA_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'query', flag: '--query <text>', description: 'Keyword search query; omit for latest headlines', exposure: 'primary', group: 'query', reason: 'Primary search intent without exposing q/qInTitle/qInMeta as separate flags.' },
    { name: 'searchIn', flag: '--search-in <all|title|meta>', description: 'Search query scope, default all', exposure: 'advanced', group: 'query', reason: 'Curated wrapper for the mutually exclusive q, qInTitle, and qInMeta upstream params.', defaultValue: 'all' },
    { name: 'language', flag: '--language <codes>', description: `Comma-separated languages, default ${NEWSDATA_DEFAULT_LANGUAGE}`, exposure: 'primary', group: 'filters', reason: 'Language materially affects terminal readability and result relevance.', defaultValue: NEWSDATA_DEFAULT_LANGUAGE },
    { name: 'country', flag: '--country <codes>', description: 'Comma-separated publisher country codes, up to 5 on free/basic plans', exposure: 'primary', group: 'filters', reason: 'Country is a high-value localization filter for news browsing.' },
    { name: 'category', flag: '--category <names>', description: 'Comma-separated categories, up to 5 on free/basic plans', exposure: 'primary', group: 'filters', reason: 'Category is a high-value topical filter for news browsing.' },
    { name: 'domain', flag: '--domain <names>', description: 'Comma-separated source domains such as bbc or nytimes', exposure: 'advanced', group: 'filters', reason: 'Domain filtering is useful but requires users to know NewsData source ids.' },
    { name: 'sort', flag: '--sort <pubdateasc|relevancy|source|fetched_at>', description: 'Sort order; provider defaults to newest publish date', exposure: 'advanced', group: 'presentation', reason: 'Sort changes result ordering but is secondary to query/filter UX.' },
    { name: 'dedupe', flag: '--dedupe', description: 'Ask NewsData.io to remove duplicate articles', exposure: 'advanced', group: 'filters', reason: 'Useful for cleaner feeds while preserving upstream default unless requested.', valueType: 'boolean' },
    { name: 'size', flag: '--size <count>', description: `Articles per request, default/free cap ${NEWSDATA_DEFAULT_SIZE}`, exposure: 'primary', group: 'pagination', reason: 'Docs cap free users at 10 results; defaulting to the free max conserves credits.', valueType: 'integer', defaultValue: String(NEWSDATA_DEFAULT_SIZE) },
    { name: 'page', flag: '--page <nextPage>', description: 'Opaque nextPage token returned by NewsData.io', exposure: 'advanced', group: 'pagination', reason: 'Needed to continue paginated results without exposing raw URLs.' },
  ],
  paramsSchema: latestParamsSchema,
  execute: params => listNewsDataLatest(params),
  normalizeParams: params => latestParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNewsDataLatestInput(params),
  resultKind: 'newsdata.latest',
  defaultFormat: 'text',
}

export const newsDataProvider: PublicApiProviderModule = {
  manifest: {
    id: 'newsdata',
    name: 'NewsData.io',
    description: 'Keyed NewsData.io latest-news API with global news, filtering, and pagination.',
    publicApisCategory: 'News',
    homepageUrl: 'https://newsdata.io/',
    docsUrl: 'https://newsdata.io/documentation#latest-news',
    auth: {
      mode: 'api-key',
      envVars: [NEWSDATA_ENV_API_KEY],
      notes: ['Uses apikey query authentication; store secrets only in environment or local provider config.'],
    },
    tags: ['news', 'headlines', 'media', 'keyed'],
    freePlanNotes: [`Free plan size maximum is ${NEWSDATA_FREE_MAX_SIZE}; docs describe 30 credits per 15 minutes and 200 credits per day.`],
  },
  operations: [latestOperation],
  endpoints: [
    {
      id: 'newsdata-latest',
      method: 'GET',
      urlPattern: 'https://newsdata.io/api/1/latest',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://newsdata.io/documentation#latest-news', 'https://newsdata.io/blog/latest-news-endpoint/'],
      consumedBy: ['newsdata.latest'],
      description: 'NewsData.io latest endpoint with apikey query authentication.',
      notes: ['Requires API key; cache keys, logs, tests, plan, and catalog must omit the secret value.'],
    },
  ],
}
