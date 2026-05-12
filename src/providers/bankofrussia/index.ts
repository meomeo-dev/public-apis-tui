import { z } from 'zod'
import {
  getBankOfRussiaHistory,
  getBankOfRussiaRates,
  type BankOfRussiaHistoryInput,
  type BankOfRussiaRatesInput,
} from '../../application/usecases/bankOfRussia.js'
import {
  BANK_OF_RUSSIA_DEFAULT_CODE,
  BANK_OF_RUSSIA_HISTORY_DEFAULT_LIMIT,
  BANK_OF_RUSSIA_RATES_DEFAULT_LIMIT,
  normalizeBankOfRussiaHistoryInput,
  normalizeBankOfRussiaRatesInput,
} from '../../infrastructure/openApis/bankOfRussiaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ratesParamsSchema = z.object({
  date: z.string().optional(),
  code: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<BankOfRussiaRatesInput>

const historyParamsSchema = z.object({
  code: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<BankOfRussiaHistoryInput>

const ratesOperation: PublicApiOperationDefinition<BankOfRussiaRatesInput> = {
  id: 'bankofrussia.rates',
  providerId: 'bankofrussia',
  name: 'Daily Exchange Rates',
  commandPath: ['bankofrussia', 'rates'],
  rpcMethod: 'bankofrussia.rates',
  description: 'Read Bank of Russia daily foreign exchange rates.',
  category: 'currency',
  options: [
    { name: 'date', flag: '--date <YYYY-MM-DD>', description: 'Daily rate date, default latest available', exposure: 'advanced', group: 'filters', reason: 'The upstream date_req parameter is useful for historical daily snapshots but not required for the common latest view.', defaultValue: '' },
    { name: 'code', flag: '--code <ISO>', description: 'Optional three-letter currency code filter, e.g. USD', exposure: 'primary', group: 'filters', reason: 'Currency code is the key terminal exploration filter while preserving the full-list default.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rates to retain, default/cap ${BANK_OF_RUSSIA_RATES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The daily XML feed returns a finite list; default/cap preserves the full observed response in one request.', valueType: 'integer', defaultValue: String(BANK_OF_RUSSIA_RATES_DEFAULT_LIMIT) },
  ],
  paramsSchema: ratesParamsSchema,
  execute: params => getBankOfRussiaRates(params),
  normalizeParams: params => ratesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBankOfRussiaRatesInput(params),
  resultKind: 'bankofrussia.rates',
  defaultFormat: 'text',
}

const historyOperation: PublicApiOperationDefinition<BankOfRussiaHistoryInput> = {
  id: 'bankofrussia.history',
  providerId: 'bankofrussia',
  name: 'Exchange Rate History',
  commandPath: ['bankofrussia', 'history'],
  rpcMethod: 'bankofrussia.history',
  description: 'Read Bank of Russia exchange-rate dynamics for one currency.',
  category: 'currency',
  options: [
    { name: 'code', flag: '--code <ISO>', description: `Three-letter currency code, default ${BANK_OF_RUSSIA_DEFAULT_CODE}`, exposure: 'primary', group: 'filters', reason: 'The XML_dynamic endpoint requires the Bank of Russia currency id; CLI resolves it from a familiar ISO code.', defaultValue: BANK_OF_RUSSIA_DEFAULT_CODE },
    { name: 'from', flag: '--from <YYYY-MM-DD>', description: 'Start date, default 30 days before today', exposure: 'primary', group: 'filters', reason: 'Date range is the core selector for the dynamics endpoint.', defaultValue: '' },
    { name: 'to', flag: '--to <YYYY-MM-DD>', description: 'End date, default today', exposure: 'primary', group: 'filters', reason: 'Date range is the core selector for the dynamics endpoint.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rows to retain, default/cap ${BANK_OF_RUSSIA_HISTORY_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The endpoint has no page-size parameter; local cap keeps long date ranges readable and cacheable.', valueType: 'integer', defaultValue: String(BANK_OF_RUSSIA_HISTORY_DEFAULT_LIMIT) },
  ],
  paramsSchema: historyParamsSchema,
  execute: params => getBankOfRussiaHistory(params),
  normalizeParams: params => historyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBankOfRussiaHistoryInput(params),
  resultKind: 'bankofrussia.history',
  defaultFormat: 'text',
}

export const bankOfRussiaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'bankofrussia',
    name: 'Bank of Russia',
    description: 'Central Bank of Russia no-auth XML exchange-rate API projected to JSON.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://www.cbr.ru/development/SXML/',
    docsUrl: 'https://www.cbr.ru/development/SXML/',
    auth: { mode: 'none', notes: ['Selected XML endpoints require no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'central-bank', 'russia', 'xml', 'no-auth'],
    freePlanNotes: [
      'No API key or public request quota is documented for selected XML endpoints.',
      'Daily rates default/cap preserves the full observed 54-currency XML response.',
      'History resolves ISO currency codes through the daily XML feed before calling XML_dynamic.asp.',
    ],
  },
  operations: [ratesOperation, historyOperation],
  endpoints: [
    { id: 'bankofrussia-xml-daily', method: 'GET', urlPattern: 'https://www.cbr.ru/scripts/XML_daily.asp*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.cbr.ru/development/SXML/', 'https://www.cbr.ru/scripts/XML_daily.asp'], consumedBy: ['bankofrussia.rates', 'bankofrussia.history'], description: 'Bank of Russia daily XML exchange rates and currency ids.', notes: ['No authentication required.', 'XML response declares windows-1251 and is projected to JSON by the CLI.'] },
    { id: 'bankofrussia-xml-dynamic', method: 'GET', urlPattern: 'https://www.cbr.ru/scripts/XML_dynamic.asp*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://www.cbr.ru/development/SXML/', 'https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=01/05/2026&date_req2=05/05/2026&VAL_NM_RQ=R01235'], consumedBy: ['bankofrussia.history'], description: 'Bank of Russia XML exchange-rate dynamics for one currency id and date range.', notes: ['No authentication required.', 'Requires date_req1, date_req2, and VAL_NM_RQ query parameters.'] },
  ],
}
