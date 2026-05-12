import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HELIUM_ENTITY_API_BASE_URL = 'https://entities.nft.helium.io/v2'

export type HeliumSubnetwork = 'iot' | 'mobile'

export type HeliumHotspotsQuery = {
  subnetwork: HeliumSubnetwork
  cursor?: string | undefined
}

export type HeliumHotspot = {
  keyToAssetKey: string
  entityKey: string
  isActive: boolean
  lat?: number | undefined
  long?: number | undefined
}

export type HeliumPaginationMetadata = {
  pageSize: number
  totalItems: number
  totalPages: number
}

export type HeliumHotspotsResponse = {
  cursor: string | null
  items: HeliumHotspot[]
}

export type HeliumClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class HeliumClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: HeliumClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? HELIUM_ENTITY_API_BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getHotspotPaginationMetadata(subnetwork: HeliumSubnetwork): Promise<HeliumPaginationMetadata> {
    const url = new URL(`${this.baseUrl.replace(/\/$/u, '')}/hotspots/pagination-metadata`)
    url.searchParams.set('subnetwork', subnetwork)
    return parsePaginationMetadata(await this.requestJson(url))
  }

  async listHotspots(query: HeliumHotspotsQuery): Promise<HeliumHotspotsResponse> {
    const url = new URL(`${this.baseUrl.replace(/\/$/u, '')}/hotspots`)
    url.searchParams.set('subnetwork', query.subnetwork)
    if (query.cursor !== undefined && query.cursor.trim() !== '') {
      url.searchParams.set('cursor', query.cursor.trim())
    }
    return parseHotspotsResponse(await this.requestJson(url))
  }

  private async requestJson(url: URL): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Helium Entity API returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Helium Entity API request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parsePaginationMetadata(value: unknown): HeliumPaginationMetadata {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Helium pagination metadata response must be a JSON object.')
  }
  return {
    pageSize: parseNumberField(value, 'pageSize'),
    totalItems: parseNumberField(value, 'totalItems'),
    totalPages: parseNumberField(value, 'totalPages'),
  }
}

function parseHotspotsResponse(value: unknown): HeliumHotspotsResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Helium hotspots response must include an items array.')
  }

  return {
    cursor: typeof value.cursor === 'string' ? value.cursor : null,
    items: value.items.map(parseHotspot),
  }
}

function parseHotspot(value: unknown): HeliumHotspot {
  if (!isRecord(value) || typeof value.key_to_asset_key !== 'string' || typeof value.entity_key_str !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Helium hotspot rows must include key_to_asset_key and entity_key_str strings.')
  }
  return {
    keyToAssetKey: value.key_to_asset_key,
    entityKey: value.entity_key_str,
    isActive: value.is_active === true,
    ...(typeof value.lat === 'number' ? { lat: value.lat } : {}),
    ...(typeof value.long === 'number' ? { long: value.long } : {}),
  }
}

function parseNumberField(value: Record<string, unknown>, field: string): number {
  const entry = value[field]
  if (typeof entry !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Helium pagination metadata field ${field} must be a number.`)
  }
  return entry
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
