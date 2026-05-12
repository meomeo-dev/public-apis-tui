import { z } from 'zod'
import {
  getEconomiaAwesomeDaily,
  getEconomiaAwesomeLatest,
  type EconomiaAwesomeDailyInput,
  type EconomiaAwesomeLatestInput,
} from '../../application/usecases/economiaAwesome.js'
import {
  ECONOMIA_AWESOME_DEFAULT_DAYS,
  ECONOMIA_AWESOME_DEFAULT_PAIR,
  ECONOMIA_AWESOME_DEFAULT_PAIRS,
  normalizeEconomiaAwesomeDailyInput,
  normalizeEconomiaAwesomeLatestInput,
} from '../../infrastructure/openApis/economiaAwesomeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const latestParamsSchema = z.object({
  pairs: z.string().optional(),
}) satisfies z.ZodType<EconomiaAwesomeLatestInput>

const dailyParamsSchema = z.object({
  pair: z.string().optional(),
  days: z.coerce.number().int().optional(),
}) satisfies z.ZodType<EconomiaAwesomeDailyInput>

const latestOperation: PublicApiOperationDefinition<EconomiaAwesomeLatestInput> = {
  id: 'economiaawesome.latest',
  providerId: 'economiaawesome',
  name: 'Latest Quotes',
  commandPath: ['economiaawesome', 'latest'],
  rpcMethod: 'economiaawesome.latest',
  description: 'Read latest Economia.Awesome currency quotes for selected pairs.',
  category: 'currency',
  options: [
    { name: 'pairs', flag: '--pairs <pairs>', description: `Comma-separated BASE-QUOTE pairs, default ${ECONOMIA_AWESOME_DEFAULT_PAIRS}`, exposure: 'primary', group: 'filters', reason: 'Pairs are the upstream route selector and the primary currency terminal workflow.', defaultValue: ECONOMIA_AWESOME_DEFAULT_PAIRS },
  ],
  paramsSchema: latestParamsSchema,
  execute: params => getEconomiaAwesomeLatest(params),
  normalizeParams: params => latestParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEconomiaAwesomeLatestInput(params),
  resultKind: 'economiaawesome.latest',
  defaultFormat: 'text',
}

const dailyOperation: PublicApiOperationDefinition<EconomiaAwesomeDailyInput> = {
  id: 'economiaawesome.daily',
  providerId: 'economiaawesome',
  name: 'Daily Quote History',
  commandPath: ['economiaawesome', 'daily'],
  rpcMethod: 'economiaawesome.daily',
  description: 'Read Economia.Awesome daily quote history for one currency pair.',
  category: 'currency',
  options: [
    { name: 'pair', flag: '--pair <BASE-QUOTE>', description: `Currency pair, default ${ECONOMIA_AWESOME_DEFAULT_PAIR}`, exposure: 'primary', group: 'filters', reason: 'The daily route accepts one pair and it is the key historical series selector.', defaultValue: ECONOMIA_AWESOME_DEFAULT_PAIR },
    { name: 'days', flag: '--days <count>', description: `Daily rows to request, default/cap ${ECONOMIA_AWESOME_DEFAULT_DAYS}`, exposure: 'primary', group: 'pagination', reason: 'Docs and live endpoint support up to 360 daily records; defaulting to the max conserves repeat requests.', valueType: 'integer', defaultValue: String(ECONOMIA_AWESOME_DEFAULT_DAYS) },
  ],
  paramsSchema: dailyParamsSchema,
  execute: params => getEconomiaAwesomeDaily(params),
  normalizeParams: params => dailyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeEconomiaAwesomeDailyInput(params),
  resultKind: 'economiaawesome.daily',
  defaultFormat: 'text',
}

export const economiaAwesomeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'economiaawesome',
    name: 'Economia.Awesome',
    description: 'AwesomeAPI Economia no-auth Brazilian currency quote API.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://docs.awesomeapi.com.br/api-de-moedas',
    docsUrl: 'https://docs.awesomeapi.com.br/api-de-moedas',
    auth: { mode: 'none', notes: ['Selected cached JSON currency endpoints require no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'brazil', 'forex', 'crypto', 'no-auth', 'json'],
    freePlanNotes: [
      'Public docs advertise free cached currency endpoints without rate limits.',
      'Paid API-key headers are intentionally not used by this no-auth provider.',
      'Daily history defaults/caps at 360 rows to preserve the maximum documented daily response in one request.',
    ],
  },
  operations: [latestOperation, dailyOperation],
  endpoints: [
    { id: 'economiaawesome-latest', method: 'GET', urlPattern: 'https://economia.awesomeapi.com.br/json/last/*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://docs.awesomeapi.com.br/api-de-moedas', 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL'], consumedBy: ['economiaawesome.latest'], description: 'Latest cached exchange-rate quotes for one or more BASE-QUOTE pairs.', notes: ['No authentication required for selected cached route.'] },
    { id: 'economiaawesome-daily', method: 'GET', urlPattern: 'https://economia.awesomeapi.com.br/json/daily/*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://docs.awesomeapi.com.br/api-de-moedas', 'https://economia.awesomeapi.com.br/json/daily/USD-BRL/360'], consumedBy: ['economiaawesome.daily'], description: 'Daily exchange-rate history for one BASE-QUOTE pair.', notes: ['No authentication required for selected cached route.', 'CLI caps days at 360 to match the documented daily maximum.'] },
  ],
}
