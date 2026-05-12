import {
  BNM_MAX_LIMIT,
  BankNegaraMalaysiaClient,
  normalizeBnmExchangeRatesInput,
  type BnmExchangeRatesInput,
  type BnmExchangeRate,
  type BnmKijangEmas,
  type BnmMeta,
  type BnmOpr,
} from '../../infrastructure/openApis/bankNegaraMalaysiaClient.js'

type BnmApiMeta = {
  provider: 'banknegaramalaysia'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  acceptHeader: string
}

type BnmPagination = {
  returned: number
  limit: number
  maxLimit: number
  total?: number | undefined
}

export type BnmOprResult = {
  kind: 'banknegaramalaysia.opr'
  api: BnmApiMeta
  query: Record<string, never>
  count: 1
  meta: BnmMeta
  opr: BnmOpr
}

export type BnmExchangeRatesResult = {
  kind: 'banknegaramalaysia.exchangeRates'
  api: BnmApiMeta
  query: ReturnType<typeof normalizeBnmExchangeRatesInput>
  count: number
  pagination: BnmPagination
  meta: BnmMeta
  rates: BnmExchangeRate[]
}

export type BnmKijangEmasResult = {
  kind: 'banknegaramalaysia.kijangEmas'
  api: BnmApiMeta
  query: Record<string, never>
  count: 1
  meta: BnmMeta
  kijangEmas: BnmKijangEmas
}

export async function getBnmOpr(): Promise<BnmOprResult> {
  const client = new BankNegaraMalaysiaClient()
  const response = await client.getOpr()
  return {
    kind: 'banknegaramalaysia.opr',
    api: createApiMeta('GET /public/opr'),
    query: {},
    count: 1,
    meta: response.meta,
    opr: response.data,
  }
}

export async function getBnmExchangeRates(input: BnmExchangeRatesInput = {}): Promise<BnmExchangeRatesResult> {
  const query = normalizeBnmExchangeRatesInput(input)
  const client = new BankNegaraMalaysiaClient()
  const response = await client.getExchangeRates(query)
  return {
    kind: 'banknegaramalaysia.exchangeRates',
    api: createApiMeta(query.currencyCode === undefined ? 'GET /public/exchange-rate' : 'GET /public/exchange-rate/{currencyCode}'),
    query,
    count: response.data.length,
    pagination: {
      returned: response.data.length,
      limit: query.limit,
      maxLimit: BNM_MAX_LIMIT,
      ...(response.meta.totalResult !== undefined ? { total: response.meta.totalResult } : {}),
    },
    meta: response.meta,
    rates: response.data,
  }
}

export async function getBnmKijangEmas(): Promise<BnmKijangEmasResult> {
  const client = new BankNegaraMalaysiaClient()
  const response = await client.getKijangEmas()
  return {
    kind: 'banknegaramalaysia.kijangEmas',
    api: createApiMeta('GET /public/kijang-emas'),
    query: {},
    count: 1,
    meta: response.meta,
    kijangEmas: response.data,
  }
}

function createApiMeta(endpoint: string): BnmApiMeta {
  return {
    provider: 'banknegaramalaysia',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://apikijangportal.bnm.gov.my/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    acceptHeader: 'application/vnd.BNM.API.v1+json',
  }
}
