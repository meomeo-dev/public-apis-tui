import { z } from 'zod'
import { getCensusGovAcsProfileStates, listCensusGovDatasets } from '../../application/usecases/censusGov.js'
import {
  CENSUS_GOV_DEFAULT_DATASET_LIMIT,
  CENSUS_GOV_DEFAULT_DATASET_QUERY,
  CENSUS_GOV_DEFAULT_YEAR,
  CENSUS_GOV_STATE_ROW_COUNT,
  normalizeCensusGovAcsProfileStatesInput,
  normalizeCensusGovDatasetsInput,
  type CensusGovAcsProfileStatesInput,
  type CensusGovDatasetsInput,
} from '../../infrastructure/openApis/censusGovClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const datasetsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<CensusGovDatasetsInput>

const acsProfileStatesParamsSchema = z.object({
  year: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<CensusGovAcsProfileStatesInput>

const datasetsOperation: PublicApiOperationDefinition<CensusGovDatasetsInput> = {
  id: 'censusgov.datasets',
  providerId: 'censusgov',
  name: 'Datasets',
  commandPath: ['censusgov', 'datasets'],
  rpcMethod: 'censusgov.datasets',
  description: 'Search the Census.gov public API dataset catalog.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Catalog filter text, default ${CENSUS_GOV_DEFAULT_DATASET_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The full data.json catalog is large; a local text filter keeps terminal output focused.',
      defaultValue: CENSUS_GOV_DEFAULT_DATASET_QUERY,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Datasets to show/cache, default/cap ${CENSUS_GOV_DEFAULT_DATASET_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Catalog responses are client-filtered; 100 maximizes one bounded terminal page without extra requests.',
      valueType: 'integer',
      defaultValue: String(CENSUS_GOV_DEFAULT_DATASET_LIMIT),
    },
  ],
  paramsSchema: datasetsParamsSchema,
  execute: params => listCensusGovDatasets(params),
  normalizeParams: params => datasetsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCensusGovDatasetsInput(params),
  resultKind: 'censusgov.datasets',
  defaultFormat: 'text',
}

const acsProfileStatesOperation: PublicApiOperationDefinition<CensusGovAcsProfileStatesInput> = {
  id: 'censusgov.acsProfileStates',
  providerId: 'censusgov',
  name: 'ACS Profile States',
  commandPath: ['censusgov', 'acs-profile-states'],
  rpcMethod: 'censusgov.acsProfileStates',
  description: 'Read ACS 5-year profile population and median household income by state.',
  category: 'government',
  options: [
    {
      name: 'year',
      flag: '--year <YYYY>',
      description: `ACS vintage, default ${CENSUS_GOV_DEFAULT_YEAR}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Year selection is the main analytical control while keeping the curated variable set stable.',
      valueType: 'integer',
      defaultValue: String(CENSUS_GOV_DEFAULT_YEAR),
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to show/cache, default/cap ${CENSUS_GOV_STATE_ROW_COUNT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'State-level ACS profile currently returns 50 states plus DC and Puerto Rico; 52 maximizes the useful page.',
      valueType: 'integer',
      defaultValue: String(CENSUS_GOV_STATE_ROW_COUNT),
    },
  ],
  paramsSchema: acsProfileStatesParamsSchema,
  execute: params => getCensusGovAcsProfileStates(params),
  normalizeParams: params => acsProfileStatesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCensusGovAcsProfileStatesInput(params),
  resultKind: 'censusgov.acsProfileStates',
  defaultFormat: 'text',
}

export const censusGovProvider: PublicApiProviderModule = {
  manifest: {
    id: 'censusgov',
    name: 'Census.gov',
    description: 'No-auth United States Census Bureau API catalog and ACS profile state indicators.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://www.census.gov/data/developers/data-sets.html',
    docsUrl: 'https://www.census.gov/data/developers/data-sets.html',
    auth: {
      mode: 'none',
      notes: ['Implemented catalog and ACS profile queries require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'census', 'demographics', 'acs', 'usa', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'The Census API supports optional API keys for higher-volume use, but these implemented low-volume operations work without a key.',
      'ACS profile state default/cap is 52 rows, matching the full state/DC/Puerto Rico response observed for the curated query.',
    ],
  },
  operations: [datasetsOperation, acsProfileStatesOperation],
  endpoints: [
    {
      id: 'censusgov-data-json',
      method: 'GET',
      urlPattern: 'https://api.census.gov/data.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Census.gov dataset catalog endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.census.gov/data.json', 'https://www.census.gov/data/developers/data-sets.html'],
      consumedBy: ['censusgov datasets'],
      notes: ['No API key required.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'censusgov-acs-profile-states',
      method: 'GET',
      urlPattern: 'https://api.census.gov/data/*/acs/acs5/profile',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Census.gov ACS 5-year profile state query endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://api.census.gov/data/2024/acs/acs5/profile?get=NAME,DP05_0001E,DP03_0062E&for=state:*'],
      consumedBy: ['censusgov acs-profile-states'],
      notes: ['No API key required for this low-volume query.', 'No browser clickstream or scraping required.'],
    },
  ],
}
