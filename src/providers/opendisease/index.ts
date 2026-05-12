import { z } from 'zod'
import {
  getOpenDiseaseCountries,
  getOpenDiseaseGlobal,
  getOpenDiseaseInfluenza,
  type OpenDiseaseCountriesInput,
  type OpenDiseaseGlobalInput,
  type OpenDiseaseInfluenzaInput,
} from '../../application/usecases/openDisease.js'
import {
  normalizeOpenDiseaseCountriesInput,
  normalizeOpenDiseaseGlobalInput,
  normalizeOpenDiseaseInfluenzaInput,
  OPEN_DISEASE_COUNTRIES_DEFAULT_LIMIT,
  OPEN_DISEASE_DEFAULT_PERIOD,
  OPEN_DISEASE_DEFAULT_SORT,
  OPEN_DISEASE_INFLUENZA_DEFAULT_LIMIT,
} from '../../infrastructure/openApis/openDiseaseClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const globalParamsSchema = z.object({
  period: z.string().optional(),
  allowNull: z.boolean().optional(),
}) satisfies z.ZodType<OpenDiseaseGlobalInput>

const countriesParamsSchema = z.object({
  sort: z.string().optional(),
  allowNull: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<OpenDiseaseCountriesInput>

const influenzaParamsSchema = z.object({
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<OpenDiseaseInfluenzaInput>

const globalOperation: PublicApiOperationDefinition<OpenDiseaseGlobalInput> = {
  id: 'opendisease.global',
  providerId: 'opendisease',
  name: 'COVID-19 Global Totals',
  commandPath: ['opendisease', 'global'],
  rpcMethod: 'opendisease.global',
  description: 'Read global COVID-19 totals from Open Disease.',
  category: 'health',
  options: [
    { name: 'period', flag: '--period <today|yesterday|two-days-ago>', description: `Reported day selector, default ${OPEN_DISEASE_DEFAULT_PERIOD}`, exposure: 'primary', group: 'filters', reason: 'Combines the documented yesterday/twoDaysAgo booleans into one safer CLI choice.', defaultValue: OPEN_DISEASE_DEFAULT_PERIOD },
    { name: 'allowNull', flag: '--allow-null <true|false>', description: 'Allow null values instead of provider zero-fill, default false', exposure: 'advanced', group: 'filters', reason: 'Documents the upstream allowNull flag without cluttering the common totals view.', valueType: 'boolean', defaultValue: 'false' },
  ],
  paramsSchema: globalParamsSchema,
  execute: params => getOpenDiseaseGlobal(params),
  normalizeParams: params => normalizeOpenDiseaseGlobalInput(globalParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeOpenDiseaseGlobalInput(params),
  resultKind: 'opendisease.global',
  defaultFormat: 'text',
}

const countriesOperation: PublicApiOperationDefinition<OpenDiseaseCountriesInput> = {
  id: 'opendisease.countries',
  providerId: 'opendisease',
  name: 'COVID-19 Country Totals',
  commandPath: ['opendisease', 'countries'],
  rpcMethod: 'opendisease.countries',
  description: 'Read COVID-19 totals for countries from Open Disease.',
  category: 'health',
  options: [
    { name: 'sort', flag: '--sort <field>', description: `Country sort field, default ${OPEN_DISEASE_DEFAULT_SORT}`, exposure: 'primary', group: 'presentation', reason: 'Uses the documented country sort fields while defaulting to the most actionable case-volume view.', defaultValue: OPEN_DISEASE_DEFAULT_SORT },
    { name: 'search', flag: '--search <text>', description: 'Local country/continent/ISO filter', exposure: 'primary', group: 'filters', reason: 'Keeps the full no-auth fetch while making terminal exploration focused.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Countries to retain, default/cap ${OPEN_DISEASE_COUNTRIES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The endpoint has no page-size parameter and returns the full country list; default/cap preserves the full observed response for one request.', valueType: 'integer', defaultValue: String(OPEN_DISEASE_COUNTRIES_DEFAULT_LIMIT) },
    { name: 'allowNull', flag: '--allow-null <true|false>', description: 'Allow null values instead of provider zero-fill, default false', exposure: 'advanced', group: 'filters', reason: 'Documents the upstream allowNull flag without cluttering common country ranking usage.', valueType: 'boolean', defaultValue: 'false' },
  ],
  paramsSchema: countriesParamsSchema,
  execute: params => getOpenDiseaseCountries(params),
  normalizeParams: params => normalizeOpenDiseaseCountriesInput(countriesParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeOpenDiseaseCountriesInput(params),
  resultKind: 'opendisease.countries',
  defaultFormat: 'text',
}

const influenzaOperation: PublicApiOperationDefinition<OpenDiseaseInfluenzaInput> = {
  id: 'opendisease.influenza',
  providerId: 'opendisease',
  name: 'CDC ILINet Influenza',
  commandPath: ['opendisease', 'influenza'],
  rpcMethod: 'opendisease.influenza',
  description: 'Read CDC ILINet influenza-like-illness rows from Open Disease.',
  category: 'health',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `Rows to retain, default/cap ${OPEN_DISEASE_INFLUENZA_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The documented endpoint returns a finite CDC ILINet outbreak series; default/cap preserves the full observed response.', valueType: 'integer', defaultValue: String(OPEN_DISEASE_INFLUENZA_DEFAULT_LIMIT) },
  ],
  paramsSchema: influenzaParamsSchema,
  execute: params => getOpenDiseaseInfluenza(params),
  normalizeParams: params => normalizeOpenDiseaseInfluenzaInput(influenzaParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeOpenDiseaseInfluenzaInput(params),
  resultKind: 'opendisease.influenza',
  defaultFormat: 'text',
}

export const openDiseaseProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opendisease',
    name: 'Open Disease',
    description: 'disease.sh no-auth disease statistics API for COVID-19 and influenza data.',
    publicApisCategory: 'Health',
    homepageUrl: 'https://disease.sh/',
    docsUrl: 'https://disease.sh/docs/',
    auth: { mode: 'none', notes: ['Selected v3 endpoints require no API key, OAuth, cookies, account setup, or browser session.'] },
    tags: ['health', 'covid-19', 'influenza', 'cdc', 'disease', 'no-auth', 'json'],
    freePlanNotes: [
      'No API key or public request quota is documented for selected v3 endpoints.',
      'Country and influenza endpoints return finite arrays; CLI defaults preserve the full observed response and text output caps visible rows.',
      'Only read-only documented HTTPS JSON endpoints are implemented.',
    ],
  },
  operations: [globalOperation, countriesOperation, influenzaOperation],
  endpoints: [
    { id: 'opendisease-covid19-all', method: 'GET', urlPattern: 'https://disease.sh/v3/covid-19/all*', category: 'public-apis:health', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://disease.sh/docs/', 'https://disease.sh/apidocs/swagger_v3.json', 'https://disease.sh/v3/covid-19/all'], consumedBy: ['opendisease.global'], description: 'Open Disease global COVID-19 totals.', notes: ['No authentication required.'] },
    { id: 'opendisease-covid19-countries', method: 'GET', urlPattern: 'https://disease.sh/v3/covid-19/countries*', category: 'public-apis:health', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://disease.sh/docs/', 'https://disease.sh/apidocs/swagger_v3.json', 'https://disease.sh/v3/covid-19/countries'], consumedBy: ['opendisease.countries'], description: 'Open Disease COVID-19 country totals with documented sort and allowNull query parameters.', notes: ['No authentication required.', 'Endpoint returns the full country list; local search/limit happens after fetch.'] },
    { id: 'opendisease-influenza-ilinet', method: 'GET', urlPattern: 'https://disease.sh/v3/influenza/cdc/ILINet', category: 'public-apis:health', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://disease.sh/docs/', 'https://disease.sh/apidocs/swagger_v3.json', 'https://disease.sh/v3/influenza/cdc/ILINet'], consumedBy: ['opendisease.influenza'], description: 'Open Disease CDC ILINet influenza-like illness data.', notes: ['No authentication required.'] },
  ],
}
