import { z } from 'zod'
import { getMfApiLatest, searchMfApiSchemes } from '../../application/usecases/mfApi.js'
import {
  MF_API_DEFAULT_LIMIT,
  MF_API_DEFAULT_QUERY,
  MF_API_DEFAULT_SCHEME_CODE,
  MF_API_MAX_LIMIT,
  normalizeMfApiLatestInput,
  normalizeMfApiSearchInput,
  type MfApiLatestInput,
  type MfApiSearchInput,
} from '../../infrastructure/openApis/mfApiClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<MfApiSearchInput>

const latestParamsSchema = z.object({
  schemeCode: z.union([z.coerce.number(), z.string()]).optional(),
}) satisfies z.ZodType<MfApiLatestInput>

const searchOperation: PublicApiOperationDefinition<MfApiSearchInput> = {
  id: 'mfapi.search',
  providerId: 'mfapi',
  name: 'Scheme Search',
  commandPath: ['mfapi', 'search'],
  rpcMethod: 'mfapi.search',
  description: 'Search Indian mutual fund schemes by name.',
  category: 'finance',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Search text, default ${MF_API_DEFAULT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Scheme discovery is the first step before a latest NAV lookup.',
      defaultValue: MF_API_DEFAULT_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Schemes to show, default/cap ${MF_API_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'MFapi search does not document a page-size max; the CLI caps results to keep terminal output/cache bounded.',
      valueType: 'integer',
      defaultValue: String(MF_API_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchMfApiSchemes(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeMfApiSearchInput(params),
  resultKind: 'mfapi.search',
  defaultFormat: 'text',
}

const latestOperation: PublicApiOperationDefinition<MfApiLatestInput> = {
  id: 'mfapi.latest',
  providerId: 'mfapi',
  name: 'Latest NAV',
  commandPath: ['mfapi', 'latest'],
  rpcMethod: 'mfapi.latest',
  description: 'Read the latest NAV for one Indian mutual fund scheme.',
  category: 'finance',
  options: [
    {
      name: 'schemeCode',
      flag: '--scheme-code <code>',
      description: `MFapi scheme code, default ${MF_API_DEFAULT_SCHEME_CODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Latest NAV endpoint requires a specific scheme code; search helps discover it.',
      valueType: 'integer',
      defaultValue: String(MF_API_DEFAULT_SCHEME_CODE),
    },
  ],
  paramsSchema: latestParamsSchema,
  execute: params => getMfApiLatest(params),
  normalizeParams: params => latestParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeMfApiLatestInput(params),
  resultKind: 'mfapi.latest',
  defaultFormat: 'text',
}

export const mfApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'mfapi',
    name: 'Indian Mutual Fund',
    description: 'No-auth Indian mutual fund scheme search and NAV data from MFapi.in.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://www.mfapi.in/',
    docsUrl: 'https://www.mfapi.in/docs/',
    auth: {
      mode: 'none',
      notes: ['MFapi.in docs state no authentication is required; no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['finance', 'mutual-funds', 'india', 'nav', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs and live probes confirm HTTPS JSON endpoints without authentication.',
      `Search output defaults/caps at ${MF_API_MAX_LIMIT}; latest NAV returns one current data point per scheme.`,
    ],
  },
  operations: [searchOperation, latestOperation],
  endpoints: [
    {
      id: 'mfapi-scheme-search',
      method: 'GET',
      urlPattern: 'https://api.mfapi.in/mf/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'MFapi.in scheme search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.mfapi.in/docs/', 'https://api.mfapi.in/mf/search?q=HDFC'],
      consumedBy: ['mfapi search'],
      notes: ['No API key required.', 'Search has no documented page-size parameter; CLI caps local output.'],
    },
    {
      id: 'mfapi-latest-nav',
      method: 'GET',
      urlPattern: 'https://api.mfapi.in/mf/*/latest',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'MFapi.in latest NAV endpoint for a scheme code.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.mfapi.in/docs/', 'https://api.mfapi.in/mf/125497/latest'],
      consumedBy: ['mfapi latest'],
      notes: ['No API key required.', 'Returns current NAV data only.'],
    },
  ],
}
