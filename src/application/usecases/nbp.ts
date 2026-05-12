import {
  NbpClient,
  NBP_HISTORY_MAX_COUNT,
  NBP_TABLES_MAX_LIMIT,
  normalizeNbpHistoryInput,
  normalizeNbpTableInput,
  type NbpHistoryInput,
  type NbpRate,
  type NbpTableInput,
} from '../../infrastructure/openApis/nbpClient.js'

type NbpApiMetadata = {
  provider: 'nbp'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
  windowLimit: string
}

export type NbpTableResult = {
  kind: 'nbp.tables'
  api: NbpApiMetadata
  query: ReturnType<typeof normalizeNbpTableInput>
  table: string
  no?: string | undefined
  tradingDate?: string | undefined
  effectiveDate?: string | undefined
  rates: NbpRate[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export type NbpHistoryResult = {
  kind: 'nbp.history'
  api: NbpApiMetadata
  query: ReturnType<typeof normalizeNbpHistoryInput>
  table: string
  currency?: string | undefined
  code: string
  rates: NbpRate[]
  pagination: { returned: number; count: number; maxCount: number }
}

export async function getNbpTable(input: NbpTableInput = {}): Promise<NbpTableResult> {
  const query = normalizeNbpTableInput(input)
  const table = await new NbpClient().table(query)
  return {
    kind: 'nbp.tables',
    api: createApiMetadata('GET /api/exchangerates/tables/{table}/'),
    query,
    table: table.table,
    no: table.no,
    tradingDate: table.tradingDate,
    effectiveDate: table.effectiveDate,
    rates: table.rates,
    pagination: { returned: table.rates.length, limit: query.limit, maxLimit: NBP_TABLES_MAX_LIMIT },
  }
}

export async function getNbpHistory(input: NbpHistoryInput = {}): Promise<NbpHistoryResult> {
  const query = normalizeNbpHistoryInput(input)
  const history = await new NbpClient().history(query)
  return {
    kind: 'nbp.history',
    api: createApiMetadata('GET /api/exchangerates/rates/{table}/{code}/last/{count}/'),
    query,
    table: history.table,
    currency: history.currency,
    code: history.code,
    rates: history.rates,
    pagination: { returned: history.rates.length, count: query.count, maxCount: NBP_HISTORY_MAX_COUNT },
  }
}

function createApiMetadata(endpoint: string): NbpApiMetadata {
  return {
    provider: 'nbp',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://api.nbp.pl/en.html',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    rateLimit: 'No API key, OAuth, account, or public request quota is documented for selected NBP JSON endpoints.',
    windowLimit: 'NBP docs state one historical query cannot cover a period longer than 93 days; CLI count is capped at 93.',
  }
}

export type { NbpHistoryInput, NbpTableInput }
