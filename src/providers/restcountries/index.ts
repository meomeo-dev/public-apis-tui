import { z } from 'zod'
import {
  listRestCountriesRegion,
  lookupRestCountriesAlpha,
  searchRestCountriesByName,
  type RestCountriesAlphaInput,
  type RestCountriesNameInput,
  type RestCountriesRegionInput,
} from '../../application/usecases/restCountries.js'
import {
  REST_COUNTRIES_DEFAULT_CODE,
  REST_COUNTRIES_DEFAULT_LIMIT,
  REST_COUNTRIES_DEFAULT_NAME,
  REST_COUNTRIES_DEFAULT_REGION,
  REST_COUNTRIES_DOCS_URL,
  REST_COUNTRIES_MAX_LIMIT,
  normalizeRestCountriesAlphaInput,
  normalizeRestCountriesNameInput,
  normalizeRestCountriesRegionInput,
} from '../../infrastructure/openApis/restCountriesClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const nameParamsSchema = z.object({
  name: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<RestCountriesNameInput>

const alphaParamsSchema = z.object({
  code: z.string().optional(),
}) satisfies z.ZodType<RestCountriesAlphaInput>

const regionParamsSchema = z.object({
  region: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<RestCountriesRegionInput>

const nameOperation: PublicApiOperationDefinition<RestCountriesNameInput> = {
  id: 'restcountries.name',
  providerId: 'restcountries',
  name: 'Search by name',
  commandPath: ['restcountries', 'name'],
  rpcMethod: 'restcountries.name',
  description: 'Search REST Countries by country name using selected fields.',
  category: 'geocoding',
  options: [
    {
      name: 'name',
      flag: '--name <country>',
      description: `Country name, default ${REST_COUNTRIES_DEFAULT_NAME}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented name endpoint requires a country name path segment.',
      defaultValue: REST_COUNTRIES_DEFAULT_NAME,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Countries to show, default ${String(REST_COUNTRIES_DEFAULT_LIMIT)}, max ${String(REST_COUNTRIES_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Name search can return multiple countries; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(REST_COUNTRIES_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: nameParamsSchema,
  execute: params => searchRestCountriesByName(params),
  normalizeParams: params => nameParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRestCountriesNameInput(params),
  resultKind: 'restcountries.name',
  defaultFormat: 'text',
}

const alphaOperation: PublicApiOperationDefinition<RestCountriesAlphaInput> = {
  id: 'restcountries.alpha',
  providerId: 'restcountries',
  name: 'Lookup by alpha code',
  commandPath: ['restcountries', 'alpha'],
  rpcMethod: 'restcountries.alpha',
  description: 'Look up a REST Countries record by ISO 3166 alpha-2 or alpha-3 country code.',
  category: 'geocoding',
  options: [
    {
      name: 'code',
      flag: '--code <code>',
      description: `ISO 3166 alpha-2/alpha-3 code, default ${REST_COUNTRIES_DEFAULT_CODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented alpha endpoint requires a country code path segment.',
      defaultValue: REST_COUNTRIES_DEFAULT_CODE,
    },
  ],
  paramsSchema: alphaParamsSchema,
  execute: params => lookupRestCountriesAlpha(params),
  normalizeParams: params => alphaParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRestCountriesAlphaInput(params),
  resultKind: 'restcountries.alpha',
  defaultFormat: 'text',
}

const regionOperation: PublicApiOperationDefinition<RestCountriesRegionInput> = {
  id: 'restcountries.region',
  providerId: 'restcountries',
  name: 'List by region',
  commandPath: ['restcountries', 'region'],
  rpcMethod: 'restcountries.region',
  description: 'List countries in a REST Countries region using selected fields.',
  category: 'geocoding',
  options: [
    {
      name: 'region',
      flag: '--region <name>',
      description: `Region name, default ${REST_COUNTRIES_DEFAULT_REGION}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented region endpoint requires a region path segment.',
      defaultValue: REST_COUNTRIES_DEFAULT_REGION,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Countries to show, default ${String(REST_COUNTRIES_DEFAULT_LIMIT)}, max ${String(REST_COUNTRIES_MAX_LIMIT)}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Region lists can be large; CLI caps terminal output and cache payloads.',
      valueType: 'integer',
      defaultValue: String(REST_COUNTRIES_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: regionParamsSchema,
  execute: params => listRestCountriesRegion(params),
  normalizeParams: params => regionParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRestCountriesRegionInput(params),
  resultKind: 'restcountries.region',
  defaultFormat: 'text',
}

export const restCountriesProvider: PublicApiProviderModule = {
  manifest: {
    id: 'restcountries',
    name: 'REST Countries',
    description: 'No-auth HTTPS JSON country metadata lookup by name, alpha code, or region.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://restcountries.com',
    docsUrl: REST_COUNTRIES_DOCS_URL,
    auth: {
      mode: 'none',
      notes: ['Implemented GET endpoints require no API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'countries', 'metadata', 'iso3166', 'json', 'no-auth'],
    freePlanNotes: [
      'CLI requests selected fields only to keep payloads bounded.',
      'All/independent/status-code/full-text/raw broad endpoints are intentionally excluded.',
      'Country metadata is reference data; validate legal, travel, sanctions, or compliance decisions against official government sources.',
    ],
  },
  operations: [nameOperation, alphaOperation, regionOperation],
  endpoints: [
    {
      id: 'restcountries-name',
      method: 'GET',
      urlPattern: 'https://restcountries.com/v3.1/name/*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'REST Countries country-name search endpoint with selected fields.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [REST_COUNTRIES_DOCS_URL, 'https://restcountries.com/v3.1/name/peru?fields=name,cca2,cca3,capital,region,subregion,population,area,languages,currencies,flags'],
      consumedBy: ['public-apis apis run restcountries.name'],
      notes: ['No authentication required.', '404 not-found envelopes are mapped to empty results.', 'Fields query parameter limits payload size.'],
    },
    {
      id: 'restcountries-alpha',
      method: 'GET',
      urlPattern: 'https://restcountries.com/v3.1/alpha/*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'REST Countries ISO alpha code lookup endpoint with selected fields.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [REST_COUNTRIES_DOCS_URL, 'https://restcountries.com/v3.1/alpha/DE?fields=name,cca2,cca3,capital,region,subregion,population,area,languages,currencies,flags'],
      consumedBy: ['public-apis apis run restcountries.alpha'],
      notes: ['No authentication required.', 'Alpha code is validated locally before network calls.'],
    },
    {
      id: 'restcountries-region',
      method: 'GET',
      urlPattern: 'https://restcountries.com/v3.1/region/*',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'REST Countries region list endpoint with selected fields.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [REST_COUNTRIES_DOCS_URL, 'https://restcountries.com/v3.1/region/europe?fields=name,cca2,cca3,capital,region,subregion,population,area,languages,currencies,flags'],
      consumedBy: ['public-apis apis run restcountries.region'],
      notes: ['No authentication required.', 'CLI caps returned records to avoid raw large payload dumps.'],
    },
  ],
}

export type { RestCountriesAlphaInput, RestCountriesNameInput, RestCountriesRegionInput } from '../../application/usecases/restCountries.js'
