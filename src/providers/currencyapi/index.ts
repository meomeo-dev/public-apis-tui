import { z } from 'zod'
import {
  getCurrencyApiRates,
  listCurrencyApiCurrencies,
  type CurrencyApiCurrenciesInput,
  type CurrencyApiRatesInput,
} from '../../application/usecases/currencyApi.js'
import {
  CURRENCY_API_DEFAULT_BASE,
  CURRENCY_API_DEFAULT_DATE,
  CURRENCY_API_DEFAULT_LIMIT,
  normalizeCurrencyApiCurrenciesInput,
  normalizeCurrencyApiRatesInput,
} from '../../infrastructure/openApis/currencyApiClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const currenciesParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<CurrencyApiCurrenciesInput>

const ratesParamsSchema = z.object({
  base: z.string().optional(),
  date: z.string().optional(),
  symbols: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<CurrencyApiRatesInput>

const currenciesOperation: PublicApiOperationDefinition<CurrencyApiCurrenciesInput> = {
  id: 'currencyapi.currencies',
  providerId: 'currencyapi',
  name: 'Currencies',
  commandPath: ['currencyapi', 'currencies'],
  rpcMethod: 'currencyapi.currencies',
  description: 'List Currency-api supported currency codes.',
  category: 'currency',
  options: [
    { name: 'search', flag: '--search <text>', description: 'Local code search, e.g. usd or btc', exposure: 'primary', group: 'filters', reason: 'Keeps the full no-auth list fetch while making terminal exploration focused.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Currencies to retain, default/cap ${CURRENCY_API_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Official docs describe 200+ currencies; default/cap preserves the full observed 301-code response in one request.', valueType: 'integer', defaultValue: String(CURRENCY_API_DEFAULT_LIMIT) },
  ],
  paramsSchema: currenciesParamsSchema,
  execute: params => listCurrencyApiCurrencies(params),
  normalizeParams: params => currenciesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCurrencyApiCurrenciesInput(params),
  resultKind: 'currencyapi.currencies',
  defaultFormat: 'text',
}

const ratesOperation: PublicApiOperationDefinition<CurrencyApiRatesInput> = {
  id: 'currencyapi.rates',
  providerId: 'currencyapi',
  name: 'Rates',
  commandPath: ['currencyapi', 'rates'],
  rpcMethod: 'currencyapi.rates',
  description: 'Read Currency-api exchange rates for one base currency.',
  category: 'currency',
  options: [
    { name: 'base', flag: '--base <code>', description: `Base currency code, default ${CURRENCY_API_DEFAULT_BASE}`, exposure: 'primary', group: 'filters', reason: 'Base code is the core selector for the rates endpoint.', defaultValue: CURRENCY_API_DEFAULT_BASE },
    { name: 'date', flag: '--date <latest|YYYY-MM-DD>', description: `Dataset date, default ${CURRENCY_API_DEFAULT_DATE}`, exposure: 'advanced', group: 'filters', reason: 'The upstream date path supports latest or a historical date; latest is the common terminal workflow.', defaultValue: CURRENCY_API_DEFAULT_DATE },
    { name: 'symbols', flag: '--symbols <codes>', description: 'Comma-separated local symbol filter, e.g. eur,jpy,btc', exposure: 'primary', group: 'filters', reason: 'Rates endpoint returns the full base map; local filtering keeps output readable without extra requests.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rates to retain, default/cap ${CURRENCY_API_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Default/cap preserves the full observed 301-rate response in one request.', valueType: 'integer', defaultValue: String(CURRENCY_API_DEFAULT_LIMIT) },
  ],
  paramsSchema: ratesParamsSchema,
  execute: params => getCurrencyApiRates(params),
  normalizeParams: params => ratesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCurrencyApiRatesInput(params),
  resultKind: 'currencyapi.rates',
  defaultFormat: 'text',
}

export const currencyApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'currencyapi',
    name: 'Currency-api',
    description: 'No-auth Currency-api exchange rates delivered through jsDelivr with Cloudflare Pages fallback.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://github.com/fawazahmed0/exchange-api#readme',
    docsUrl: 'https://github.com/fawazahmed0/exchange-api#readme',
    auth: { mode: 'none', notes: ['Documented endpoints require no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'crypto', 'metals', 'no-auth', 'json', 'cdn'],
    freePlanNotes: [
      'Official README says No Rate limits.',
      'The CLI implements the documented Cloudflare Pages fallback if jsDelivr fails.',
      'Defaults/caps preserve the full observed 301-entry list/rate maps in one request.',
    ],
  },
  operations: [currenciesOperation, ratesOperation],
  endpoints: [
    { id: 'currencyapi-jsdelivr-currencies', method: 'GET', urlPattern: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@*/v1/currencies.json', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://github.com/fawazahmed0/exchange-api#readme', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json'], consumedBy: ['currencyapi.currencies'], description: 'Currency-api supported currency codes via jsDelivr.', notes: ['No authentication required.'] },
    { id: 'currencyapi-jsdelivr-rates', method: 'GET', urlPattern: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@*/v1/currencies/*.json', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://github.com/fawazahmed0/exchange-api#readme', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'], consumedBy: ['currencyapi.rates'], description: 'Currency-api base-currency rate map via jsDelivr.', notes: ['No authentication required.'] },
    { id: 'currencyapi-cloudflare-fallback', method: 'GET', urlPattern: 'regex:^https://(?:latest|\\d{4}-\\d{2}-\\d{2})\\.currency-api\\.pages\\.dev/v1/currencies(?:/[^/?]+)?\\.json$', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://github.com/fawazahmed0/exchange-api#readme'], consumedBy: ['currencyapi.currencies', 'currencyapi.rates'], description: 'Currency-api documented Cloudflare Pages fallback route.', notes: ['Used only if jsDelivr primary request fails.'] },
  ],
}
