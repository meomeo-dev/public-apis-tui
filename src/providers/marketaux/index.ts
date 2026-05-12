import { z } from 'zod'
import { listMarketAuxNews } from '../../application/usecases/marketaux.js'
import {
  MARKETAUX_DEFAULT_LIMIT,
  MARKETAUX_DEFAULT_PAGE,
  MARKETAUX_ENV_API_KEY,
  normalizeMarketAuxNewsInput,
  type MarketAuxNewsInput,
} from '../../infrastructure/openApis/marketauxClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const newsParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  symbols: z.string().min(1).optional(),
  countries: z.string().min(1).optional(),
  industries: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  sentimentMin: z.coerce.number().optional(),
  sentimentMax: z.coerce.number().optional(),
  publishedAfter: z.string().min(1).optional(),
  publishedBefore: z.string().min(1).optional(),
  limit: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<MarketAuxNewsInput>

const newsOperation: PublicApiOperationDefinition<MarketAuxNewsInput> = {
  id: 'marketaux.news',
  providerId: 'marketaux',
  name: 'Market News',
  commandPath: ['marketaux', 'news'],
  rpcMethod: 'marketaux.news',
  description: 'Fetch MarketAux live financial news and entity sentiment through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `MarketAux API token; defaults to ${MARKETAUX_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'search', flag: '--search <text>', description: 'Dynamic search across title, description, keywords, and main text', exposure: 'primary', group: 'query', reason: 'Primary discovery intent for financial news search.' },
    { name: 'symbols', flag: '--symbols <csv>', description: 'Entity symbols such as TSLA,AMZN,MSFT', exposure: 'primary', group: 'filters', reason: 'High-value financial/news analysis filter.' },
    { name: 'countries', flag: '--countries <csv>', description: 'Exchange/entity countries such as us,ca', exposure: 'primary', group: 'filters', reason: 'Country materially changes market coverage.' },
    { name: 'language', flag: '--language <code>', description: 'Two-letter article language code', exposure: 'primary', group: 'filters', reason: 'Language materially affects readable terminal results.' },
    { name: 'industries', flag: '--industries <csv>', description: 'Entity industries filter', exposure: 'advanced', group: 'filters', reason: 'Useful for sector analysis but depends on MarketAux metadata vocabulary.' },
    { name: 'sentimentMin', flag: '--sentiment-min <score>', description: 'Minimum entity sentiment score from -1 to 1', exposure: 'advanced', group: 'filters', reason: 'Financial analysis control for positive/neutral filtering.' },
    { name: 'sentimentMax', flag: '--sentiment-max <score>', description: 'Maximum entity sentiment score from -1 to 1', exposure: 'advanced', group: 'filters', reason: 'Financial analysis control for negative/neutral filtering.' },
    { name: 'publishedAfter', flag: '--published-after <date>', description: 'Published-after date/datetime filter', exposure: 'advanced', group: 'filters', reason: 'Date windows are useful but secondary to search/symbol workflows.' },
    { name: 'publishedBefore', flag: '--published-before <date>', description: 'Published-before date/datetime filter', exposure: 'advanced', group: 'filters', reason: 'Pairs with --published-after for bounded historical queries.' },
    { name: 'limit', flag: '--limit <count>', description: `Requested articles per page, default/cap ${MARKETAUX_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Docs say default limit is plan maximum; CLI requests the documented cap while surfacing plan-lowered meta.limit.', valueType: 'integer', defaultValue: String(MARKETAUX_DEFAULT_LIMIT) },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${MARKETAUX_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Needed to continue result pages within the documented 20,000-result window.', valueType: 'integer', defaultValue: String(MARKETAUX_DEFAULT_PAGE) },
  ],
  paramsSchema: newsParamsSchema,
  execute: params => listMarketAuxNews(params),
  normalizeParams: params => newsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeMarketAuxNewsInput(params),
  resultKind: 'marketaux.news',
  defaultFormat: 'text',
}

export const marketAuxProvider: PublicApiProviderModule = {
  manifest: {
    id: 'marketaux',
    name: 'MarketAux',
    description: 'Keyed financial news API with entity symbols, sentiment, industries, and global market filters.',
    publicApisCategory: 'News',
    homepageUrl: 'https://www.marketaux.com/',
    docsUrl: 'https://www.marketaux.com/documentation',
    auth: {
      mode: 'api-key',
      envVars: [MARKETAUX_ENV_API_KEY],
      notes: ['Uses api_token query authentication; store secrets only in environment or local provider config.'],
    },
    tags: ['news', 'finance', 'markets', 'sentiment', 'keyed'],
    freePlanNotes: ['Docs state limit depends on plan; live free key may return meta.limit below the requested limit.'],
  },
  operations: [newsOperation],
  endpoints: [
    {
      id: 'marketaux-news-all',
      method: 'GET',
      urlPattern: 'https://api.marketaux.com/v1/news/all',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.marketaux.com/documentation', 'https://api.marketaux.com/v1/news/all?limit=1&language=en'],
      consumedBy: ['marketaux.news'],
      description: 'MarketAux latest financial news endpoint with api_token query authentication.',
      notes: ['Requires API token; cache keys must omit api_token.'],
    },
  ],
}
