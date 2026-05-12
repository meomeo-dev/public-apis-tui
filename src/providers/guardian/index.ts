import { z } from 'zod'
import { searchGuardianContent } from '../../application/usecases/guardian.js'
import {
  GUARDIAN_DEFAULT_PAGE,
  GUARDIAN_DEFAULT_PAGE_SIZE,
  GUARDIAN_DEFAULT_QUERY,
  GUARDIAN_DEFAULT_SHOW_FIELDS,
  GUARDIAN_ENV_API_KEY,
  normalizeGuardianSearchInput,
  type GuardianSearchInput,
} from '../../infrastructure/openApis/guardianClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  orderBy: z.enum(['newest', 'oldest', 'relevance']).optional(),
  pageSize: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  showFields: z.string().min(1).optional(),
}) satisfies z.ZodType<GuardianSearchInput>

const searchOperation: PublicApiOperationDefinition<GuardianSearchInput> = {
  id: 'guardian.search',
  providerId: 'guardian',
  name: 'Content Search',
  commandPath: ['guardian', 'search'],
  rpcMethod: 'guardian.search',
  description: 'Search The Guardian Open Platform Content API through the documented keyed REST API.',
  category: 'news',
  options: [
    { name: 'apiKey', flag: '--api-key <key>', description: `Guardian API key; defaults to ${GUARDIAN_ENV_API_KEY} or local config`, exposure: 'advanced', group: 'authentication', reason: 'Exposed only for one-off smoke tests; local provider config or env is preferred.' },
    { name: 'query', flag: '--query <text>', description: `Search query, default "${GUARDIAN_DEFAULT_QUERY}"`, exposure: 'primary', group: 'query', reason: 'Primary content search intent.', defaultValue: GUARDIAN_DEFAULT_QUERY },
    { name: 'section', flag: '--section <slug>', description: 'Restrict to a Guardian section such as technology or world', exposure: 'primary', group: 'filters', reason: 'Section is a high-value navigation filter for Guardian content.' },
    { name: 'tag', flag: '--tag <path>', description: 'Restrict to a Guardian tag path such as technology/apple', exposure: 'advanced', group: 'filters', reason: 'Tags are powerful but require Guardian-specific identifiers.' },
    { name: 'fromDate', flag: '--from-date <YYYY-MM-DD>', description: 'Only content published on or after this date', exposure: 'advanced', group: 'filters', reason: 'Date windows are useful for bounded research but secondary to query/section.' },
    { name: 'toDate', flag: '--to-date <YYYY-MM-DD>', description: 'Only content published on or before this date', exposure: 'advanced', group: 'filters', reason: 'Pairs with --from-date for bounded searches.' },
    { name: 'orderBy', flag: '--order-by <newest|oldest|relevance>', description: 'Sort order; Guardian defaults to relevance for queries', exposure: 'advanced', group: 'presentation', reason: 'Sorting changes result order but is secondary to search UX.' },
    { name: 'showFields', flag: '--show-fields <fields>', description: `Displayed fields subset, default ${GUARDIAN_DEFAULT_SHOW_FIELDS}`, exposure: 'advanced', group: 'content', reason: 'Curated to renderer-supported fields rather than raw upstream field surface.', defaultValue: GUARDIAN_DEFAULT_SHOW_FIELDS },
    { name: 'pageSize', flag: '--page-size <count>', description: `Articles per page, default/cap ${GUARDIAN_DEFAULT_PAGE_SIZE}`, exposure: 'primary', group: 'pagination', reason: 'Docs list page-size maximum 50; defaulting to the maximum conserves requests.', valueType: 'integer', defaultValue: String(GUARDIAN_DEFAULT_PAGE_SIZE) },
    { name: 'page', flag: '--page <number>', description: `Page number, default ${GUARDIAN_DEFAULT_PAGE}`, exposure: 'advanced', group: 'pagination', reason: 'Needed to continue result pages without a separate pager UI.', valueType: 'integer', defaultValue: String(GUARDIAN_DEFAULT_PAGE) },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchGuardianContent(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGuardianSearchInput(params),
  resultKind: 'guardian.search',
  defaultFormat: 'text',
}

export const guardianProvider: PublicApiProviderModule = {
  manifest: {
    id: 'guardian',
    name: 'The Guardian',
    description: 'Keyed Guardian Open Platform Content API search provider.',
    publicApisCategory: 'News',
    homepageUrl: 'https://open-platform.theguardian.com/',
    docsUrl: 'https://open-platform.theguardian.com/documentation/search',
    auth: {
      mode: 'api-key',
      envVars: [GUARDIAN_ENV_API_KEY],
      notes: ['Uses api-key query authentication; store secrets only in environment or local provider config.'],
    },
    tags: ['news', 'content', 'media', 'keyed'],
    freePlanNotes: ['Docs list page-size max 50; developer tier is exposed in live JSON responses.'],
  },
  operations: [searchOperation],
  endpoints: [
    {
      id: 'guardian-content-search',
      method: 'GET',
      urlPattern: 'https://content.guardianapis.com/search',
      category: 'public-api:news',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://open-platform.theguardian.com/documentation/search'],
      consumedBy: ['guardian.search'],
      description: 'Guardian Open Platform Content API search endpoint with api-key query authentication.',
      notes: ['Requires API key; cache keys must omit api-key.'],
    },
  ],
}
