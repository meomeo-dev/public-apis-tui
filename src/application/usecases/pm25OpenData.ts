import {
  PM25_OPEN_DATA_AIRBOX_MAX_LIMIT,
  PM25_OPEN_DATA_LASS_MAX_LIMIT,
  Pm25OpenDataClient,
  normalizePm25OpenDataAirboxInput,
  normalizePm25OpenDataLassInput,
  type Pm25OpenDataFeed,
  type Pm25OpenDataFeedInput,
} from '../../infrastructure/openApis/pm25OpenDataClient.js'

type Pm25OpenDataApiMeta = {
  provider: 'pm25opendata'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON static feed'
}

type Pm25OpenDataPageMeta = {
  returned: number
  limit: number
  maxLimit: number
  sourceRecords?: number | undefined
}

export type Pm25OpenDataAirboxResult = {
  kind: 'pm25opendata.airbox'
  api: Pm25OpenDataApiMeta
  query: ReturnType<typeof normalizePm25OpenDataAirboxInput>
  source?: string | undefined
  count: number
  pagination: Pm25OpenDataPageMeta
  summary: Pm25Summary
  feeds: Pm25OpenDataFeed[]
}

export type Pm25OpenDataLassResult = {
  kind: 'pm25opendata.lass'
  api: Pm25OpenDataApiMeta
  query: ReturnType<typeof normalizePm25OpenDataLassInput>
  source?: string | undefined
  count: number
  pagination: Pm25OpenDataPageMeta
  summary: Pm25Summary
  feeds: Pm25OpenDataFeed[]
}

type Pm25Summary = {
  averagePm25?: number | undefined
  maxPm25?: number | undefined
  latestTimestamp?: string | undefined
}

export async function listPm25OpenDataAirbox(input: Pm25OpenDataFeedInput = {}): Promise<Pm25OpenDataAirboxResult> {
  const query = normalizePm25OpenDataAirboxInput(input)
  const client = new Pm25OpenDataClient()
  const response = await client.listAirbox(query)
  return {
    kind: 'pm25opendata.airbox',
    api: createApiMeta('GET /data/last-all-airbox.json'),
    query,
    source: response.source,
    count: response.feeds.length,
    pagination: createPageMeta(response.feeds.length, query.limit, PM25_OPEN_DATA_AIRBOX_MAX_LIMIT, response.numOfRecords),
    summary: summarizeFeeds(response.feeds),
    feeds: response.feeds,
  }
}

export async function listPm25OpenDataLass(input: Pm25OpenDataFeedInput = {}): Promise<Pm25OpenDataLassResult> {
  const query = normalizePm25OpenDataLassInput(input)
  const client = new Pm25OpenDataClient()
  const response = await client.listLass(query)
  return {
    kind: 'pm25opendata.lass',
    api: createApiMeta('GET /data/last-all-lass.json'),
    query,
    source: response.source,
    count: response.feeds.length,
    pagination: createPageMeta(response.feeds.length, query.limit, PM25_OPEN_DATA_LASS_MAX_LIMIT, response.numOfRecords),
    summary: summarizeFeeds(response.feeds),
    feeds: response.feeds,
  }
}

function createApiMeta(endpoint: string): Pm25OpenDataApiMeta {
  return {
    provider: 'pm25opendata',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://pm25.lass-net.org/#apis',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON static feed',
  }
}

function createPageMeta(returned: number, limit: number, maxLimit: number, sourceRecords?: number | undefined): Pm25OpenDataPageMeta {
  return {
    returned,
    limit,
    maxLimit,
    ...(sourceRecords !== undefined ? { sourceRecords } : {}),
  }
}

function summarizeFeeds(feeds: Pm25OpenDataFeed[]): Pm25Summary {
  const pm25Values = feeds.map(feed => feed.pm25).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const timestamps = feeds.map(feed => feed.timestamp).filter((value): value is string => typeof value === 'string')
  return {
    averagePm25: pm25Values.length === 0 ? undefined : pm25Values.reduce((sum, value) => sum + value, 0) / pm25Values.length,
    maxPm25: pm25Values.length === 0 ? undefined : Math.max(...pm25Values),
    latestTimestamp: timestamps.sort().at(-1),
  }
}
