import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ART_INSTITUTE_CHICAGO_DEFAULT_BASE_URL = 'https://api.artic.edu/api/v1'

export type ArtInstituteChicagoArtworksQuery = {
  query?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  fields?: string | undefined
}

export type ArtInstituteChicagoPagination = {
  total: number
  limit: number
  offset: number
  totalPages: number
  currentPage: number
  nextUrl?: string | undefined
}

export type ArtInstituteChicagoInfo = {
  licenseText: string
  licenseLinks: string[]
  version: string
}

export type ArtInstituteChicagoConfig = {
  iiifUrl: string
  websiteUrl: string
}

export type ArtInstituteChicagoArtwork = {
  id: number
  title: string
  artistDisplay?: string | undefined
  dateDisplay?: string | undefined
  imageId?: string | undefined
  isPublicDomain?: boolean | undefined
  score?: number | undefined
}

export type ArtInstituteChicagoArtworksResponse = {
  pagination: ArtInstituteChicagoPagination
  data: ArtInstituteChicagoArtwork[]
  info: ArtInstituteChicagoInfo
  config: ArtInstituteChicagoConfig
}

export type ArtInstituteChicagoClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ArtInstituteChicagoClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ArtInstituteChicagoClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? ART_INSTITUTE_CHICAGO_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listArtworks(query: ArtInstituteChicagoArtworksQuery = {}): Promise<ArtInstituteChicagoArtworksResponse> {
    const path = query.query === undefined ? '/artworks' : '/artworks/search'
    const url = new URL(`${this.baseUrl}${path}`)
    appendOptionalStringParam(url, 'q', query.query)
    appendOptionalNumberParam(url, 'limit', query.limit)
    appendOptionalNumberParam(url, 'page', query.page)
    appendOptionalStringParam(url, 'fields', query.fields)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'AIC-User-Agent': 'public-apis-tui no-auth CLI (https://github.com/public-apis/public-apis)',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Art Institute of Chicago API returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Art Institute of Chicago API request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseArtworksResponse(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalStringParam(url: URL, key: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function parseArtworksResponse(value: unknown): ArtInstituteChicagoArtworksResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Art Institute of Chicago response must be an object.')
  }
  const pagination = value.pagination
  const data = value.data
  const info = value.info
  const config = value.config
  if (!isRecord(pagination)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Art Institute of Chicago response must include pagination.')
  }
  if (!Array.isArray(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Art Institute of Chicago response data must be an array.')
  }
  if (!isRecord(info)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Art Institute of Chicago response must include info.')
  }
  if (!isRecord(config)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Art Institute of Chicago response must include config.')
  }

  return {
    pagination: parsePagination(pagination),
    data: data.filter(isRecord).map(parseArtwork),
    info: parseInfo(info),
    config: parseConfig(config),
  }
}

function parsePagination(value: Record<string, unknown>): ArtInstituteChicagoPagination {
  return {
    total: readNumber(value, 'total'),
    limit: readNumber(value, 'limit'),
    offset: readNumber(value, 'offset'),
    totalPages: readNumber(value, 'total_pages'),
    currentPage: readNumber(value, 'current_page'),
    ...readOptionalStringProperty(value, 'next_url', 'nextUrl'),
  }
}

function parseInfo(value: Record<string, unknown>): ArtInstituteChicagoInfo {
  return {
    licenseText: readString(value, 'license_text'),
    licenseLinks: readStringArray(value, 'license_links'),
    version: readString(value, 'version'),
  }
}

function parseConfig(value: Record<string, unknown>): ArtInstituteChicagoConfig {
  return {
    iiifUrl: readString(value, 'iiif_url'),
    websiteUrl: readString(value, 'website_url'),
  }
}

function parseArtwork(value: Record<string, unknown>): ArtInstituteChicagoArtwork {
  return {
    id: readNumber(value, 'id'),
    title: readString(value, 'title'),
    ...readOptionalStringProperty(value, 'artist_display', 'artistDisplay'),
    ...readOptionalStringProperty(value, 'date_display', 'dateDisplay'),
    ...readOptionalStringProperty(value, 'image_id', 'imageId'),
    ...readOptionalBooleanProperty(value, 'is_public_domain', 'isPublicDomain'),
    ...readOptionalNumberProperty(value, '_score', 'score'),
  }
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Art Institute of Chicago field ${key} must be a number.`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Art Institute of Chicago field ${key} must be a string.`)
  }
  return value
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Art Institute of Chicago field ${key} must be an array.`)
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function readOptionalStringProperty<TName extends string>(
  record: Record<string, unknown>,
  sourceKey: string,
  targetKey: TName,
): { [key in TName]?: string } {
  const value = record[sourceKey]
  return typeof value === 'string' && value.trim() !== '' ? { [targetKey]: value } as { [key in TName]?: string } : {}
}

function readOptionalNumberProperty<TName extends string>(
  record: Record<string, unknown>,
  sourceKey: string,
  targetKey: TName,
): { [key in TName]?: number } {
  const value = record[sourceKey]
  return typeof value === 'number' && !Number.isNaN(value) ? { [targetKey]: value } as { [key in TName]?: number } : {}
}

function readOptionalBooleanProperty<TName extends string>(
  record: Record<string, unknown>,
  sourceKey: string,
  targetKey: TName,
): { [key in TName]?: boolean } {
  const value = record[sourceKey]
  return typeof value === 'boolean' ? { [targetKey]: value } as { [key in TName]?: boolean } : {}
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
