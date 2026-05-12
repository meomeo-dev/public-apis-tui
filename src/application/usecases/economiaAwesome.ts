import {
  ECONOMIA_AWESOME_MAX_DAYS,
  ECONOMIA_AWESOME_MAX_PAIRS,
  EconomiaAwesomeClient,
  normalizeEconomiaAwesomeDailyInput,
  normalizeEconomiaAwesomeLatestInput,
  type EconomiaAwesomeDailyInput,
  type EconomiaAwesomeLatestInput,
  type EconomiaAwesomeQuote,
} from '../../infrastructure/openApis/economiaAwesomeClient.js'

type EconomiaAwesomeApiMetadata = {
  provider: 'economiaawesome'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
  cachePolicy: string
}

export type EconomiaAwesomeLatestResult = {
  kind: 'economiaawesome.latest'
  api: EconomiaAwesomeApiMetadata
  query: ReturnType<typeof normalizeEconomiaAwesomeLatestInput>
  quotes: EconomiaAwesomeQuote[]
  pagination: { returned: number; pairCount: number; maxPairs: number }
}

export type EconomiaAwesomeDailyResult = {
  kind: 'economiaawesome.daily'
  api: EconomiaAwesomeApiMetadata
  query: ReturnType<typeof normalizeEconomiaAwesomeDailyInput>
  pair: string
  quotes: EconomiaAwesomeQuote[]
  pagination: { returned: number; days: number; maxDays: number }
}

export async function getEconomiaAwesomeLatest(input: EconomiaAwesomeLatestInput = {}): Promise<EconomiaAwesomeLatestResult> {
  const query = normalizeEconomiaAwesomeLatestInput(input)
  const quotes = await new EconomiaAwesomeClient().latest(query)
  return {
    kind: 'economiaawesome.latest',
    api: createApiMetadata('GET /json/last/{pairs}', '5 minute public cache observed for latest quotes.'),
    query,
    quotes,
    pagination: { returned: quotes.length, pairCount: query.pairs.length, maxPairs: ECONOMIA_AWESOME_MAX_PAIRS },
  }
}

export async function getEconomiaAwesomeDaily(input: EconomiaAwesomeDailyInput = {}): Promise<EconomiaAwesomeDailyResult> {
  const query = normalizeEconomiaAwesomeDailyInput(input)
  const quotes = await new EconomiaAwesomeClient().daily(query)
  return {
    kind: 'economiaawesome.daily',
    api: createApiMetadata('GET /json/daily/{pair}/{days}', '15 minute public cache observed for daily quote arrays.'),
    query,
    pair: query.pair,
    quotes,
    pagination: { returned: quotes.length, days: query.days, maxDays: ECONOMIA_AWESOME_MAX_DAYS },
  }
}

function createApiMetadata(endpoint: string, cachePolicy: string): EconomiaAwesomeApiMetadata {
  return {
    provider: 'economiaawesome',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://docs.awesomeapi.com.br/api-de-moedas',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    rateLimit: 'Public docs advertise free cached currency API access with no rate limits for the selected no-auth endpoints.',
    cachePolicy,
  }
}

export type { EconomiaAwesomeDailyInput, EconomiaAwesomeLatestInput }
