import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const AGIFY_DEFAULT_BASE_URL = 'https://api.agify.io'
export const AGIFY_DEFAULT_NAME = 'michael'

export type AgifyQuery = {
  name: string
  countryId?: string | undefined
}

export type AgifyRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type AgifyPrediction = {
  name: string
  age: number | null
  count: number
  countryId?: string | undefined
  rateLimit: AgifyRateLimit
}

export class AgifyClient {
  constructor(private readonly baseUrl = AGIFY_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async predict(query: AgifyQuery): Promise<AgifyPrediction> {
    const url = this.createUrl()
    url.searchParams.set('name', query.name)
    if (query.countryId !== undefined) {
      url.searchParams.set('country_id', query.countryId)
    }

    const { parsed, rateLimit } = await this.fetchJson(url)
    if (!isRecord(parsed) || typeof parsed.name !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Agify response did not include a name.')
    }
    if (typeof parsed.count !== 'number') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Agify response did not include a count.')
    }
    if (typeof parsed.age !== 'number' && parsed.age !== null) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Agify response did not include an age or null age.')
    }

    return {
      name: parsed.name,
      age: parsed.age,
      count: parsed.count,
      ...(typeof parsed.country_id === 'string' ? { countryId: parsed.country_id } : {}),
      rateLimit,
    }
  }

  private createUrl(): URL {
    return new URL(normalizeBaseUrl(this.baseUrl))
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: AgifyRateLimit }> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Agify request failed: ${String(error)}`, {
        provider: 'agify',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Agify request failed with HTTP ${response.status}.`, {
        provider: 'agify',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return { parsed: await response.json(), rateLimit: readRateLimit(response.headers) }
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Agify response was not JSON: ${String(error)}`, {
        provider: 'agify',
        url: url.toString(),
      })
    }
  }
}

export function normalizeAgifyQuery(input: { name?: string | undefined; countryId?: string | undefined } = {}): AgifyQuery {
  return {
    name: normalizeName(input.name),
    ...(input.countryId !== undefined && input.countryId.trim() !== '' ? { countryId: normalizeCountryId(input.countryId) } : {}),
  }
}

function normalizeName(value: string | undefined): string {
  const name = value?.trim() ?? AGIFY_DEFAULT_NAME
  if (name.length < 1 || name.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Agify --name must be between 1 and 80 characters.', { name: value })
  }
  if (!/^[\p{L}\p{M}' -]+$/u.test(name)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Agify --name supports letters, spaces, apostrophes, and hyphens only.', { name: value })
  }
  return name
}

function normalizeCountryId(value: string): string {
  const countryId = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(countryId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Agify --country-id must be a two-letter ISO 3166-1 alpha-2 code.', {
      countryId: value,
    })
  }
  return countryId
}

function readRateLimit(headers: Headers): AgifyRateLimit {
  return {
    limit: headers.get('x-rate-limit-limit') ?? undefined,
    remaining: headers.get('x-rate-limit-remaining') ?? undefined,
    reset: headers.get('x-rate-limit-reset') ?? undefined,
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
