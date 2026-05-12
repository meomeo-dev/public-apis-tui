import {
  REST_COUNTRIES_DOCS_URL,
  REST_COUNTRIES_MAX_LIMIT,
  RestCountriesClient,
  normalizeRestCountriesAlphaInput,
  normalizeRestCountriesNameInput,
  normalizeRestCountriesRegionInput,
  type RestCountriesAlphaInput,
  type RestCountriesCountry,
  type RestCountriesNameInput,
  type RestCountriesRegionInput,
} from '../../infrastructure/openApis/restCountriesClient.js'

type RestCountriesApiMeta = {
  providerId: 'restcountries'
  providerName: 'REST Countries'
  endpoint: string
  documentation: typeof REST_COUNTRIES_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  reliability: 'Reference country metadata; validate legal, travel, sanctions, or compliance decisions against official government sources.'
}

const apiBase = {
  providerId: 'restcountries',
  providerName: 'REST Countries',
  documentation: REST_COUNTRIES_DOCS_URL,
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  reliability: 'Reference country metadata; validate legal, travel, sanctions, or compliance decisions against official government sources.',
} satisfies Omit<RestCountriesApiMeta, 'endpoint'>

export type RestCountriesNameResult = {
  kind: 'restcountries.name'
  api: RestCountriesApiMeta & { endpoint: 'GET /v3.1/name/{name}' }
  query: ReturnType<typeof normalizeRestCountriesNameInput>
  countries: RestCountriesCountry[]
  pagination: { returned: number; limit: number; maxLimit: typeof REST_COUNTRIES_MAX_LIMIT }
}

export type RestCountriesAlphaResult = {
  kind: 'restcountries.alpha'
  api: RestCountriesApiMeta & { endpoint: 'GET /v3.1/alpha/{code}' }
  query: ReturnType<typeof normalizeRestCountriesAlphaInput>
  country?: RestCountriesCountry | undefined
  count: { returned: 0 | 1 }
}

export type RestCountriesRegionResult = {
  kind: 'restcountries.region'
  api: RestCountriesApiMeta & { endpoint: 'GET /v3.1/region/{region}' }
  query: ReturnType<typeof normalizeRestCountriesRegionInput>
  countries: RestCountriesCountry[]
  pagination: { returned: number; limit: number; maxLimit: typeof REST_COUNTRIES_MAX_LIMIT }
}

export async function searchRestCountriesByName(input: RestCountriesNameInput = {}): Promise<RestCountriesNameResult> {
  const query = normalizeRestCountriesNameInput(input)
  const countries = await new RestCountriesClient().byName(query)
  return {
    kind: 'restcountries.name',
    api: { ...apiBase, endpoint: 'GET /v3.1/name/{name}' },
    query,
    countries,
    pagination: { returned: countries.length, limit: query.limit, maxLimit: REST_COUNTRIES_MAX_LIMIT },
  }
}

export async function lookupRestCountriesAlpha(input: RestCountriesAlphaInput = {}): Promise<RestCountriesAlphaResult> {
  const query = normalizeRestCountriesAlphaInput(input)
  const country = await new RestCountriesClient().byAlpha(query)
  return {
    kind: 'restcountries.alpha',
    api: { ...apiBase, endpoint: 'GET /v3.1/alpha/{code}' },
    query,
    ...(country !== undefined ? { country } : {}),
    count: { returned: country === undefined ? 0 : 1 },
  }
}

export async function listRestCountriesRegion(input: RestCountriesRegionInput = {}): Promise<RestCountriesRegionResult> {
  const query = normalizeRestCountriesRegionInput(input)
  const countries = await new RestCountriesClient().byRegion(query)
  return {
    kind: 'restcountries.region',
    api: { ...apiBase, endpoint: 'GET /v3.1/region/{region}' },
    query,
    countries,
    pagination: { returned: countries.length, limit: query.limit, maxLimit: REST_COUNTRIES_MAX_LIMIT },
  }
}

export type { RestCountriesAlphaInput, RestCountriesNameInput, RestCountriesRegionInput }
