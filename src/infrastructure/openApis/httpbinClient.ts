import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const HTTPBIN_DEFAULT_BASE_URL = 'https://httpbin.org'

export type HttpbinGetQuery = {
  query?: string | undefined
}

export type HttpbinGetResponse = {
  args: Record<string, string | string[]>
  headers: Record<string, string | string[]>
  origin: string
  url: string
}

export type HttpbinUuidResponse = {
  uuid: string
}

export class HttpbinClient {
  constructor(private readonly baseUrl = HTTPBIN_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async get(query: HttpbinGetQuery = {}): Promise<HttpbinGetResponse> {
    const url = this.createUrl('/get')
    for (const [key, value] of normalizeQueryPairs(query.query)) {
      url.searchParams.append(key, value)
    }

    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || !isRecord(parsed.args) || !isRecord(parsed.headers) || typeof parsed.origin !== 'string' || typeof parsed.url !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Httpbin /get response did not match the documented JSON shape.')
    }

    return {
      args: mapStringRecord(parsed.args),
      headers: mapStringRecord(parsed.headers),
      origin: parsed.origin,
      url: parsed.url,
    }
  }

  async uuid(): Promise<HttpbinUuidResponse> {
    const parsed = await this.fetchJson(this.createUrl('/uuid'))
    if (!isRecord(parsed) || typeof parsed.uuid !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Httpbin /uuid response did not include a uuid.')
    }

    return { uuid: parsed.uuid }
  }

  private createUrl(path: string): URL {
    return new URL(`${normalizeBaseUrl(this.baseUrl)}${path}`)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Httpbin request failed: ${String(error)}`, {
        provider: 'httpbin',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Httpbin request failed with HTTP ${response.status}.`, {
        provider: 'httpbin',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Httpbin response was not JSON: ${String(error)}`, {
        provider: 'httpbin',
        url: url.toString(),
      })
    }
  }
}

export function normalizeHttpbinGetQuery(input: { query?: string | undefined } = {}): { query?: string | undefined } {
  const query = input.query?.trim()
  if (query === undefined || query === '') {
    return {}
  }
  normalizeQueryPairs(query)
  return { query }
}

function normalizeQueryPairs(query: string | undefined): [string, string][] {
  if (query === undefined || query.trim() === '') {
    return []
  }
  const pairs: [string, string][] = []
  for (const part of query.split('&')) {
    const [rawKey, ...rawValueParts] = part.split('=')
    const key = rawKey?.trim() ?? ''
    const value = rawValueParts.join('=').trim()
    if (!/^[A-Za-z0-9_.-]{1,40}$/u.test(key)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', 'Httpbin --query keys must be 1-40 URL-safe characters.', { query })
    }
    if (value.length > 120) {
      throw new RuntimeFailure('INVALID_ARGUMENT', 'Httpbin --query values must be 120 characters or fewer.', { query })
    }
    pairs.push([key, value])
  }
  if (pairs.length > 10) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Httpbin --query supports at most 10 key=value pairs.', { query })
  }
  return pairs
}

function mapStringRecord(record: Record<string, unknown>): Record<string, string | string[]> {
  const entries: [string, string | string[]][] = []
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      entries.push([key, value])
    }
    if (Array.isArray(value) && value.every(entry => typeof entry === 'string')) {
      entries.push([key, value])
    }
  }
  return Object.fromEntries(entries)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
