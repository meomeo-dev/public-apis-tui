import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ECONDB_DEFAULT_BASE_URL = 'https://www.econdb.com/api'
export const ECONDB_DEFAULT_PAGE = 1
export const ECONDB_DEFAULT_LIMIT = 100
export const ECONDB_MAX_LIMIT = 100

export type EcondbCatalogInput = {
  page?: number | undefined
  limit?: number | undefined
}

export type NormalizedEcondbCatalogInput = {
  page: number
  limit: number
}

export type EcondbSource = {
  source: string
  description?: string | undefined
  prefix?: string | undefined
}

export type EcondbDataset = {
  dataset: string
  description?: string | undefined
  size?: number | undefined
  lastUpdate?: string | undefined
  lastSync?: string | undefined
}

export type EcondbPaged<T> = {
  count?: number | undefined
  pages?: number | undefined
  next?: string | undefined
  previous?: string | undefined
  results: T[]
}

export class EcondbClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listSources(input: NormalizedEcondbCatalogInput): Promise<EcondbPaged<EcondbSource>> {
    const parsed = await this.fetchJson(this.createUrl('/sources/', input))
    return parsePaged(parsed, parseSource)
  }

  async listDatasets(input: NormalizedEcondbCatalogInput): Promise<EcondbPaged<EcondbDataset>> {
    const parsed = await this.fetchJson(this.createUrl('/datasets/', input))
    return parsePaged(parsed, parseDataset)
  }

  private createUrl(pathname: string, input: NormalizedEcondbCatalogInput): URL {
    const url = new URL(`${this.options.baseUrl ?? ECONDB_DEFAULT_BASE_URL}${pathname}`)
    url.searchParams.set('format', 'json')
    url.searchParams.set('page', String(input.page))
    url.searchParams.set('page_size', String(input.limit))
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Econdb request failed: ${String(error)}`, {
        provider: 'econdb',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Econdb returned a non-JSON response: ${String(error)}`, {
        provider: 'econdb',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      const message = readErrorMessage(parsed)
      throw new RuntimeFailure('OPEN_API_FAILED', message === 'Invalid page.'
        ? `Econdb returned an invalid page for page=${url.searchParams.get('page') ?? 'unknown'}; try a lower page number or start from page 1.`
        : message ?? `Econdb request failed with HTTP ${response.status}.`, {
        provider: 'econdb',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeEcondbCatalogInput(input: EcondbCatalogInput = {}): NormalizedEcondbCatalogInput {
  const page = input.page ?? ECONDB_DEFAULT_PAGE
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--page must be an integer between 1 and 10000.')
  }
  const limit = input.limit ?? ECONDB_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > ECONDB_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${ECONDB_MAX_LIMIT}.`)
  }
  return { page, limit }
}

function parsePaged<T>(value: unknown, parseEntry: (value: Record<string, unknown>) => T): EcondbPaged<T> {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Econdb catalog response had an unexpected schema.')
  }
  return {
    count: optionalNumber(value.count),
    pages: optionalNumber(value.pages),
    next: optionalString(value.next),
    previous: optionalString(value.previous),
    results: value.results.filter(isRecord).map(parseEntry),
  }
}

function parseSource(value: Record<string, unknown>): EcondbSource {
  return {
    source: requiredString(value.source, 'source.source'),
    description: optionalString(value.description),
    prefix: optionalString(value.prefix),
  }
}

function parseDataset(value: Record<string, unknown>): EcondbDataset {
  return {
    dataset: requiredString(value.dataset, 'dataset.dataset'),
    description: optionalString(value.description),
    size: optionalNumber(value.size),
    lastUpdate: optionalString(value.lastupdate),
    lastSync: optionalString(value.last_sync),
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.detail) ?? optionalString(value.message) ?? optionalString(value.error)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `Econdb response missing ${field}.`)
  }
  return value
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
