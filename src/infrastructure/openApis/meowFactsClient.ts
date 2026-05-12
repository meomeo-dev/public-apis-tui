import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MEOW_FACTS_DEFAULT_BASE_URL = 'https://meowfacts.herokuapp.com'

export type MeowFactsQuery = {
  count?: number | undefined
  id?: number | undefined
  lang?: string | undefined
}

export type MeowFactsResponse = {
  data: string[]
}

export type MeowFactsClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class MeowFactsClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: MeowFactsClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? MEOW_FACTS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getFacts(query: MeowFactsQuery = {}): Promise<MeowFactsResponse> {
    const url = new URL(this.baseUrl)
    appendOptionalNumberParam(url, 'count', query.count)
    appendOptionalNumberParam(url, 'id', query.id)
    appendOptionalStringParam(url, 'lang', query.lang)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'MeowFacts returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', response.statusText || 'MeowFacts request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parseMeowFactsResponse(parsed)
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function appendOptionalNumberParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'number') {
    url.searchParams.set(key, String(value))
  }
}

function appendOptionalStringParam(url: URL, key: string, value: unknown): void {
  if (typeof value === 'string' && value.trim() !== '') {
    url.searchParams.set(key, value.trim())
  }
}

function parseMeowFactsResponse(value: unknown): MeowFactsResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MeowFacts response must be an object.')
  }
  const data = value.data
  if (!Array.isArray(data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'MeowFacts data field must be an array.')
  }
  return {
    data: data.filter((entry): entry is string => typeof entry === 'string'),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
