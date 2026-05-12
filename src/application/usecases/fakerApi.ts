import {
  FakerApiClient,
  normalizeFakerApiCommonInput,
  type FakerApiCommonInput,
  type FakerApiCompany,
  type FakerApiPerson,
  type FakerApiRateLimit,
} from '../../infrastructure/openApis/fakerApiClient.js'

export type FakerApiPersonsResult = {
  kind: 'fakerapi.persons'
  api: FakerApiMeta
  query: ReturnType<typeof normalizeFakerApiCommonInput>
  pagination: {
    returned: number
    total: number
    limit: number
  }
  rateLimit: FakerApiRateLimit
  persons: FakerApiPerson[]
}

export type FakerApiCompaniesResult = {
  kind: 'fakerapi.companies'
  api: FakerApiMeta
  query: ReturnType<typeof normalizeFakerApiCommonInput>
  pagination: {
    returned: number
    total: number
    limit: number
  }
  rateLimit: FakerApiRateLimit
  companies: FakerApiCompany[]
}

type FakerApiMeta = {
  provider: 'fakerapi'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
}

const commonApiMeta = {
  provider: 'fakerapi',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://fakerapi.it/en',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
} satisfies Omit<FakerApiMeta, 'endpoint'>

export async function listFakerApiPersons(input: FakerApiCommonInput = {}): Promise<FakerApiPersonsResult> {
  const query = normalizeFakerApiCommonInput(input)
  const client = new FakerApiClient()
  const response = await client.listPersons(query)
  return {
    kind: 'fakerapi.persons',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/v2/persons',
    },
    query,
    pagination: {
      returned: response.data.length,
      total: response.total,
      limit: query.quantity,
    },
    rateLimit: response.rateLimit,
    persons: response.data,
  }
}

export async function listFakerApiCompanies(input: FakerApiCommonInput = {}): Promise<FakerApiCompaniesResult> {
  const query = normalizeFakerApiCommonInput(input)
  const client = new FakerApiClient()
  const response = await client.listCompanies(query)
  return {
    kind: 'fakerapi.companies',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/v2/companies',
    },
    query,
    pagination: {
      returned: response.data.length,
      total: response.total,
      limit: query.quantity,
    },
    rateLimit: response.rateLimit,
    companies: response.data,
  }
}
