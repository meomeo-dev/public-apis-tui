import { z } from 'zod'
import { getNbpHistory, getNbpTable, type NbpHistoryInput, type NbpTableInput } from '../../application/usecases/nbp.js'
import {
  NBP_DEFAULT_CODE,
  NBP_DEFAULT_TABLE,
  NBP_HISTORY_DEFAULT_COUNT,
  NBP_TABLES_DEFAULT_LIMIT,
  normalizeNbpHistoryInput,
  normalizeNbpTableInput,
} from '../../infrastructure/openApis/nbpClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const tableParamsSchema = z.object({
  table: z.string().optional(),
  code: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<NbpTableInput>

const historyParamsSchema = z.object({
  table: z.string().optional(),
  code: z.string().optional(),
  count: z.coerce.number().int().optional(),
}) satisfies z.ZodType<NbpHistoryInput>

const tablesOperation: PublicApiOperationDefinition<NbpTableInput> = {
  id: 'nbp.tables',
  providerId: 'nbp',
  name: 'Exchange Rate Tables',
  commandPath: ['nbp', 'tables'],
  rpcMethod: 'nbp.tables',
  description: 'Read the latest National Bank of Poland exchange-rate table.',
  category: 'currency',
  options: [
    { name: 'table', flag: '--table <A|B|C>', description: `NBP table, default ${NBP_DEFAULT_TABLE}`, exposure: 'primary', group: 'filters', reason: 'The table is the primary selector: A/B provide average rates and C provides buy/sell rates.', defaultValue: NBP_DEFAULT_TABLE },
    { name: 'code', flag: '--code <ISO>', description: 'Optional currency code filter, e.g. USD', exposure: 'primary', group: 'filters', reason: 'Currency code is the core terminal exploration filter while preserving full-table default.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rows to retain, default/cap ${NBP_TABLES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The largest observed table has 116 rows; cap 120 preserves the full current response in one request.', valueType: 'integer', defaultValue: String(NBP_TABLES_DEFAULT_LIMIT) },
  ],
  paramsSchema: tableParamsSchema,
  execute: params => getNbpTable(params),
  normalizeParams: params => tableParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNbpTableInput(params),
  resultKind: 'nbp.tables',
  defaultFormat: 'text',
}

const historyOperation: PublicApiOperationDefinition<NbpHistoryInput> = {
  id: 'nbp.history',
  providerId: 'nbp',
  name: 'Exchange Rate History',
  commandPath: ['nbp', 'history'],
  rpcMethod: 'nbp.history',
  description: 'Read recent National Bank of Poland exchange-rate history for one currency.',
  category: 'currency',
  options: [
    { name: 'table', flag: '--table <A|B|C>', description: `NBP table, default ${NBP_DEFAULT_TABLE}`, exposure: 'advanced', group: 'filters', reason: 'Most users need table A; B/C remain available when users know NBP table semantics.', defaultValue: NBP_DEFAULT_TABLE },
    { name: 'code', flag: '--code <ISO>', description: `Currency code, default ${NBP_DEFAULT_CODE}`, exposure: 'primary', group: 'filters', reason: 'Currency code is required by the history endpoint and is the primary historical series selector.', defaultValue: NBP_DEFAULT_CODE },
    { name: 'count', flag: '--count <count>', description: `Recent quotations to request, default/cap ${NBP_HISTORY_DEFAULT_COUNT}`, exposure: 'primary', group: 'pagination', reason: 'NBP docs limit single historical windows to 93 days; default/cap maximizes one request.', valueType: 'integer', defaultValue: String(NBP_HISTORY_DEFAULT_COUNT) },
  ],
  paramsSchema: historyParamsSchema,
  execute: params => getNbpHistory(params),
  normalizeParams: params => historyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNbpHistoryInput(params),
  resultKind: 'nbp.history',
  defaultFormat: 'text',
}

export const nbpProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nbp',
    name: 'National Bank of Poland',
    description: 'No-auth National Bank of Poland exchange-rate JSON API.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://api.nbp.pl/en.html',
    docsUrl: 'https://api.nbp.pl/en.html',
    auth: { mode: 'none', notes: ['Selected JSON endpoints require no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'central-bank', 'poland', 'no-auth', 'json'],
    freePlanNotes: [
      'NBP documents JSON/XML HTTP GET endpoints under https://api.nbp.pl/api/.',
      'Single historical queries cannot cover more than 93 days, so history defaults/caps at 93 recent quotations.',
      'Latest table cap 120 preserves the full observed B table response in one request.',
    ],
  },
  operations: [tablesOperation, historyOperation],
  endpoints: [
    { id: 'nbp-exchange-rate-tables', method: 'GET', urlPattern: 'https://api.nbp.pl/api/exchangerates/tables/*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.nbp.pl/en.html', 'https://api.nbp.pl/api/exchangerates/tables/a/?format=json'], consumedBy: ['nbp.tables'], description: 'Latest complete NBP exchange-rate table A, B, or C as JSON.', notes: ['No authentication required.'] },
    { id: 'nbp-exchange-rate-history', method: 'GET', urlPattern: 'https://api.nbp.pl/api/exchangerates/rates/*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.nbp.pl/en.html', 'https://api.nbp.pl/api/exchangerates/rates/a/usd/last/93/?format=json'], consumedBy: ['nbp.history'], description: 'Recent NBP exchange-rate history for one table/code pair as JSON.', notes: ['No authentication required.', 'CLI caps count at 93 to match the documented single-query window.'] },
  ],
}
