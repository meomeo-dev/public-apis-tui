import { z } from 'zod'
import { searchChroniclingAmerica } from '../../application/usecases/chroniclingAmerica.js'
import {
  CHRONICLING_AMERICA_DEFAULT_COUNT,
  CHRONICLING_AMERICA_DEFAULT_PAGE,
  CHRONICLING_AMERICA_DEFAULT_QUERY,
  CHRONICLING_AMERICA_MAX_PAGE,
  normalizeChroniclingAmericaSearchInput,
  type ChroniclingAmericaSearchInput,
} from '../../infrastructure/openApis/chroniclingAmericaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().min(1).optional(),
  count: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  dates: z.string().min(1).optional(),
}) satisfies z.ZodType<ChroniclingAmericaSearchInput>

const searchOperation: PublicApiOperationDefinition<ChroniclingAmericaSearchInput> = {
  id: 'chroniclingamerica.search',
  providerId: 'chroniclingamerica',
  name: 'Search',
  commandPath: ['chroniclingamerica', 'search'],
  rpcMethod: 'chroniclingamerica.search',
  description: 'Search Library of Congress Chronicling America newspaper pages through the current LOC JSON API.',
  category: 'news',
  options: [
    { name: 'query', flag: '--query <text>', description: `Search text, default ${CHRONICLING_AMERICA_DEFAULT_QUERY}`, exposure: 'primary', group: 'query', reason: 'Text query is the primary discovery path for newspaper pages in the LOC JSON API.', defaultValue: CHRONICLING_AMERICA_DEFAULT_QUERY },
    { name: 'count', flag: '--count <count>', description: `Results to return, default/cap ${CHRONICLING_AMERICA_DEFAULT_COUNT}`, exposure: 'primary', group: 'pagination', reason: 'LOC API docs support up to 1,000 returned results; defaulting to the maximum maximizes one request.', valueType: 'integer', defaultValue: String(CHRONICLING_AMERICA_DEFAULT_COUNT) },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${CHRONICLING_AMERICA_DEFAULT_PAGE}, cap ${CHRONICLING_AMERICA_MAX_PAGE}`, exposure: 'primary', group: 'pagination', reason: 'LOC API uses sp for pagination and documents deep-paging limits; cap prevents expensive accidental deep paging.', valueType: 'integer', defaultValue: String(CHRONICLING_AMERICA_DEFAULT_PAGE) },
    { name: 'dates', flag: '--dates <range>', description: 'Optional LOC date facet, e.g. 1860/1865', exposure: 'advanced', group: 'filters', reason: 'Date range is a high-signal historic newspaper filter and helps reduce result volume.', defaultValue: undefined },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchChroniclingAmerica(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeChroniclingAmericaSearchInput(params),
  resultKind: 'chroniclingamerica.search',
  defaultFormat: 'text',
}

export const chroniclingAmericaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'chroniclingamerica',
    name: 'Chronicling America',
    description: 'No-auth Library of Congress JSON search over historic US newspaper pages.',
    publicApisCategory: 'News',
    homepageUrl: 'https://chroniclingamerica.loc.gov/',
    docsUrl: 'https://www.loc.gov/apis/json-and-yaml/',
    auth: { mode: 'none', notes: ['Current loc.gov JSON API requires no API key, OAuth, cookies, browser session, or account setup.'] },
    tags: ['news', 'newspapers', 'history', 'library-of-congress', 'archives'],
    freePlanNotes: [
      'LOC API guidance asks users to keep traffic under 20 requests/minute and 2,000 requests/hour.',
      'Legacy chroniclingamerica.loc.gov API paths returned 404 during 2026-05-04 probes; implementation uses the current loc.gov JSON API.',
    ],
  },
  operations: [searchOperation],
  endpoints: [
    {
      id: 'chroniclingamerica-loc-collection-search',
      method: 'GET',
      urlPattern: 'https://www.loc.gov/collections/chronicling-america/',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://www.loc.gov/apis/json-and-yaml/', 'https://www.loc.gov/collections/chronicling-america/?fo=json&at=results,pagination&c=5&q=lincoln'],
      consumedBy: ['chroniclingamerica.search'],
      description: 'Current LOC JSON API search for Chronicling America collection results.',
      notes: ['No auth required; use fo=json and at=results,pagination for compact JSON. Legacy chroniclingamerica.loc.gov /search/pages/results/ returned HTTP 404 in live probes.'],
    },
  ],
}
