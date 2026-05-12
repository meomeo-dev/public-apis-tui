import {
  DATA_USA_DEFAULT_LIMIT,
  DATA_USA_MAX_LIMIT,
  DataUsaClient,
  normalizeDataUsaGeographiesInput,
  normalizeDataUsaPopulationInput,
  type DataUsaGeographiesInput,
  type DataUsaGeographyMember,
  type DataUsaPopulationInput,
  type DataUsaPopulationRow,
} from '../../infrastructure/openApis/dataUsaClient.js'

export type DataUsaPopulationResult = {
  kind: 'datausa.population'
  api: DataUsaApiMeta
  query: ReturnType<typeof normalizeDataUsaPopulationInput>
  source: {
    cube: string
    datasetName?: string | undefined
    sourceName?: string | undefined
    topic?: string | undefined
    tableId?: string | undefined
  }
  page: {
    limit?: number | undefined
    offset?: number | undefined
    total?: number | undefined
  }
  count: number
  rows: DataUsaPopulationRow[]
}

export type DataUsaGeographiesResult = {
  kind: 'datausa.geographies'
  api: DataUsaApiMeta
  query: ReturnType<typeof normalizeDataUsaGeographiesInput>
  geography: {
    name?: string | undefined
    caption?: string | undefined
    depth?: number | undefined
  }
  count: number
  members: DataUsaGeographyMember[]
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

type DataUsaApiMeta = {
  provider: 'datausa'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  documentedMaximumResult: string
}

const commonApiMeta = {
  provider: 'datausa',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://datausa.io/about/api/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  documentedMaximumResult: `CLI defaults/caps at ${DATA_USA_DEFAULT_LIMIT} rows because Data USA exposes limit/offset pagination and state-level result sets fit within 100.`,
} satisfies Omit<DataUsaApiMeta, 'endpoint'>

export async function getDataUsaPopulation(input: DataUsaPopulationInput = {}): Promise<DataUsaPopulationResult> {
  const query = normalizeDataUsaPopulationInput(input)
  const client = new DataUsaClient()
  const response = await client.getPopulation(query)
  return {
    kind: 'datausa.population',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /tesseract/data.jsonrecords',
    },
    query,
    source: {
      cube: 'acs_yg_total_population_5',
      datasetName: readString(response.annotations.dataset_name),
      sourceName: readString(response.annotations.source_name),
      topic: readString(response.annotations.topic),
      tableId: readString(response.annotations.table_id),
    },
    page: response.page,
    count: response.rows.length,
    rows: response.rows,
  }
}

export async function listDataUsaGeographies(input: DataUsaGeographiesInput = {}): Promise<DataUsaGeographiesResult> {
  const query = normalizeDataUsaGeographiesInput(input)
  const client = new DataUsaClient()
  const response = await client.listGeographies(query)
  return {
    kind: 'datausa.geographies',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /tesseract/members',
    },
    query,
    geography: {
      name: response.name,
      caption: response.caption,
      depth: response.depth,
    },
    count: response.members.length,
    members: response.members,
    pagination: {
      returned: response.members.length,
      limit: query.limit,
      maxLimit: DATA_USA_MAX_LIMIT,
    },
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}
