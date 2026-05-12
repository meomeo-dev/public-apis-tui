import {
  FoodStandardsAgencyClient,
  FSA_MAX_AUTHORITY_LIMIT,
  FSA_MAX_ESTABLISHMENT_LIMIT,
  normalizeFoodStandardsAgencyAuthoritiesInput,
  normalizeFoodStandardsAgencyEstablishmentsInput,
  type FoodStandardsAgencyAuthority,
  type FoodStandardsAgencyAuthoritiesInput,
  type FoodStandardsAgencyEstablishment,
  type FoodStandardsAgencyEstablishmentsInput,
  type FoodStandardsAgencyMeta,
} from '../../infrastructure/openApis/foodStandardsAgencyClient.js'

type FoodStandardsAgencyApiMeta = {
  provider: 'foodstandardsagency'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  apiVersion: '2'
  limitPolicy: string
}

export type FoodStandardsAgencyAuthoritiesResult = {
  kind: 'foodstandardsagency.authorities'
  api: FoodStandardsAgencyApiMeta
  query: ReturnType<typeof normalizeFoodStandardsAgencyAuthoritiesInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  meta: FoodStandardsAgencyMeta
  authorities: FoodStandardsAgencyAuthority[]
}

export type FoodStandardsAgencyEstablishmentsResult = {
  kind: 'foodstandardsagency.establishments'
  api: FoodStandardsAgencyApiMeta
  query: ReturnType<typeof normalizeFoodStandardsAgencyEstablishmentsInput>
  count: number
  pagination: {
    returned: number
    totalCount?: number | undefined
    totalPages?: number | undefined
    pageSize: number
    maxPageSize: number
    pageNumber: number
  }
  meta: FoodStandardsAgencyMeta
  establishments: FoodStandardsAgencyEstablishment[]
}

const commonApiMeta = {
  provider: 'foodstandardsagency',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://api.ratings.food.gov.uk/help',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  apiVersion: '2',
  limitPolicy: 'The Food Hygiene Rating API honors pageSize up to 5000 and caps larger requests to 5000; CLI defaults/caps at 5000 to maximize one bounded request.',
} satisfies Omit<FoodStandardsAgencyApiMeta, 'endpoint'>

export async function listFoodStandardsAgencyAuthorities(input: FoodStandardsAgencyAuthoritiesInput = {}): Promise<FoodStandardsAgencyAuthoritiesResult> {
  const query = normalizeFoodStandardsAgencyAuthoritiesInput(input)
  const client = new FoodStandardsAgencyClient()
  const response = await client.listAuthorities(query)
  return {
    kind: 'foodstandardsagency.authorities',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /Authorities/basic',
    },
    query,
    count: response.authorities.length,
    pagination: {
      returned: response.authorities.length,
      limit: query.limit,
      maxLimit: FSA_MAX_AUTHORITY_LIMIT,
    },
    meta: response.meta,
    authorities: response.authorities,
  }
}

export async function searchFoodStandardsAgencyEstablishments(input: FoodStandardsAgencyEstablishmentsInput = {}): Promise<FoodStandardsAgencyEstablishmentsResult> {
  const query = normalizeFoodStandardsAgencyEstablishmentsInput(input)
  const client = new FoodStandardsAgencyClient()
  const response = await client.searchEstablishments(query)
  return {
    kind: 'foodstandardsagency.establishments',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /Establishments',
    },
    query,
    count: response.establishments.length,
    pagination: {
      returned: response.establishments.length,
      ...(response.meta.totalCount !== undefined ? { totalCount: response.meta.totalCount } : {}),
      ...(response.meta.totalPages !== undefined ? { totalPages: response.meta.totalPages } : {}),
      pageSize: response.meta.pageSize ?? query.pageSize,
      maxPageSize: FSA_MAX_ESTABLISHMENT_LIMIT,
      pageNumber: response.meta.pageNumber ?? query.pageNumber,
    },
    meta: response.meta,
    establishments: response.establishments,
  }
}
