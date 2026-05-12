import { z } from 'zod'
import { listSpaceflightNewsArticles } from '../../application/usecases/spaceflightNews.js'
import {
  SPACEFLIGHT_NEWS_DEFAULT_LIMIT,
  SPACEFLIGHT_NEWS_DEFAULT_OFFSET,
  SPACEFLIGHT_NEWS_DEFAULT_ORDERING,
  normalizeSpaceflightNewsArticlesInput,
  type SpaceflightNewsArticlesInput,
} from '../../infrastructure/openApis/spaceflightNewsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const articlesParamsSchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  search: z.string().min(1).optional(),
  newsSite: z.string().min(1).optional(),
  ordering: z.string().min(1).optional(),
}) satisfies z.ZodType<SpaceflightNewsArticlesInput>

const articlesOperation: PublicApiOperationDefinition<SpaceflightNewsArticlesInput> = {
  id: 'spaceflightnews.articles',
  providerId: 'spaceflightnews',
  name: 'Articles',
  commandPath: ['spaceflightnews', 'articles'],
  rpcMethod: 'spaceflightnews.articles',
  description: 'List recent Spaceflight News API articles.',
  category: 'news',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `Results to return, default/cap ${SPACEFLIGHT_NEWS_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Live probes show the upstream caps list responses at 500; defaulting to that cap maximizes one request.', valueType: 'integer', defaultValue: String(SPACEFLIGHT_NEWS_DEFAULT_LIMIT) },
    { name: 'offset', flag: '--offset <count>', description: `Result offset, default ${SPACEFLIGHT_NEWS_DEFAULT_OFFSET}`, exposure: 'primary', group: 'pagination', reason: 'Offset is the documented pagination control and supports quota-conscious paging with cached results.', valueType: 'integer', defaultValue: String(SPACEFLIGHT_NEWS_DEFAULT_OFFSET) },
    { name: 'search', flag: '--search <text>', description: 'Search article text/title', exposure: 'primary', group: 'query', reason: 'Search is a high-value discovery control over the current articles endpoint.' },
    { name: 'newsSite', flag: '--news-site <name>', description: 'Filter by news site name', exposure: 'advanced', group: 'filters', reason: 'news_site is documented; it is useful after users discover sites, but secondary to search/latest.' },
    { name: 'ordering', flag: '--ordering <-published_at|published_at|-updated_at|updated_at>', description: `Ordering, default ${SPACEFLIGHT_NEWS_DEFAULT_ORDERING}`, exposure: 'advanced', group: 'presentation', reason: 'Ordering is documented and useful for recency/debug workflows without exposing the full raw parameter surface.', defaultValue: SPACEFLIGHT_NEWS_DEFAULT_ORDERING },
  ],
  paramsSchema: articlesParamsSchema,
  execute: params => listSpaceflightNewsArticles(params),
  normalizeParams: params => articlesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeSpaceflightNewsArticlesInput(params),
  resultKind: 'spaceflightnews.articles',
  defaultFormat: 'text',
}

export const spaceflightNewsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'spaceflightnews',
    name: 'Spaceflight News',
    description: 'No-auth Spaceflight News API articles from The Space Devs.',
    publicApisCategory: 'News',
    homepageUrl: 'https://spaceflightnewsapi.net/',
    docsUrl: 'https://api.spaceflightnewsapi.net/v4/docs',
    auth: { mode: 'none', notes: ['The v4 OpenAPI schema marks article list security as anonymous; no API key, OAuth, cookies, browser session, or account setup required.'] },
    tags: ['news', 'spaceflight', 'aerospace', 'articles'],
    freePlanNotes: ['The API may return HTTP 429 when called too frequently; cache online results and replay offline.'],
  },
  operations: [articlesOperation],
  endpoints: [
    {
      id: 'spaceflightnews-v4-articles',
      method: 'GET',
      urlPattern: 'https://api.spaceflightnewsapi.net/v4/articles/',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://api.spaceflightnewsapi.net/v4/schema/', 'https://api.spaceflightnewsapi.net/v4/articles/?limit=1&offset=0'],
      consumedBy: ['spaceflightnews.articles'],
      description: 'Spaceflight News API v4 article list endpoint.',
      notes: ['No auth required; limit/offset pagination. Live probes observed limit=1000 being capped to 500 results.'],
    },
  ],
}
