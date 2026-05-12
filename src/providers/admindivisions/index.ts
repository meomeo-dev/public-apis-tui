import { z } from 'zod'
import { listAdminDivisionsCountry, type AdminDivisionsCountryInput } from '../../application/usecases/adminDivisions.js'
import {
  ADMIN_DIVISIONS_DEFAULT_COUNTRY,
  ADMIN_DIVISIONS_DEFAULT_LIMIT,
  ADMIN_DIVISIONS_MAX_LIMIT,
  normalizeAdminDivisionsCountryInput,
} from '../../infrastructure/openApis/adminDivisionsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const countryParamsSchema = z.object({
  country: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<AdminDivisionsCountryInput>

const countryOperation: PublicApiOperationDefinition<AdminDivisionsCountryInput> = {
  id: 'admindivisions.country',
  providerId: 'admindivisions',
  name: 'Country Divisions',
  commandPath: ['admindivisions', 'country'],
  rpcMethod: 'admindivisions.country',
  description: 'List first-level administrative divisions for one ISO country code from administrative-divisions-db.',
  category: 'geocoding',
  options: [
    {
      name: 'country',
      flag: '--country <iso2>',
      description: `ISO 3166-1 alpha-2 country code, default ${ADMIN_DIVISIONS_DEFAULT_COUNTRY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The country code selects the provider JSON file and keeps the command deterministic.',
      defaultValue: ADMIN_DIVISIONS_DEFAULT_COUNTRY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Maximum divisions to print, default ${String(ADMIN_DIVISIONS_DEFAULT_LIMIT)}, max ${String(ADMIN_DIVISIONS_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Some countries have many divisions; a CLI limit keeps terminal output bounded while JSON retains pagination metadata.',
      valueType: 'integer',
      defaultValue: String(ADMIN_DIVISIONS_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: countryParamsSchema,
  execute: params => listAdminDivisionsCountry(params),
  normalizeParams: params => countryParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeAdminDivisionsCountryInput(params),
  resultKind: 'admindivisions.country',
  defaultFormat: 'text',
}

export const adminDivisionsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'admindivisions',
    name: 'administrative-divisions-db',
    description: 'No-auth GitHub-hosted JSON files for country administrative divisions.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://github.com/kamikazechaser/administrative-divisions-db',
    docsUrl: 'https://github.com/kamikazechaser/administrative-divisions-db',
    auth: {
      mode: 'none',
      notes: ['Raw JSON files are reachable without API keys, OAuth, cookies, browser sessions, or scraping.'],
    },
    tags: ['geocoding', 'administrative-divisions', 'countries', 'github-raw', 'json', 'no-auth'],
    freePlanNotes: [
      'The provider is a GitHub-hosted open dataset; GitHub raw/cache limits may apply.',
      'CLI exposes one bounded country-code lookup rather than arbitrary repository/static-file fetching.',
      'Country must be an ISO 3166-1 alpha-2 code and output is limited to 500 rows.',
    ],
  },
  operations: [countryOperation],
  endpoints: [
    {
      id: 'admindivisions-country-json',
      method: 'GET',
      urlPattern: 'https://raw.githubusercontent.com/kamikazechaser/administrative-divisions-db/master/api/*.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'administrative-divisions-db per-country JSON file containing administrative division names.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [
        'https://github.com/kamikazechaser/administrative-divisions-db',
        'https://raw.githubusercontent.com/kamikazechaser/administrative-divisions-db/master/api/KE.json',
        'https://raw.githubusercontent.com/kamikazechaser/administrative-divisions-db/master/api/US.json',
      ],
      consumedBy: ['admindivisions country'],
      notes: ['No authentication required.', 'GitHub raw returns text/plain content-type for JSON files; provider parses and validates the JSON array.', 'Invalid country files return HTTP 404.'],
    },
  ],
}

export type { AdminDivisionsCountryInput } from '../../application/usecases/adminDivisions.js'
