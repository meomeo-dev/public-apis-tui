import {
  CurrencyApiClient,
  CURRENCY_API_MAX_LIMIT,
  normalizeCurrencyApiCurrenciesInput,
  normalizeCurrencyApiRatesInput,
  type CurrencyApiCurrenciesInput,
  type CurrencyApiCurrency,
  type CurrencyApiRate,
  type CurrencyApiRatesInput,
} from '../../infrastructure/openApis/currencyApiClient.js'

type CurrencyApiMetadata = {
  provider: 'currencyapi'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON via jsDelivr with Cloudflare Pages fallback'
  rateLimit: string
}

export type CurrencyApiCurrenciesResult = {
  kind: 'currencyapi.currencies'
  api: CurrencyApiMetadata
  query: ReturnType<typeof normalizeCurrencyApiCurrenciesInput>
  currencies: CurrencyApiCurrency[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export type CurrencyApiRatesResult = {
  kind: 'currencyapi.rates'
  api: CurrencyApiMetadata
  query: ReturnType<typeof normalizeCurrencyApiRatesInput>
  date?: string | undefined
  base: string
  rates: CurrencyApiRate[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export async function listCurrencyApiCurrencies(input: CurrencyApiCurrenciesInput = {}): Promise<CurrencyApiCurrenciesResult> {
  const query = normalizeCurrencyApiCurrenciesInput(input)
  const currencies = await new CurrencyApiClient().currencies(query)
  return {
    kind: 'currencyapi.currencies',
    api: createApiMetadata('GET /v1/currencies.json'),
    query,
    currencies,
    pagination: { returned: currencies.length, limit: query.limit, maxLimit: CURRENCY_API_MAX_LIMIT },
  }
}

export async function getCurrencyApiRates(input: CurrencyApiRatesInput = {}): Promise<CurrencyApiRatesResult> {
  const query = normalizeCurrencyApiRatesInput(input)
  const result = await new CurrencyApiClient().rates(query)
  return {
    kind: 'currencyapi.rates',
    api: createApiMetadata('GET /v1/currencies/{base}.json'),
    query,
    date: result.date,
    base: result.base,
    rates: result.rates,
    pagination: { returned: result.rates.length, limit: query.limit, maxLimit: CURRENCY_API_MAX_LIMIT },
  }
}

function createApiMetadata(endpoint: string): CurrencyApiMetadata {
  return {
    provider: 'currencyapi',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://github.com/fawazahmed0/exchange-api#readme',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON via jsDelivr with Cloudflare Pages fallback',
    rateLimit: 'Official README says No Rate limits.',
  }
}

export type { CurrencyApiCurrenciesInput, CurrencyApiRatesInput }
