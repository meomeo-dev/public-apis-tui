import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GENDERIZE_DEFAULT_BASE_URL = 'https://api.genderize.io'
export const GENDERIZE_DEFAULT_NAME = 'michael'

export type GenderizeQuery = {
  name: string
  countryId?: string | undefined
}

export type GenderizeRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type GenderizePrediction = {
  name: string
  gender: 'male' | 'female' | null
  probability: number
  count: number
  countryId?: string | undefined
  rateLimit: GenderizeRateLimit
}

export class GenderizeClient {
  constructor(private readonly baseUrl = GENDERIZE_DEFAULT_BASE_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async predict(query: GenderizeQuery): Promise<GenderizePrediction> {
    const url = this.createUrl()
    url.searchParams.set('name', query.name)
    if (query.countryId !== undefined) {
      url.searchParams.set('country_id', query.countryId)
    }

    const { parsed, rateLimit } = await this.fetchJson(url)
    if (!isRecord(parsed) || typeof parsed.name !== 'string') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Genderize response did not include a name.')
    }
    if (typeof parsed.count !== 'number') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Genderize response did not include a count.')
    }
    if (parsed.gender !== 'male' && parsed.gender !== 'female' && parsed.gender !== null) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Genderize response did not include a gender or null gender.')
    }
    if (typeof parsed.probability !== 'number' || parsed.probability < 0 || parsed.probability > 1) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Genderize response did not include a probability between 0 and 1.')
    }

    return {
      name: parsed.name,
      gender: parsed.gender,
      probability: parsed.probability,
      count: parsed.count,
      ...(typeof parsed.country_id === 'string' ? { countryId: parsed.country_id } : {}),
      rateLimit,
    }
  }

  private createUrl(): URL {
    return new URL(normalizeBaseUrl(this.baseUrl))
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: GenderizeRateLimit }> {
    let response: Response
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Genderize request failed: ${String(error)}`, {
        provider: 'genderize',
        url: url.toString(),
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Genderize request failed with HTTP ${response.status}.`, {
        provider: 'genderize',
        status: response.status,
        url: url.toString(),
      })
    }

    try {
      return { parsed: await response.json(), rateLimit: readRateLimit(response.headers) }
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Genderize response was not JSON: ${String(error)}`, {
        provider: 'genderize',
        url: url.toString(),
      })
    }
  }
}

export function normalizeGenderizeQuery(input: { name?: string | undefined; countryId?: string | undefined } = {}): GenderizeQuery {
  return {
    name: normalizeName(input.name),
    ...(input.countryId !== undefined && input.countryId.trim() !== '' ? { countryId: normalizeCountryId(input.countryId) } : {}),
  }
}

function normalizeName(value: string | undefined): string {
  const name = value?.trim() ?? GENDERIZE_DEFAULT_NAME
  if (name.length < 1 || name.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Genderize --name must be between 1 and 80 characters.', { name: value })
  }
  if (!/^[\p{L}\p{M}' -]+$/u.test(name)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Genderize --name supports letters, spaces, apostrophes, and hyphens only.', { name: value })
  }
  return name
}

function normalizeCountryId(value: string): string {
  const countryId = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(countryId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Genderize --country-id must be a two-letter ISO 3166-1 alpha-2 code.', {
      countryId: value,
    })
  }
  return countryId
}

function readRateLimit(headers: Headers): GenderizeRateLimit {
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
