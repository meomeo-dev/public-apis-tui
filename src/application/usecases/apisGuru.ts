import { ApisGuruClient, type ApisGuruApiEntry, type ApisGuruApiVersion } from '../../infrastructure/openApis/apisGuruClient.js'

export const APIS_GURU_DEFAULT_LIMIT = 20
export const APIS_GURU_LIMIT_CAP = 100
export const APIS_GURU_DEFAULT_SORT: ApisGuruSearchSort = 'updated'

export type ApisGuruProvidersInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type ApisGuruSearchSort = 'updated' | 'title' | 'provider'

export type ApisGuruSearchInput = {
  query?: string | undefined
  category?: string | undefined
  provider?: string | undefined
  includeUnofficial?: boolean | undefined
  sort?: ApisGuruSearchSort | undefined
  limit?: number | undefined
}

export type ApisGuruProvidersResult = {
  kind: 'apisguru.providers'
  api: ApisGuruApiMetadata & {
    endpoint: 'GET /providers.json'
    defaultLimit: number
    limitCap: number
  }
  query: {
    query?: string | undefined
    limit: number
  }
  count: number
  matchedProviders: number
  totalProviders: number
  providers: string[]
}

export type ApisGuruSearchResult = {
  kind: 'apisguru.search'
  api: ApisGuruApiMetadata & {
    endpoint: 'GET /list.json'
    defaultLimit: number
    limitCap: number
    upstreamPagination: 'none'
  }
  query: {
    query?: string | undefined
    category?: string | undefined
    provider?: string | undefined
    includeUnofficial: boolean
    sort: ApisGuruSearchSort
    limit: number
  }
  count: number
  totalApis: number
  matchedApis: number
  apis: ApisGuruSearchItem[]
}

export type ApisGuruMetricsResult = {
  kind: 'apisguru.metrics'
  api: ApisGuruApiMetadata & {
    endpoint: 'GET /metrics.json'
  }
  query: Record<string, never>
  metrics: {
    numSpecs: number
    numAPIs: number
    numEndpoints: number
    unreachable?: number | undefined
    invalid?: number | undefined
    unofficial?: number | undefined
    fixes?: number | undefined
    fixedPct?: number | undefined
    stars?: number | undefined
    issues?: number | undefined
    thisWeek?: {
      added?: number | undefined
      updated?: number | undefined
    } | undefined
    numDrivers?: number | undefined
    numProviders?: number | undefined
  }
  datasets: {
    title: string
    top: { key: string; value: number }[]
  }[]
}

export type ApisGuruSearchItem = {
  id: string
  title: string
  description?: string | undefined
  version: string
  preferred: boolean
  categories: string[]
  providerName?: string | undefined
  serviceName?: string | undefined
  openapiVersion?: string | undefined
  swaggerUrl?: string | undefined
  swaggerYamlUrl?: string | undefined
  link?: string | undefined
  added?: string | undefined
  updated?: string | undefined
  unofficial: boolean
}

type ApisGuruApiMetadata = {
  provider: 'apisguru'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://api.apis.guru/v2/openapi.yaml'
  homepage: 'https://apis.guru/api-doc/'
  rateLimit: 'not documented'
  transport: 'HTTPS JSON'
}

export async function listApisGuruProviders(input: ApisGuruProvidersInput = {}): Promise<ApisGuruProvidersResult> {
  const query = normalizeProvidersInput(input)
  const client = new ApisGuruClient()
  const providers = await client.listProviders()
  const filtered = providers.filter(provider => query.query === undefined || provider.toLowerCase().includes(query.query.toLowerCase()))
  return {
    kind: 'apisguru.providers',
    api: {
      ...createMetadata(),
      endpoint: 'GET /providers.json',
      defaultLimit: APIS_GURU_DEFAULT_LIMIT,
      limitCap: APIS_GURU_LIMIT_CAP,
    },
    query,
    count: Math.min(filtered.length, query.limit),
    matchedProviders: filtered.length,
    totalProviders: providers.length,
    providers: filtered.slice(0, query.limit),
  }
}

export async function searchApisGuru(input: ApisGuruSearchInput = {}): Promise<ApisGuruSearchResult> {
  const query = normalizeSearchInput(input)
  const client = new ApisGuruClient()
  const entries = await client.listApis()
  const allItems = entries.flatMap(entry => entry.versions.map(version => toSearchItem(entry, version)))
  const filtered = allItems
    .filter(item => matchesSearch(item, query))
    .sort((left, right) => compareSearchItems(left, right, query.sort))

  return {
    kind: 'apisguru.search',
    api: {
      ...createMetadata(),
      endpoint: 'GET /list.json',
      defaultLimit: APIS_GURU_DEFAULT_LIMIT,
      limitCap: APIS_GURU_LIMIT_CAP,
      upstreamPagination: 'none',
    },
    query,
    count: Math.min(filtered.length, query.limit),
    totalApis: entries.length,
    matchedApis: filtered.length,
    apis: filtered.slice(0, query.limit),
  }
}

export async function getApisGuruMetrics(): Promise<ApisGuruMetricsResult> {
  const client = new ApisGuruClient()
  const metrics = await client.getMetrics()
  return {
    kind: 'apisguru.metrics',
    api: {
      ...createMetadata(),
      endpoint: 'GET /metrics.json',
    },
    query: {},
    metrics: {
      numSpecs: metrics.numSpecs,
      numAPIs: metrics.numAPIs,
      numEndpoints: metrics.numEndpoints,
      ...(metrics.unreachable !== undefined ? { unreachable: metrics.unreachable } : {}),
      ...(metrics.invalid !== undefined ? { invalid: metrics.invalid } : {}),
      ...(metrics.unofficial !== undefined ? { unofficial: metrics.unofficial } : {}),
      ...(metrics.fixes !== undefined ? { fixes: metrics.fixes } : {}),
      ...(metrics.fixedPct !== undefined ? { fixedPct: metrics.fixedPct } : {}),
      ...(metrics.stars !== undefined ? { stars: metrics.stars } : {}),
      ...(metrics.issues !== undefined ? { issues: metrics.issues } : {}),
      ...(metrics.thisWeek !== undefined ? { thisWeek: metrics.thisWeek } : {}),
      ...(metrics.numDrivers !== undefined ? { numDrivers: metrics.numDrivers } : {}),
      ...(metrics.numProviders !== undefined ? { numProviders: metrics.numProviders } : {}),
    },
    datasets: metrics.datasets.map(dataset => ({
      title: dataset.title,
      top: Object.entries(dataset.data)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 10),
    })),
  }
}

export function normalizeApisGuruProvidersInput(input: ApisGuruProvidersInput): ApisGuruProvidersResult['query'] {
  return normalizeProvidersInput(input)
}

export function normalizeApisGuruSearchInput(input: ApisGuruSearchInput): ApisGuruSearchResult['query'] {
  return normalizeSearchInput(input)
}

function normalizeProvidersInput(input: ApisGuruProvidersInput): ApisGuruProvidersResult['query'] {
  return {
    ...(normalizeOptionalText(input.query) !== undefined ? { query: normalizeOptionalText(input.query) } : {}),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeSearchInput(input: ApisGuruSearchInput): ApisGuruSearchResult['query'] {
  return {
    ...(normalizeOptionalText(input.query) !== undefined ? { query: normalizeOptionalText(input.query) } : {}),
    ...(normalizeOptionalText(input.category) !== undefined ? { category: normalizeOptionalText(input.category) } : {}),
    ...(normalizeOptionalText(input.provider) !== undefined ? { provider: normalizeOptionalText(input.provider) } : {}),
    includeUnofficial: input.includeUnofficial === true,
    sort: normalizeSort(input.sort),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) {
    return APIS_GURU_DEFAULT_LIMIT
  }
  if (!Number.isInteger(value) || value < 1 || value > APIS_GURU_LIMIT_CAP) {
    throw new Error(`APIs.guru limit must be an integer between 1 and ${APIS_GURU_LIMIT_CAP}.`)
  }

  return value
}

function normalizeSort(value: ApisGuruSearchSort | undefined): ApisGuruSearchSort {
  if (value === undefined) {
    return APIS_GURU_DEFAULT_SORT
  }
  if (value !== 'updated' && value !== 'title' && value !== 'provider') {
    throw new Error('APIs.guru sort must be one of updated, title, or provider.')
  }

  return value
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function toSearchItem(entry: ApisGuruApiEntry, version: ApisGuruApiVersion): ApisGuruSearchItem {
  return {
    id: entry.id,
    title: version.title,
    ...(version.description !== undefined ? { description: version.description } : {}),
    version: version.version,
    preferred: version.preferred,
    categories: version.categories,
    ...(version.providerName !== undefined ? { providerName: version.providerName } : {}),
    ...(version.serviceName !== undefined ? { serviceName: version.serviceName } : {}),
    ...(version.openapiVersion !== undefined ? { openapiVersion: version.openapiVersion } : {}),
    ...(version.swaggerUrl !== undefined ? { swaggerUrl: version.swaggerUrl } : {}),
    ...(version.swaggerYamlUrl !== undefined ? { swaggerYamlUrl: version.swaggerYamlUrl } : {}),
    ...(version.link !== undefined ? { link: version.link } : {}),
    ...(version.added ?? entry.added !== undefined ? { added: version.added ?? entry.added } : {}),
    ...(version.updated !== undefined ? { updated: version.updated } : {}),
    unofficial: version.unofficial,
  }
}

function matchesSearch(item: ApisGuruSearchItem, query: ApisGuruSearchResult['query']): boolean {
  if (query.includeUnofficial !== true && item.unofficial) {
    return false
  }
  if (query.category !== undefined && !item.categories.some(category => category.toLowerCase() === query.category?.toLowerCase())) {
    return false
  }
  if (query.provider !== undefined && !(item.providerName ?? item.id).toLowerCase().includes(query.provider.toLowerCase())) {
    return false
  }
  if (query.query === undefined) {
    return true
  }
  const haystack = [
    item.id,
    item.title,
    item.providerName,
    item.serviceName,
    item.description,
    ...item.categories,
  ].filter((entry): entry is string => typeof entry === 'string').join(' ').toLowerCase()
  return haystack.includes(query.query.toLowerCase())
}

function compareSearchItems(left: ApisGuruSearchItem, right: ApisGuruSearchItem, sort: ApisGuruSearchSort): number {
  switch (sort) {
    case 'title':
      return left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    case 'provider':
      return (left.providerName ?? left.id).localeCompare(right.providerName ?? right.id) || left.title.localeCompare(right.title)
    case 'updated':
      return String(right.updated ?? '').localeCompare(String(left.updated ?? '')) || left.id.localeCompare(right.id)
  }
}

function createMetadata(): ApisGuruApiMetadata {
  return {
    provider: 'apisguru',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://api.apis.guru/v2/openapi.yaml',
    homepage: 'https://apis.guru/api-doc/',
    rateLimit: 'not documented',
    transport: 'HTTPS JSON',
  }
}
