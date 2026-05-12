import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CDNJS_DEFAULT_BASE_URL = 'https://api.cdnjs.com'

export type CdnjsSearchQuery = {
  search?: string | undefined
  fields?: string[] | undefined
  searchFields?: string[] | undefined
  limit?: number | undefined
}

export type CdnjsLibraryQuery = {
  fields?: string[] | undefined
}

export type CdnjsVersionQuery = {
  fields?: string[] | undefined
}

export type CdnjsSearchResponse = {
  results: CdnjsLibrarySummary[]
  total: number
  available: number
}

export type CdnjsLibrarySummary = {
  name: string
  latest: string
  version?: string | undefined
  filename?: string | undefined
  description?: string | undefined
  keywords: string[]
  license?: string | undefined
  homepage?: string | undefined
  repository?: CdnjsRepository | undefined
  github?: CdnjsGithubStats | undefined
  sri?: string | undefined
}

export type CdnjsLibraryDetails = CdnjsLibrarySummary & {
  assets: CdnjsAsset[]
}

export type CdnjsVersionDetails = {
  files: string[]
  sri: Record<string, string>
}

export type CdnjsAsset = {
  version: string
  files: string[]
  rawFiles: string[]
  sri: Record<string, string>
}

export type CdnjsRepository = {
  type?: string | undefined
  url?: string | undefined
}

export type CdnjsGithubStats = {
  user?: string | undefined
  repo?: string | undefined
  stargazersCount?: number | undefined
  forks?: number | undefined
  subscribersCount?: number | undefined
}

export type CdnjsClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class CdnjsClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: CdnjsClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? CDNJS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchLibraries(query: CdnjsSearchQuery = {}): Promise<CdnjsSearchResponse> {
    const parsed = await this.getJson('/libraries', {
      ...(query.search !== undefined ? { search: query.search } : {}),
      ...(query.fields !== undefined && query.fields.length > 0 ? { fields: query.fields.join(',') } : {}),
      ...(query.searchFields !== undefined && query.searchFields.length > 0 ? { search_fields: query.searchFields.join(',') } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    })
    if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'CDNJS search response must be an object with results array.')
    }

    return {
      results: parsed.results.map(entry => parseLibrarySummary(entry)),
      total: readNumber(parsed, 'total'),
      available: readNumber(parsed, 'available'),
    }
  }

  async getLibrary(name: string, query: CdnjsLibraryQuery = {}): Promise<CdnjsLibraryDetails> {
    const parsed = await this.getJson(`/libraries/${encodeURIComponent(name)}`, {
      ...(query.fields !== undefined && query.fields.length > 0 ? { fields: query.fields.join(',') } : {}),
    })
    return parseLibraryDetails(parsed, name)
  }

  async getVersion(name: string, version: string, query: CdnjsVersionQuery = {}): Promise<CdnjsVersionDetails> {
    const parsed = await this.getJson(`/libraries/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, {
      ...(query.fields !== undefined && query.fields.length > 0 ? { fields: query.fields.join(',') } : {}),
    })
    return parseVersionDetails(parsed)
  }

  private async getJson(path: string, query: Record<string, string | number>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'CDNJS returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'CDNJS request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parseLibraryDetails(value: unknown, fallbackName: string): CdnjsLibraryDetails {
  const summary = parseLibrarySummary(value, fallbackName)
  const record = value as Record<string, unknown>
  return {
    ...summary,
    assets: Array.isArray(record.assets) ? record.assets.map(parseAsset) : [],
  }
}

function parseLibrarySummary(value: unknown, fallbackName?: string): CdnjsLibrarySummary {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CDNJS library row must be an object.')
  }

  const name = typeof value.name === 'string' && value.name.trim() !== '' ? value.name : fallbackName
  if (name === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CDNJS library row must include a name.')
  }

  return {
    name,
    latest: readOptionalString(value, 'latest') ?? createCdnjsLatestUrl(name, readOptionalString(value, 'version'), readOptionalString(value, 'filename')),
    ...(readOptionalString(value, 'version') !== undefined ? { version: readOptionalString(value, 'version') } : {}),
    ...(readOptionalString(value, 'filename') !== undefined ? { filename: readOptionalString(value, 'filename') } : {}),
    ...(readOptionalString(value, 'description') !== undefined ? { description: readOptionalString(value, 'description') } : {}),
    keywords: Array.isArray(value.keywords) ? value.keywords.filter((entry): entry is string => typeof entry === 'string') : [],
    ...(readOptionalString(value, 'license') !== undefined ? { license: readOptionalString(value, 'license') } : {}),
    ...(readOptionalString(value, 'homepage') !== undefined ? { homepage: readOptionalString(value, 'homepage') } : {}),
    ...(isRecord(value.repository) ? { repository: parseRepository(value.repository) } : {}),
    ...(isRecord(value.github) ? { github: parseGithub(value.github) } : {}),
    ...(readOptionalString(value, 'sri') !== undefined ? { sri: readOptionalString(value, 'sri') } : {}),
  }
}

function parseVersionDetails(value: unknown): CdnjsVersionDetails {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CDNJS version response must be an object.')
  }

  return {
    files: Array.isArray(value.files) ? value.files.filter((entry): entry is string => typeof entry === 'string') : [],
    sri: isRecord(value.sri) ? readStringRecord(value.sri) : {},
  }
}

function parseAsset(value: unknown): CdnjsAsset {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'CDNJS asset row must be an object.')
  }

  return {
    version: readString(value, 'version'),
    files: Array.isArray(value.files) ? value.files.filter((entry): entry is string => typeof entry === 'string') : [],
    rawFiles: Array.isArray(value.rawFiles) ? value.rawFiles.filter((entry): entry is string => typeof entry === 'string') : [],
    sri: isRecord(value.sri) ? readStringRecord(value.sri) : {},
  }
}

function parseRepository(value: Record<string, unknown>): CdnjsRepository {
  return {
    ...(readOptionalString(value, 'type') !== undefined ? { type: readOptionalString(value, 'type') } : {}),
    ...(readOptionalString(value, 'url') !== undefined ? { url: readOptionalString(value, 'url') } : {}),
  }
}

function parseGithub(value: Record<string, unknown>): CdnjsGithubStats {
  return {
    ...(readOptionalString(value, 'user') !== undefined ? { user: readOptionalString(value, 'user') } : {}),
    ...(readOptionalString(value, 'repo') !== undefined ? { repo: readOptionalString(value, 'repo') } : {}),
    ...(typeof value.stargazers_count === 'number' ? { stargazersCount: value.stargazers_count } : {}),
    ...(typeof value.forks === 'number' ? { forks: value.forks } : {}),
    ...(typeof value.subscribers_count === 'number' ? { subscribersCount: value.subscribers_count } : {}),
  }
}

function createCdnjsLatestUrl(name: string, version: string | undefined, filename: string | undefined): string {
  if (version === undefined || filename === undefined) {
    return ''
  }

  return `https://cdnjs.cloudflare.com/ajax/libs/${name}/${version}/${filename}`
}

function readStringRecord(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = readOptionalString(record, key)
  if (value === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', `CDNJS response field ${key} must be a string.`)
  }

  return value
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `CDNJS response field ${key} must be a number.`)
  }

  return value
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
