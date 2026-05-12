import {
  FED_TREASURY_DEFAULT_PAGE_SIZE,
  FED_TREASURY_MAX_PAGE_SIZE,
  FedTreasuryClient,
  normalizeFedTreasuryDebtInput,
  normalizeFedTreasuryRatesInput,
  type FedTreasuryDebtInput,
  type FedTreasuryDebtRow,
  type FedTreasuryRatesInput,
  type FedTreasuryRateRow,
} from '../../infrastructure/openApis/fedTreasuryClient.js'

export type FedTreasuryDebtResult = {
  kind: 'fedtreasury.debt'
  api: FedTreasuryApiMeta
  query: ReturnType<typeof normalizeFedTreasuryDebtInput>
  meta: FedTreasuryResultMeta
  rows: FedTreasuryDebtRow[]
  count: number
}

export type FedTreasuryRatesResult = {
  kind: 'fedtreasury.rates'
  api: FedTreasuryApiMeta
  query: ReturnType<typeof normalizeFedTreasuryRatesInput>
  meta: FedTreasuryResultMeta
  rows: FedTreasuryRateRow[]
  count: number
}

type FedTreasuryResultMeta = {
  returned?: number | undefined
  totalCount?: number | undefined
  totalPages?: number | undefined
  pageNumber: number
  pageSize: number
  maxPageSize: number
  labels: Record<string, string>
}

type FedTreasuryApiMeta = {
  provider: 'fedtreasury'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  documentedDefaultPageSize: number
  documentedMaximumPageSize: number
}

const commonApiMeta = {
  provider: 'fedtreasury',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://fiscaldata.treasury.gov/api-documentation/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  documentedDefaultPageSize: FED_TREASURY_DEFAULT_PAGE_SIZE,
  documentedMaximumPageSize: FED_TREASURY_MAX_PAGE_SIZE,
} satisfies Omit<FedTreasuryApiMeta, 'endpoint'>

export async function getFedTreasuryDebt(input: FedTreasuryDebtInput = {}): Promise<FedTreasuryDebtResult> {
  const query = normalizeFedTreasuryDebtInput(input)
  const client = new FedTreasuryClient()
  const response = await client.getDebt(query)
  return {
    kind: 'fedtreasury.debt',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /services/api/fiscal_service/v2/accounting/od/debt_to_penny',
    },
    query,
    meta: {
      returned: response.meta.count,
      totalCount: response.meta.totalCount,
      totalPages: response.meta.totalPages,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      maxPageSize: FED_TREASURY_MAX_PAGE_SIZE,
      labels: response.meta.labels,
    },
    rows: response.rows,
    count: response.rows.length,
  }
}

export async function getFedTreasuryRates(input: FedTreasuryRatesInput = {}): Promise<FedTreasuryRatesResult> {
  const query = normalizeFedTreasuryRatesInput(input)
  const client = new FedTreasuryClient()
  const response = await client.getRates(query)
  return {
    kind: 'fedtreasury.rates',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /services/api/fiscal_service/v2/accounting/od/avg_interest_rates',
    },
    query,
    meta: {
      returned: response.meta.count,
      totalCount: response.meta.totalCount,
      totalPages: response.meta.totalPages,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      maxPageSize: FED_TREASURY_MAX_PAGE_SIZE,
      labels: response.meta.labels,
    },
    rows: response.rows,
    count: response.rows.length,
  }
}
