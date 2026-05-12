import {
  JSDELIVR_DEFAULT_DATE_LIMIT,
  JSDELIVR_DEFAULT_PERIOD,
  JSDELIVR_DEFAULT_VERSION_LIMIT,
  JSDELIVR_MAX_DATE_LIMIT,
  JSDELIVR_MAX_VERSION_LIMIT,
  JsdelivrClient,
  normalizeJsdelivrMetadataInput,
  normalizeJsdelivrStatsInput,
  type JsdelivrMetadataInput,
  type JsdelivrMetricStats,
  type JsdelivrStatsInput,
} from '../../infrastructure/openApis/jsdelivrClient.js'

export type JsdelivrMetadataResult = {
  kind: 'jsdelivr.metadata'
  api: JsdelivrApiMetadata & {
    endpoint: 'GET /v1/packages/npm/{package}'
    versionLimitDefault: number
    versionLimitCap: number
  }
  query: {
    packageName: string
    versionLimit: number
  }
  package: {
    type?: string | undefined
    name: string
    tags: Record<string, string>
    latest?: string | undefined
    versionCount: number
    versions: Array<{
      version: string
      links: Record<string, string>
    }>
    links: Record<string, string>
  }
  pagination: {
    shown: number
    total: number
  }
}

export type JsdelivrStatsResult = {
  kind: 'jsdelivr.stats'
  api: JsdelivrApiMetadata & {
    endpoint: 'GET /v1/stats/packages/npm/{package}'
    defaultPeriod: string
    dateLimitDefault: number
    dateLimitCap: number
    statsDelay: 'usage statistics are available with a 48 hour delay'
  }
  query: {
    packageName: string
    period: string
    dateLimit: number
  }
  stats: {
    hits: ProjectedMetricStats
    bandwidth: ProjectedMetricStats
    links: Record<string, string>
  }
}

type JsdelivrApiMetadata = {
  provider: 'jsdelivr'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://www.jsdelivr.com/docs/data.jsdelivr.com'
  homepage: 'https://github.com/jsdelivr/data.jsdelivr.com'
  transport: 'HTTPS JSON'
  rateLimit: 'free API with no hard rate limit; contact jsDelivr before sustained 100+ RPM'
  publicApisProject: 'https://github.com/public-apis/public-apis'
}

type ProjectedMetricStats = {
  total: number
  rank?: number | null | undefined
  typeRank?: number | null | undefined
  previousTotal?: number | undefined
  dates: Array<{
    date: string
    value: number
  }>
  dateCount: number
}

export type { JsdelivrMetadataInput, JsdelivrStatsInput }

export async function getJsdelivrMetadata(input: JsdelivrMetadataInput = {}): Promise<JsdelivrMetadataResult> {
  const query = normalizeJsdelivrMetadataInput(input)
  const client = new JsdelivrClient()
  const response = await client.getNpmMetadata(query)
  const versions = response.versions.slice(0, query.versionLimit)
  return {
    kind: 'jsdelivr.metadata',
    api: {
      ...createJsdelivrApiMetadata(),
      endpoint: 'GET /v1/packages/npm/{package}',
      versionLimitDefault: JSDELIVR_DEFAULT_VERSION_LIMIT,
      versionLimitCap: JSDELIVR_MAX_VERSION_LIMIT,
    },
    query,
    package: {
      ...(response.type !== undefined ? { type: response.type } : {}),
      name: response.name,
      tags: response.tags,
      ...(response.tags.latest !== undefined ? { latest: response.tags.latest } : {}),
      versionCount: response.versions.length,
      versions,
      links: response.links,
    },
    pagination: {
      shown: versions.length,
      total: response.versions.length,
    },
  }
}

export async function getJsdelivrStats(input: JsdelivrStatsInput = {}): Promise<JsdelivrStatsResult> {
  const query = normalizeJsdelivrStatsInput(input)
  const client = new JsdelivrClient()
  const response = await client.getNpmStats(query)
  return {
    kind: 'jsdelivr.stats',
    api: {
      ...createJsdelivrApiMetadata(),
      endpoint: 'GET /v1/stats/packages/npm/{package}',
      defaultPeriod: JSDELIVR_DEFAULT_PERIOD,
      dateLimitDefault: JSDELIVR_DEFAULT_DATE_LIMIT,
      dateLimitCap: JSDELIVR_MAX_DATE_LIMIT,
      statsDelay: 'usage statistics are available with a 48 hour delay',
    },
    query,
    stats: {
      hits: projectMetric(response.hits, query.dateLimit),
      bandwidth: projectMetric(response.bandwidth, query.dateLimit),
      links: response.links,
    },
  }
}

function projectMetric(stats: JsdelivrMetricStats, dateLimit: number): ProjectedMetricStats {
  const dates = Object.entries(stats.dates)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-dateLimit)
    .map(([date, value]) => ({ date, value }))
  return {
    total: stats.total,
    ...(stats.rank !== undefined ? { rank: stats.rank } : {}),
    ...(stats.typeRank !== undefined ? { typeRank: stats.typeRank } : {}),
    ...(stats.prev?.total !== undefined ? { previousTotal: stats.prev.total } : {}),
    dates,
    dateCount: Object.keys(stats.dates).length,
  }
}

function createJsdelivrApiMetadata(): JsdelivrApiMetadata {
  return {
    provider: 'jsdelivr',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://www.jsdelivr.com/docs/data.jsdelivr.com',
    homepage: 'https://github.com/jsdelivr/data.jsdelivr.com',
    transport: 'HTTPS JSON',
    rateLimit: 'free API with no hard rate limit; contact jsDelivr before sustained 100+ RPM',
    publicApisProject: 'https://github.com/public-apis/public-apis',
  }
}
