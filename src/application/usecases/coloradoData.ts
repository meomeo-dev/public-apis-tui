import {
  COLORADO_DATA_MAX_DATASET_LIMIT,
  COLORADO_DATA_MAX_ENTITY_LIMIT,
  ColoradoDataClient,
  normalizeColoradoDataBusinessEntitiesInput,
  normalizeColoradoDataDatasetsInput,
  type ColoradoBusinessEntity,
  type ColoradoDataBusinessEntitiesInput,
  type ColoradoDataDataset,
  type ColoradoDataDatasetsInput,
} from '../../infrastructure/openApis/coloradoDataClient.js'

type ColoradoDataApiMeta = {
  provider: 'coloradodata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  socrata: true
  limitPolicy: string
}

export type ColoradoDataDatasetsResult = {
  kind: 'coloradodata.datasets'
  api: ColoradoDataApiMeta
  query: ReturnType<typeof normalizeColoradoDataDatasetsInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    maxLimit: number
  }
  datasets: ColoradoDataDataset[]
}

export type ColoradoDataBusinessEntitiesResult = {
  kind: 'coloradodata.businessEntities'
  api: ColoradoDataApiMeta
  query: ReturnType<typeof normalizeColoradoDataBusinessEntitiesInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  entities: ColoradoBusinessEntity[]
}

const commonApiMeta = {
  provider: 'coloradodata',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://data.colorado.gov/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  socrata: true,
  limitPolicy: 'Unauthenticated Socrata reads are supported; CLI caps business rows at 1000 to maximize one bounded no-token request.',
} satisfies Omit<ColoradoDataApiMeta, 'endpoint'>

export async function listColoradoDataDatasets(input: ColoradoDataDatasetsInput = {}): Promise<ColoradoDataDatasetsResult> {
  const query = normalizeColoradoDataDatasetsInput(input)
  const client = new ColoradoDataClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'coloradodata.datasets',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /api/catalog/v1',
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      totalMatched: response.total,
      limit: query.limit,
      maxLimit: COLORADO_DATA_MAX_DATASET_LIMIT,
    },
    datasets: response.datasets,
  }
}

export async function listColoradoBusinessEntities(input: ColoradoDataBusinessEntitiesInput = {}): Promise<ColoradoDataBusinessEntitiesResult> {
  const query = normalizeColoradoDataBusinessEntitiesInput(input)
  const client = new ColoradoDataClient()
  const entities = await client.listBusinessEntities(query)
  return {
    kind: 'coloradodata.businessEntities',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /resource/4ykn-tg5h.json',
    },
    query,
    count: entities.length,
    pagination: {
      returned: entities.length,
      limit: query.limit,
      maxLimit: COLORADO_DATA_MAX_ENTITY_LIMIT,
    },
    entities,
  }
}
