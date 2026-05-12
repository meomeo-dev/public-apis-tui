import {
  FIPE_MAX_LIMIT,
  FipeClient,
  normalizeFipeListInput,
  normalizeFipeModelsInput,
  normalizeFipePriceInput,
  normalizeFipeYearsInput,
  type FipeListInput,
  type FipeModelsInput,
  type FipeOption,
  type FipePrice,
  type FipePriceInput,
  type FipeRateLimit,
  type FipeYearsInput,
} from '../../infrastructure/openApis/fipeClient.js'

const docsUrl = 'https://deividfortuna.github.io/fipe/'

type FipeApiMeta = {
  provider: 'fipe'
  endpoint: string
  authentication: 'none'
  usesBrowserClickstream: false
  docsUrl: string
  rateLimitPolicy: string
  limitPolicy: string
}

export type FipeListResult = {
  kind: 'fipe.brands' | 'fipe.models' | 'fipe.years'
  api: FipeApiMeta
  query: ReturnType<typeof normalizeFipeListInput> | ReturnType<typeof normalizeFipeModelsInput> | ReturnType<typeof normalizeFipeYearsInput>
  items: FipeOption[]
  count: number
  totalItems: number
  rateLimit: FipeRateLimit
}

export type FipePriceResult = {
  kind: 'fipe.price'
  api: FipeApiMeta
  query: ReturnType<typeof normalizeFipePriceInput>
  price: FipePrice
  rateLimit: FipeRateLimit
}

export async function listFipeBrands(input: FipeListInput = {}): Promise<FipeListResult> {
  const query = normalizeFipeListInput(input)
  const response = await new FipeClient().brands(query)
  return createListResult('fipe.brands', `GET https://parallelum.com.br/fipe/api/v1/${query.vehicleType}/marcas`, query, response)
}

export async function listFipeModels(input: FipeModelsInput = {}): Promise<FipeListResult> {
  const query = normalizeFipeModelsInput(input)
  const response = await new FipeClient().models(query)
  return createListResult('fipe.models', `GET https://parallelum.com.br/fipe/api/v1/${query.vehicleType}/marcas/${query.brandCode}/modelos`, query, response)
}

export async function listFipeYears(input: FipeYearsInput = {}): Promise<FipeListResult> {
  const query = normalizeFipeYearsInput(input)
  const response = await new FipeClient().years(query)
  return createListResult('fipe.years', `GET https://parallelum.com.br/fipe/api/v1/${query.vehicleType}/marcas/${query.brandCode}/modelos/${query.modelCode}/anos`, query, response)
}

export async function getFipePrice(input: FipePriceInput = {}): Promise<FipePriceResult> {
  const query = normalizeFipePriceInput(input)
  const response = await new FipeClient().price(query)
  return {
    kind: 'fipe.price',
    api: createApiMeta(`GET https://parallelum.com.br/fipe/api/v1/${query.vehicleType}/marcas/${query.brandCode}/modelos/${query.modelCode}/anos/${query.yearCode}`),
    query,
    price: response.price,
    rateLimit: response.rateLimit,
  }
}

function createListResult(kind: FipeListResult['kind'], endpoint: string, query: FipeListResult['query'], response: { items: FipeOption[]; totalItems: number; rateLimit: FipeRateLimit }): FipeListResult {
  return {
    kind,
    api: createApiMeta(endpoint),
    query,
    items: response.items,
    count: response.items.length,
    totalItems: response.totalItems,
    rateLimit: response.rateLimit,
  }
}

function createApiMeta(endpoint: string): FipeApiMeta {
  return {
    provider: 'fipe',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docsUrl,
    rateLimitPolicy: 'Observed anonymous rate-limit headers report 500 requests/day.',
    limitPolicy: `List endpoints are unpaginated; CLI filters locally and caps terminal output at ${FIPE_MAX_LIMIT}.`,
  }
}

export type { FipeListInput, FipeModelsInput, FipePriceInput, FipeYearsInput }
