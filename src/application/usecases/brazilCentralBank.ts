import {
  BRAZIL_CENTRAL_BANK_MAX_ROWS,
  BRAZIL_CENTRAL_BANK_MAX_SERIES_LIMIT,
  BrazilCentralBankClient,
  normalizeBrazilCentralBankDatasetsInput,
  normalizeBrazilCentralBankSgsLatestInput,
  type BrazilCentralBankDataset,
  type BrazilCentralBankDatasetsInput,
  type BrazilCentralBankSgsLatestInput,
  type BrazilCentralBankSgsPoint,
} from '../../infrastructure/openApis/brazilCentralBankClient.js'

type BrazilCentralBankApiMeta = {
  provider: 'brazilcentralbank'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  documentedMaximumRows: string
}

export type BrazilCentralBankDatasetsResult = {
  kind: 'brazilcentralbank.datasets'
  api: BrazilCentralBankApiMeta
  query: ReturnType<typeof normalizeBrazilCentralBankDatasetsInput>
  count: number
  pagination: {
    returned: number
    rows: number
    start: number
    total: number
    maxRows: number
  }
  datasets: BrazilCentralBankDataset[]
}

export type BrazilCentralBankSgsLatestResult = {
  kind: 'brazilcentralbank.sgsLatest'
  api: BrazilCentralBankApiMeta
  query: ReturnType<typeof normalizeBrazilCentralBankSgsLatestInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  series: {
    code: number
    name: string
  }
  observations: BrazilCentralBankSgsPoint[]
}

const commonApiMeta = {
  provider: 'brazilcentralbank',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://dadosabertos.bcb.gov.br/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  documentedMaximumRows: `No hard public maximum is documented for these endpoints; CLI defaults/caps at ${BRAZIL_CENTRAL_BANK_MAX_ROWS} rows/points, matching the SGS ultimos maximum observed from the API error message, to maximize one bounded terminal request.`,
} satisfies Omit<BrazilCentralBankApiMeta, 'endpoint'>

export async function searchBrazilCentralBankDatasets(input: BrazilCentralBankDatasetsInput = {}): Promise<BrazilCentralBankDatasetsResult> {
  const query = normalizeBrazilCentralBankDatasetsInput(input)
  const client = new BrazilCentralBankClient()
  const response = await client.searchDatasets(query)
  return {
    kind: 'brazilcentralbank.datasets',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/3/action/package_search',
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      rows: query.rows,
      start: query.start,
      total: response.count,
      maxRows: BRAZIL_CENTRAL_BANK_MAX_ROWS,
    },
    datasets: response.datasets,
  }
}

export async function getBrazilCentralBankSgsLatest(input: BrazilCentralBankSgsLatestInput = {}): Promise<BrazilCentralBankSgsLatestResult> {
  const query = normalizeBrazilCentralBankSgsLatestInput(input)
  const client = new BrazilCentralBankClient()
  const observations = await client.getSgsLatest(query)
  return {
    kind: 'brazilcentralbank.sgsLatest',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /dados/serie/bcdata.sgs.{seriesCode}/dados/ultimos/{limit}',
      documentedMaximumRows: `No hard public maximum is documented for SGS ultimos; CLI defaults/caps at ${BRAZIL_CENTRAL_BANK_MAX_SERIES_LIMIT} points, matching the SGS ultimos maximum observed from the API error message, to maximize one bounded terminal request.`,
    },
    query,
    count: observations.length,
    pagination: {
      returned: observations.length,
      limit: query.limit,
      maxLimit: BRAZIL_CENTRAL_BANK_MAX_SERIES_LIMIT,
    },
    series: {
      code: query.seriesCode,
      name: getKnownSeriesName(query.seriesCode),
    },
    observations,
  }
}

function getKnownSeriesName(seriesCode: number): string {
  if (seriesCode === 11) {
    return 'SELIC overnight rate'
  }
  return `SGS series ${seriesCode}`
}
