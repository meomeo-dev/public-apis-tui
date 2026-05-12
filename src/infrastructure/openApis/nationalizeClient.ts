import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NATIONALIZE_DEFAULT_BASE_URL = 'https://api.nationalize.io'
export const NATIONALIZE_DEFAULT_NAME = 'michael'

export type NationalizeQuery = {
  name: string
}

export type NationalizeRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type NationalizeCountryPrediction = {
  countryId: string
  probability: number
}

export type NationalizePrediction = {
  name: string
  count: number
  countries: NationalizeCountryPrediction[]
  rateLimit: NationalizeRateLimit
}

export class NationalizeClient {
  constructor(private readonly baseUrl = NATIONALIZE_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async predict(query: NationalizeQuery): Promise<NationalizePrediction> {
    const url = new URL(normalizeBaseUrl(this.baseUrl))
    url.searchParams.set('name', query.name)

    const { parsed, rateLimit } = await this.fetchJson(url)
    if (!isRecord(parsed) || typeof parsed.name !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Nationalize response did not include a name.')
    }
    if (typeof parsed.count !== 'number') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Nationalize response did not include a count.')
    }
    if (!Array.isArray(parsed.country)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Nationalize response did not include a country array.')
    }

    return {
      name: parsed.name,
      count: parsed.count,
      countries: parsed.country.map(parseCountryPrediction),
      rateLimit,
    }
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: NationalizeRateLimit }> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nationalize request failed: ${String(error)}`, {
        provider: 'nationalize',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nationalize request failed with HTTP ${response.status}.`, {
        provider: 'nationalize',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return { parsed: await response.json(), rateLimit: readRateLimit(response.headers) }
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Nationalize response was not JSON: ${String(error)}`, {
        provider: 'nationalize',
        url: url.toString(),
      })
    }
  }
}

export function normalizeNationalizeQuery(input: { name?: string | undefined } = {}): NationalizeQuery {
  return {
    name: normalizeName(input.name),
  }
}

function parseCountryPrediction(value: unknown): NationalizeCountryPrediction {
  if (!isRecord(value) || typeof value.country_id !== 'string' || typeof value.probability !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Nationalize country row must include country_id and probability.')
  }
  if (value.probability < 0 || value.probability > 1) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Nationalize country probability must be between 0 and 1.')
  }
  return {
    countryId: value.country_id,
    probability: value.probability,
  }
}

function normalizeName(value: string | undefined): string {
  const name = value?.trim() ?? NATIONALIZE_DEFAULT_NAME
  if (name.length < 1 || name.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Nationalize --name must be between 1 and 80 characters.', { name: value })
  }
  if (!/^[\p{L}\p{M}' -]+$/u.test(name)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Nationalize --name supports letters, spaces, apostrophes, and hyphens only.', { name: value })
  }
  return name
}

function readRateLimit(headers: Headers): NationalizeRateLimit {
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
