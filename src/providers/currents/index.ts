import { z } from 'zod'
import { listCurrentsNews } from '../../application/usecases/currentsNews.js'
import {
  CURRENTS_DEFAULT_LANGUAGE,
  CURRENTS_DEFAULT_PAGE,
  CURRENTS_DEFAULT_PAGE_SIZE,
  CURRENTS_ENV_API_KEY,
  normalizeCurrentsNewsInput,
  type CurrentsNewsInput,
} from '../../infrastructure/openApis/currentsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const newsParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  keywords: z.string().min(1).optional(),
  pageSize: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
}) satisfies z.ZodType<CurrentsNewsInput>

const newsOperation: PublicApiOperationDefinition<CurrentsNewsInput> = {
  id: 'currents.news',
  providerId: 'currents',
  name: 'Latest News',
  commandPath: ['currents', 'news'],
  rpcMethod: 'currents.news',
  description: 'Fetch Currents latest-news headlines through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `Currents API key; defaults to ${CURRENTS_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed for one-off smoke tests; persisted local provider config is preferred for normal use.' },
    { name: 'keywords', flag: '--keywords <text>', description: 'Search keywords', exposure: 'primary', group: 'query', reason: 'Primary discovery intent for live news search.' },
    { name: 'language', flag: '--language <code>', description: `Two-letter language code, default ${CURRENTS_DEFAULT_LANGUAGE}`, exposure: 'primary', group: 'filters', reason: 'Language materially affects readability and result selection.', defaultValue: CURRENTS_DEFAULT_LANGUAGE },
    { name: 'country', flag: '--country <code>', description: 'Two-letter country code filter', exposure: 'primary', group: 'filters', reason: 'Country is a common localization filter for news browsing.' },
    { name: 'category', flag: '--category <name>', description: 'Category filter, e.g. business or technology', exposure: 'primary', group: 'filters', reason: 'Category is a high-value Currents filter with a small documented vocabulary.' },
    { name: 'pageSize', flag: '--page-size <count>', description: `Articles per page, default/cap ${CURRENTS_DEFAULT_PAGE_SIZE}`, exposure: 'primary', group: 'pagination', reason: 'Docs list page_size maximum 300; defaulting to the maximum maximizes one request.', valueType: 'integer', defaultValue: String(CURRENTS_DEFAULT_PAGE_SIZE) },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${CURRENTS_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Needed to continue result pages without a separate pager UI.', valueType: 'integer', defaultValue: String(CURRENTS_DEFAULT_PAGE) },
  ],
  paramsSchema: newsParamsSchema,
  execute: params => listCurrentsNews(params),
  normalizeParams: params => newsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCurrentsNewsInput(params),
  resultKind: 'currents.news',
  defaultFormat: 'text',
}

export const currentsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'currents',
    name: 'Currents',
    description: 'Keyed latest-news API with live global news headlines.',
    publicApisCategory: 'News',
    homepageUrl: 'https://currentsapi.services/',
    docsUrl: 'https://currentsapi.services/en/docs/',
    auth: {
      mode: 'api-key',
      envVars: [CURRENTS_ENV_API_KEY],
      notes: ['Uses apiKey query authentication; store secrets only in environment or local provider config.'],
    },
    tags: ['news', 'headlines', 'media', 'keyed'],
    freePlanNotes: ['Live response exposes x-ratelimit headers; default page_size is 300 to maximize one request.'],
  },
  operations: [newsOperation],
  endpoints: [
    {
      id: 'currents-latest-news',
      method: 'GET',
      urlPattern: 'https://api.currentsapi.services/v1/latest-news',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://currentsapi.services/en/docs/', 'https://api.currentsapi.services/v1/latest-news?page_size=1&language=en'],
      consumedBy: ['currents.news'],
      description: 'Currents latest-news endpoint with apiKey query authentication.',
      notes: ['Requires API key; do not store key in cache keys, logs, fixtures, plan, or catalog.'],
    },
  ],
}
