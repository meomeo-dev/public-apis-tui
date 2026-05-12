import { z } from 'zod'
import {
  convertFrankfurter,
  getFrankfurterRates,
  listFrankfurterCurrencies,
  type FrankfurterConvertInput,
  type FrankfurterCurrenciesInput,
  type FrankfurterRatesInput,
} from '../../application/usecases/frankfurter.js'
import {
  FRANKFURTER_DEFAULT_AMOUNT,
  FRANKFURTER_DEFAULT_BASE,
  FRANKFURTER_DEFAULT_LIMIT,
  FRANKFURTER_DEFAULT_QUOTE,
  FRANKFURTER_DEFAULT_SCOPE,
  normalizeFrankfurterConvertInput,
  normalizeFrankfurterCurrenciesInput,
  normalizeFrankfurterRatesInput,
} from '../../infrastructure/openApis/frankfurterClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const currenciesParamsSchema = z.object({
  scope: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<FrankfurterCurrenciesInput>

const ratesParamsSchema = z.object({
  base: z.string().optional(),
  quotes: z.string().optional(),
  date: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<FrankfurterRatesInput>

const convertParamsSchema = z.object({
  base: z.string().optional(),
  quote: z.string().optional(),
  amount: z.coerce.number().optional(),
  date: z.string().optional(),
}) satisfies z.ZodType<FrankfurterConvertInput>

const currenciesOperation: PublicApiOperationDefinition<FrankfurterCurrenciesInput> = {
  id: 'frankfurter.currencies',
  providerId: 'frankfurter',
  name: 'Currencies',
  commandPath: ['frankfurter', 'currencies'],
  rpcMethod: 'frankfurter.currencies',
  description: 'List Frankfurter active or legacy currencies.',
  category: 'currency',
  options: [
    { name: 'scope', flag: '--scope <active|all>', description: `Currency scope, default ${FRANKFURTER_DEFAULT_SCOPE}`, exposure: 'primary', group: 'filters', reason: 'The docs expose active/all; default all preserves the full 200-currency response in one request.', defaultValue: FRANKFURTER_DEFAULT_SCOPE },
    { name: 'search', flag: '--search <text>', description: 'Local code/name filter', exposure: 'primary', group: 'query', reason: 'Local search keeps the full no-auth currency list useful without extra requests.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Currencies to retain, default/cap ${FRANKFURTER_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Default/cap preserves the full observed all-currencies response in one request.', valueType: 'integer', defaultValue: String(FRANKFURTER_DEFAULT_LIMIT) },
  ],
  paramsSchema: currenciesParamsSchema,
  execute: params => listFrankfurterCurrencies(params),
  normalizeParams: params => currenciesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFrankfurterCurrenciesInput(params),
  resultKind: 'frankfurter.currencies',
  defaultFormat: 'text',
}

const ratesOperation: PublicApiOperationDefinition<FrankfurterRatesInput> = {
  id: 'frankfurter.rates',
  providerId: 'frankfurter',
  name: 'Rates',
  commandPath: ['frankfurter', 'rates'],
  rpcMethod: 'frankfurter.rates',
  description: 'Read Frankfurter latest or historical exchange rates.',
  category: 'currency',
  options: [
    { name: 'base', flag: '--base <code>', description: `Base currency, default ${FRANKFURTER_DEFAULT_BASE}`, exposure: 'primary', group: 'filters', reason: 'Base currency is the primary rates selector.', defaultValue: FRANKFURTER_DEFAULT_BASE },
    { name: 'quotes', flag: '--quotes <codes>', description: 'Comma-separated quote currency codes; omit for all active quotes', exposure: 'primary', group: 'filters', reason: 'Quotes are the upstream selector but omission intentionally fetches the full active set.', defaultValue: '' },
    { name: 'date', flag: '--date <YYYY-MM-DD>', description: 'Historical date, default latest', exposure: 'advanced', group: 'filters', reason: 'Historical snapshots are useful but secondary to latest rates.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rates to retain, default/cap ${FRANKFURTER_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Default/cap preserves the full observed active quote set in one request.', valueType: 'integer', defaultValue: String(FRANKFURTER_DEFAULT_LIMIT) },
  ],
  paramsSchema: ratesParamsSchema,
  execute: params => getFrankfurterRates(params),
  normalizeParams: params => ratesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFrankfurterRatesInput(params),
  resultKind: 'frankfurter.rates',
  defaultFormat: 'text',
}

const convertOperation: PublicApiOperationDefinition<FrankfurterConvertInput> = {
  id: 'frankfurter.convert',
  providerId: 'frankfurter',
  name: 'Convert',
  commandPath: ['frankfurter', 'convert'],
  rpcMethod: 'frankfurter.convert',
  description: 'Convert an amount using a Frankfurter exchange rate.',
  category: 'currency',
  options: [
    { name: 'base', flag: '--base <code>', description: `Base currency, default ${FRANKFURTER_DEFAULT_BASE}`, exposure: 'primary', group: 'filters', reason: 'Base currency is required for a conversion pair.', defaultValue: FRANKFURTER_DEFAULT_BASE },
    { name: 'quote', flag: '--quote <code>', description: `Quote currency, default ${FRANKFURTER_DEFAULT_QUOTE}`, exposure: 'primary', group: 'filters', reason: 'Quote currency is required for a conversion pair.', defaultValue: FRANKFURTER_DEFAULT_QUOTE },
    { name: 'amount', flag: '--amount <number>', description: `Amount to convert, default ${FRANKFURTER_DEFAULT_AMOUNT}`, exposure: 'primary', group: 'content', reason: 'Local multiplication turns a single quote into a terminal-ready conversion result.', defaultValue: String(FRANKFURTER_DEFAULT_AMOUNT) },
    { name: 'date', flag: '--date <YYYY-MM-DD>', description: 'Historical date, default latest', exposure: 'advanced', group: 'filters', reason: 'Historical conversion is useful but secondary to current conversion.', defaultValue: '' },
  ],
  paramsSchema: convertParamsSchema,
  execute: params => convertFrankfurter(params),
  normalizeParams: params => convertParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFrankfurterConvertInput(params),
  resultKind: 'frankfurter.convert',
  defaultFormat: 'text',
}

export const frankfurterProvider: PublicApiProviderModule = {
  manifest: {
    id: 'frankfurter',
    name: 'Frankfurter',
    description: 'No-auth Frankfurter exchange-rate and currency reference API.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://www.frankfurter.app/',
    docsUrl: 'https://www.frankfurter.app/docs',
    auth: { mode: 'none', notes: ['Selected v2 JSON routes require no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'conversion', 'no-auth', 'json'],
    freePlanNotes: [
      'Docs and live probes show no API key requirement for selected v2 routes.',
      'Responses are publicly cacheable; live probes observed cache-control public max-age=86400.',
      'Currencies and rates default/cap 200 to preserve the full observed response in one request.',
    ],
  },
  operations: [currenciesOperation, ratesOperation, convertOperation],
  endpoints: [
    { id: 'frankfurter-v2-currencies', method: 'GET', urlPattern: 'https://api.frankfurter.dev/v2/currencies*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.frankfurter.app/docs', 'https://api.frankfurter.dev/v2/currencies?scope=all'], consumedBy: ['frankfurter.currencies'], description: 'Frankfurter v2 active/all currency list.', notes: ['No authentication required.'] },
    { id: 'frankfurter-v2-rates', method: 'GET', urlPattern: 'https://api.frankfurter.dev/v2/rates*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.frankfurter.app/docs', 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,GBP'], consumedBy: ['frankfurter.rates'], description: 'Frankfurter latest or historical rates array.', notes: ['No authentication required.', 'Historical snapshots use from/to query parameters with the same date.'] },
    { id: 'frankfurter-v2-rate-pair', method: 'GET', urlPattern: 'https://api.frankfurter.dev/v2/rate/*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.frankfurter.app/docs', 'https://api.frankfurter.dev/v2/rate/USD/EUR'], consumedBy: ['frankfurter.convert'], description: 'Frankfurter single pair rate used for local amount conversion.', notes: ['No authentication required.', 'Conversion amount is multiplied locally from the returned rate.'] },
  ],
}
