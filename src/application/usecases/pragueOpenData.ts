import {
  PragueOpenDataClient,
  PRAGUE_OPEN_DATA_DATASETS_MAX_LIMIT,
  normalizePragueOpenDataDatasetInput,
  normalizePragueOpenDataDatasetsInput,
  type PragueOpenDataDataset,
  type PragueOpenDataDatasetInput,
  type PragueOpenDataDatasetsInput,
} from '../../infrastructure/openApis/pragueOpenDataClient.js'

type PragueOpenDataApiMeta = {
  provider: 'pragueopendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON-LD LKOD catalog API'
  licenseNote: string
  limitPolicy: string
}

export type PragueOpenDataDatasetsResult = {
  kind: 'pragueopendata.datasets'
  api: PragueOpenDataApiMeta
  query: ReturnType<typeof normalizePragueOpenDataDatasetsInput>
  count: number
  total: number
  matched: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  datasets: PragueOpenDataDataset[]
}

export type PragueOpenDataDatasetResult = {
  kind: 'pragueopendata.dataset'
  api: PragueOpenDataApiMeta
  query: ReturnType<typeof normalizePragueOpenDataDatasetInput>
  dataset: PragueOpenDataDataset
  count: number
}

export async function listPragueOpenDataDatasets(input: PragueOpenDataDatasetsInput = {}): Promise<PragueOpenDataDatasetsResult> {
  const query = normalizePragueOpenDataDatasetsInput(input)
  const client = new PragueOpenDataClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'pragueopendata.datasets',
    api: createApiMeta('GET /lod/{catalog-id}/catalog + bounded dataset JSON-LD IRIs', 'The CLI fetches the public catalog IRI list, then fetches and filters at most limit dataset metadata documents; default 20, cap 389.'),
    query,
    count: response.results.length,
    total: response.total,
    matched: response.matched,
    pagination: {
      returned: response.results.length,
      limit: query.limit,
      maxLimit: PRAGUE_OPEN_DATA_DATASETS_MAX_LIMIT,
    },
    datasets: response.results,
  }
}

export async function showPragueOpenDataDataset(input: PragueOpenDataDatasetInput = {}): Promise<PragueOpenDataDatasetResult> {
  const query = normalizePragueOpenDataDatasetInput(input)
  const client = new PragueOpenDataClient()
  const dataset = await client.showDataset(query)
  return {
    kind: 'pragueopendata.dataset',
    api: createApiMeta('GET /lod/{catalog-id}/catalog/{dataset-id}', 'Dataset detail returns one JSON-LD metadata document and does not download distribution files.'),
    query,
    dataset,
    count: 1,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): PragueOpenDataApiMeta {
  return {
    provider: 'pragueopendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://opendata.praha.eu/about-lkod',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON-LD LKOD catalog API',
    licenseNote: 'Dataset distributions expose LKOD usage conditions, file formats, access URLs, and personal-data declarations when available.',
    limitPolicy,
  }
}
