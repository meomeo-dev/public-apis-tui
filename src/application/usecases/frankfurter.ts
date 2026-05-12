import {
  FrankfurterClient,
  FRANKFURTER_MAX_LIMIT,
  normalizeFrankfurterConvertInput,
  normalizeFrankfurterCurrenciesInput,
  normalizeFrankfurterRatesInput,
  type FrankfurterConvertInput,
  type FrankfurterCurrenciesInput,
  type FrankfurterCurrency,
  type FrankfurterRate,
  type FrankfurterRatesInput,
} from '../../infrastructure/openApis/frankfurterClient.js'

type FrankfurterApiMetadata = {
  provider: 'frankfurter'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
  cachePolicy: string
}

export type FrankfurterCurrenciesResult = {
  kind: 'frankfurter.currencies'
  api: FrankfurterApiMetadata
  query: ReturnType<typeof normalizeFrankfurterCurrenciesInput>
  currencies: FrankfurterCurrency[]
  pagination: { returned: number; limit: number; maxLimit: number; scope: string }
}

export type FrankfurterRatesResult = {
  kind: 'frankfurter.rates'
  api: FrankfurterApiMetadata
  query: ReturnType<typeof normalizeFrankfurterRatesInput>
  rates: FrankfurterRate[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export type FrankfurterConvertResult = {
  kind: 'frankfurter.convert'
  api: FrankfurterApiMetadata
  query: ReturnType<typeof normalizeFrankfurterConvertInput>
  conversion: FrankfurterRate & { amount: number; converted: number }
}

export async function listFrankfurterCurrencies(input: FrankfurterCurrenciesInput = {}): Promise<FrankfurterCurrenciesResult> {
  const query = normalizeFrankfurterCurrenciesInput(input)
  const currencies = await new FrankfurterClient().currencies(query)
  return {
    kind: 'frankfurter.currencies',
    api: createApiMetadata('GET /v2/currencies'),
    query,
    currencies,
    pagination: { returned: currencies.length, limit: query.limit, maxLimit: FRANKFURTER_MAX_LIMIT, scope: query.scope },
  }
}

export async function getFrankfurterRates(input: FrankfurterRatesInput = {}): Promise<FrankfurterRatesResult> {
  const query = normalizeFrankfurterRatesInput(input)
  const rates = await new FrankfurterClient().rates(query)
  return {
    kind: 'frankfurter.rates',
    api: createApiMetadata(query.date === '' ? 'GET /v2/rates' : 'GET /v2/rates?from={date}&to={date}'),
    query,
    rates,
    pagination: { returned: rates.length, limit: query.limit, maxLimit: FRANKFURTER_MAX_LIMIT },
  }
}

export async function convertFrankfurter(input: FrankfurterConvertInput = {}): Promise<FrankfurterConvertResult> {
  const query = normalizeFrankfurterConvertInput(input)
  const conversion = await new FrankfurterClient().convert(query)
  return {
    kind: 'frankfurter.convert',
    api: createApiMetadata(query.date === '' ? 'GET /v2/rate/{base}/{quote}' : 'GET /v2/rate/{base}/{quote}?date={date}'),
    query,
    conversion,
  }
}

function createApiMetadata(endpoint: string): FrankfurterApiMetadata {
  return {
    provider: 'frankfurter',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://www.frankfurter.app/docs',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    rateLimit: 'Frankfurter public docs do not require API keys for selected v2 routes; responses are publicly cacheable.',
    cachePolicy: 'Observed cache-control public max-age=86400.',
  }
}

export type { FrankfurterConvertInput, FrankfurterCurrenciesInput, FrankfurterRatesInput }
