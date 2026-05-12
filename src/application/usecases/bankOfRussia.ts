import {
  BankOfRussiaClient,
  BANK_OF_RUSSIA_HISTORY_MAX_LIMIT,
  BANK_OF_RUSSIA_RATES_MAX_LIMIT,
  normalizeBankOfRussiaHistoryInput,
  normalizeBankOfRussiaRatesInput,
  type BankOfRussiaHistoryInput,
  type BankOfRussiaHistoryRecord,
  type BankOfRussiaRate,
  type BankOfRussiaRatesInput,
} from '../../infrastructure/openApis/bankOfRussiaClient.js'

type BankOfRussiaApiMetadata = {
  provider: 'bankofrussia'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS XML REST projected to JSON'
  rateLimit: string
}

export type BankOfRussiaRatesResult = {
  kind: 'bankofrussia.rates'
  api: BankOfRussiaApiMetadata
  query: ReturnType<typeof normalizeBankOfRussiaRatesInput>
  date?: string | undefined
  name?: string | undefined
  rates: BankOfRussiaRate[]
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

export type BankOfRussiaHistoryResult = {
  kind: 'bankofrussia.history'
  api: BankOfRussiaApiMetadata
  query: ReturnType<typeof normalizeBankOfRussiaHistoryInput>
  id: string
  code: string
  from?: string | undefined
  to?: string | undefined
  records: BankOfRussiaHistoryRecord[]
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

export async function getBankOfRussiaRates(input: BankOfRussiaRatesInput = {}): Promise<BankOfRussiaRatesResult> {
  const query = normalizeBankOfRussiaRatesInput(input)
  const client = new BankOfRussiaClient()
  const result = await client.rates(query)
  return {
    kind: 'bankofrussia.rates',
    api: createApiMetadata('GET /scripts/XML_daily.asp'),
    query,
    date: result.date,
    name: result.name,
    rates: result.rates,
    pagination: {
      returned: result.rates.length,
      limit: query.limit,
      maxLimit: BANK_OF_RUSSIA_RATES_MAX_LIMIT,
    },
  }
}

export async function getBankOfRussiaHistory(input: BankOfRussiaHistoryInput = {}): Promise<BankOfRussiaHistoryResult> {
  const query = normalizeBankOfRussiaHistoryInput(input)
  const client = new BankOfRussiaClient()
  const result = await client.history(query)
  return {
    kind: 'bankofrussia.history',
    api: createApiMetadata('GET /scripts/XML_dynamic.asp'),
    query,
    id: result.id,
    code: result.code,
    from: result.from,
    to: result.to,
    records: result.records,
    pagination: {
      returned: result.records.length,
      limit: query.limit,
      maxLimit: BANK_OF_RUSSIA_HISTORY_MAX_LIMIT,
    },
  }
}

function createApiMetadata(endpoint: string): BankOfRussiaApiMetadata {
  return {
    provider: 'bankofrussia',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://www.cbr.ru/development/SXML/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS XML REST projected to JSON',
    rateLimit: 'No API key or public request quota is documented for selected Bank of Russia XML endpoints.',
  }
}

export type { BankOfRussiaHistoryInput, BankOfRussiaRatesInput }
