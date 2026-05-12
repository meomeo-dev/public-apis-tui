import {
  normalizeOpenDiseaseCountriesInput,
  normalizeOpenDiseaseGlobalInput,
  normalizeOpenDiseaseInfluenzaInput,
  OpenDiseaseClient,
  OPEN_DISEASE_COUNTRIES_MAX_LIMIT,
  OPEN_DISEASE_INFLUENZA_MAX_LIMIT,
  type OpenDiseaseCountriesInput,
  type OpenDiseaseCountryStats,
  type OpenDiseaseGlobalInput,
  type OpenDiseaseGlobalStats,
  type OpenDiseaseInfluenzaInput,
  type OpenDiseaseInfluenzaRow,
} from '../../infrastructure/openApis/openDiseaseClient.js'

type OpenDiseaseApiMetadata = {
  provider: 'opendisease'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
}

export type OpenDiseaseGlobalResult = {
  kind: 'opendisease.global'
  api: OpenDiseaseApiMetadata
  query: ReturnType<typeof normalizeOpenDiseaseGlobalInput>
  stats: OpenDiseaseGlobalStats
}

export type OpenDiseaseCountriesResult = {
  kind: 'opendisease.countries'
  api: OpenDiseaseApiMetadata
  query: ReturnType<typeof normalizeOpenDiseaseCountriesInput>
  countries: OpenDiseaseCountryStats[]
  pagination: {
    returned: number
    total: number
    limit: number
    maxLimit: number
    sort: string
  }
}

export type OpenDiseaseInfluenzaResult = {
  kind: 'opendisease.influenza'
  api: OpenDiseaseApiMetadata
  query: ReturnType<typeof normalizeOpenDiseaseInfluenzaInput>
  source?: string | undefined
  updated?: number | undefined
  rows: OpenDiseaseInfluenzaRow[]
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

export async function getOpenDiseaseGlobal(input: OpenDiseaseGlobalInput = {}): Promise<OpenDiseaseGlobalResult> {
  const query = normalizeOpenDiseaseGlobalInput(input)
  const client = new OpenDiseaseClient()
  const stats = await client.global(query)
  return {
    kind: 'opendisease.global',
    api: createApiMetadata('GET /v3/covid-19/all'),
    query,
    stats,
  }
}

export async function getOpenDiseaseCountries(input: OpenDiseaseCountriesInput = {}): Promise<OpenDiseaseCountriesResult> {
  const query = normalizeOpenDiseaseCountriesInput(input)
  const client = new OpenDiseaseClient()
  const result = await client.countries(query)
  return {
    kind: 'opendisease.countries',
    api: createApiMetadata('GET /v3/covid-19/countries'),
    query,
    countries: result.countries,
    pagination: {
      returned: result.countries.length,
      total: result.total,
      limit: query.limit,
      maxLimit: OPEN_DISEASE_COUNTRIES_MAX_LIMIT,
      sort: query.sort,
    },
  }
}

export async function getOpenDiseaseInfluenza(input: OpenDiseaseInfluenzaInput = {}): Promise<OpenDiseaseInfluenzaResult> {
  const query = normalizeOpenDiseaseInfluenzaInput(input)
  const client = new OpenDiseaseClient()
  const result = await client.influenza(query)
  return {
    kind: 'opendisease.influenza',
    api: createApiMetadata('GET /v3/influenza/cdc/ILINet'),
    query,
    source: result.source,
    updated: result.updated,
    rows: result.rows,
    pagination: {
      returned: result.rows.length,
      limit: query.limit,
      maxLimit: OPEN_DISEASE_INFLUENZA_MAX_LIMIT,
    },
  }
}

function createApiMetadata(endpoint: string): OpenDiseaseApiMetadata {
  return {
    provider: 'opendisease',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://disease.sh/docs/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    rateLimit: 'No API key or public request quota is documented for selected disease.sh v3 endpoints.',
  }
}

export type { OpenDiseaseCountriesInput, OpenDiseaseGlobalInput, OpenDiseaseInfluenzaInput }
