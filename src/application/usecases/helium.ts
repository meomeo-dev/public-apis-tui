import {
  HeliumClient,
  type HeliumHotspot,
  type HeliumSubnetwork,
} from '../../infrastructure/openApis/heliumClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const subnetworks = ['iot', 'mobile'] as const

export type HeliumHotspotsInput = {
  subnetwork?: string | undefined
  active?: boolean | undefined
  cursor?: string | undefined
  limit?: number | undefined
}

export type HeliumApiMeta = {
  provider: 'helium'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /v2/hotspots'
  docsUrl: 'https://docs.helium.com/'
  entityApiUrl: 'https://entities.nft.helium.io/v2'
  legacyBlockchainApiUrl: 'https://docs.helium.com/api/blockchain/introduction/'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedPageSize: number
  documentedMaximumResult: 'Entity API hotspot pages return pageSize 10000; CLI caps terminal output at 100 and defaults to 100.'
}

export type HeliumHotspotResult = {
  keyToAssetKey: string
  entityKey: string
  isActive: boolean
  lat?: number | undefined
  long?: number | undefined
}

export type HeliumHotspotsResult = {
  kind: 'helium.hotspots'
  api: HeliumApiMeta
  query: {
    subnetwork: HeliumSubnetwork
    active?: boolean | undefined
    cursor?: string | undefined
    limit: number
  }
  pagination: {
    cursor: string | null
    pageSize: number
    totalItems: number
    totalPages: number
  }
  count: number
  totalFetched: number
  totalMatched: number
  hotspots: HeliumHotspotResult[]
}

export async function listHeliumHotspots(input: HeliumHotspotsInput = {}): Promise<HeliumHotspotsResult> {
  const query = normalizeHotspotsInput(input)
  const client = new HeliumClient()
  const [metadata, page] = await Promise.all([
    client.getHotspotPaginationMetadata(query.subnetwork),
    client.listHotspots({ subnetwork: query.subnetwork, cursor: query.cursor }),
  ])
  const matched = page.items.map(toHotspotResult).filter(hotspot => query.active === undefined || hotspot.isActive === query.active)

  return {
    kind: 'helium.hotspots',
    api: {
      provider: 'helium',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v2/hotspots',
      docsUrl: 'https://docs.helium.com/',
      entityApiUrl: 'https://entities.nft.helium.io/v2',
      legacyBlockchainApiUrl: 'https://docs.helium.com/api/blockchain/introduction/',
      usesBrowserClickstream: false,
      authentication: 'none',
      documentedPageSize: metadata.pageSize,
      documentedMaximumResult: 'Entity API hotspot pages return pageSize 10000; CLI caps terminal output at 100 and defaults to 100.',
    },
    query,
    pagination: {
      cursor: page.cursor,
      pageSize: metadata.pageSize,
      totalItems: metadata.totalItems,
      totalPages: metadata.totalPages,
    },
    count: Math.min(matched.length, query.limit),
    totalFetched: page.items.length,
    totalMatched: matched.length,
    hotspots: matched.slice(0, query.limit),
  }
}

function normalizeHotspotsInput(input: HeliumHotspotsInput): HeliumHotspotsResult['query'] {
  return {
    subnetwork: normalizeSubnetwork(input.subnetwork),
    ...normalizeActive(input.active),
    ...normalizeCursor(input.cursor),
    limit: normalizeLimit(input.limit),
  }
}

function normalizeSubnetwork(value: string | undefined): HeliumSubnetwork {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'iot'
  }
  if (subnetworks.includes(normalized as HeliumSubnetwork)) {
    return normalized as HeliumSubnetwork
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Helium --subnetwork must be iot or mobile.', {
    subnetwork: value,
  })
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 100
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Helium --limit must be an integer from 1 to 100.', {
      limit: value,
      note: 'Entity API pageSize is 10000; CLI cap/default is 100 for terminal UX and cache size.',
    })
  }
  return limit
}

function normalizeActive(value: boolean | undefined): { active?: boolean | undefined } {
  return value === undefined ? {} : { active: value }
}

function normalizeCursor(value: string | undefined): { cursor?: string | undefined } {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return {}
  }
  if (normalized.length > 500) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Helium --cursor is too long.', {
      cursorLength: normalized.length,
    })
  }
  return { cursor: normalized }
}

function toHotspotResult(hotspot: HeliumHotspot): HeliumHotspotResult {
  return {
    keyToAssetKey: hotspot.keyToAssetKey,
    entityKey: hotspot.entityKey,
    isActive: hotspot.isActive,
    ...(hotspot.lat !== undefined ? { lat: hotspot.lat } : {}),
    ...(hotspot.long !== undefined ? { long: hotspot.long } : {}),
  }
}
