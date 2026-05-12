import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MET_MUSEUM_DEFAULT_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1'

export type MetMuseumSearchQuery = {
  q: string
  departmentId?: number | undefined
  hasImages?: boolean | undefined
  isPublicDomain?: boolean | undefined
}

export type MetMuseumSearchResponse = {
  total: number
  objectIDs: number[]
}

export type MetMuseumObject = {
  objectID: number
  title: string
  department: string
  objectName: string
  artistDisplayName: string
  objectDate: string
  medium: string
  dimensions: string
  isPublicDomain: boolean
  primaryImage: string
  primaryImageSmall: string
  objectURL: string
}

export type MetMuseumDepartment = {
  departmentId: number
  displayName: string
}

export type MetMuseumClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class MetMuseumClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: MetMuseumClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? MET_MUSEUM_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchObjects(query: MetMuseumSearchQuery): Promise<MetMuseumSearchResponse> {
    const url = new URL(`${this.baseUrl}/search`)
    url.searchParams.set('q', query.q)
    appendOptionalNumberParam(url, 'departmentId', query.departmentId)
    appendOptionalBooleanParam(url, 'hasImages', query.hasImages)
    appendOptionalBooleanParam(url, 'isPublicDomain', query.isPublicDomain)
    const parsed = await this.getJson(url)
    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Met Museum search response must be an object.')
    }
    return {
      total: readNumber(parsed, 'total'),
      objectIDs: readOptionalNumberArray(parsed, 'objectIDs'),
    }
  }

  async getObject(objectId: number): Promise<MetMuseumObject> {
    return parseObject(await this.getJson(new URL(`${this.baseUrl}/objects/${objectId}`)))
  }

  async listDepartments(): Promise<MetMuseumDepartment[]> {
    const parsed = await this.getJson(new URL(`${this.baseUrl}/departments`))
    if (!isRecord(parsed) || !Array.isArray(parsed.departments)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Met Museum departments response must include departments array.')
    }
    return parsed.departments.filter(isRecord).map(parseDepartment)
  }

  private async getJson(url: URL): Promise<unknown> {
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'Met Museum API returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'Met Museum API request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalNumberParam(url: URL, key: string, value: number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function appendOptionalBooleanParam(url: URL, key: string, value: boolean | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function parseObject(value: unknown): MetMuseumObject {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Met Museum object response must be an object.')
  }
  return {
    objectID: readNumber(value, 'objectID'),
    title: readString(value, 'title'),
    department: readString(value, 'department'),
    objectName: readString(value, 'objectName'),
    artistDisplayName: readString(value, 'artistDisplayName'),
    objectDate: readString(value, 'objectDate'),
    medium: readString(value, 'medium'),
    dimensions: readString(value, 'dimensions'),
    isPublicDomain: readBoolean(value, 'isPublicDomain'),
    primaryImage: readString(value, 'primaryImage'),
    primaryImageSmall: readString(value, 'primaryImageSmall'),
    objectURL: readString(value, 'objectURL'),
  }
}

function parseDepartment(value: Record<string, unknown>): MetMuseumDepartment {
  return {
    departmentId: readNumber(value, 'departmentId'),
    displayName: readString(value, 'displayName'),
  }
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Met Museum field ${key} must be a number.`)
  }
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Met Museum field ${key} must be a boolean.`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Met Museum field ${key} must be a string.`)
  }
  return value
}

function readOptionalNumberArray(record: Record<string, unknown>, key: string): number[] {
  const value = record[key]
  if (value === null || value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Met Museum field ${key} must be an array when present.`)
  }
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isInteger(entry))
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
