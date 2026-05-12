import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ADMIN_DIVISIONS_DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/kamikazechaser/administrative-divisions-db/master/api'
export const ADMIN_DIVISIONS_DEFAULT_COUNTRY = 'KE'
export const ADMIN_DIVISIONS_DEFAULT_LIMIT = 100
export const ADMIN_DIVISIONS_MAX_LIMIT = 500

export type AdminDivisionsCountryInput = {
  country?: string | undefined
  limit?: number | undefined
}

export type NormalizedAdminDivisionsCountryInput = {
  country: string
  limit: number
}

export type AdminDivisionsClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class AdminDivisionsClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: AdminDivisionsClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? ADMIN_DIVISIONS_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listCountry(input: AdminDivisionsCountryInput | NormalizedAdminDivisionsCountryInput = {}): Promise<{ requestUrl: string; divisions: string[] }> {
    const query = normalizeAdminDivisionsCountryInput(input)
    const url = createAdminDivisionsCountryUrl(this.baseUrl, query.country)

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json, text/plain;q=0.9',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Administrative Divisions DB request failed: ${String(error)}`, {
        provider: 'admindivisions',
        endpoint: url.href,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Administrative Divisions DB request failed with HTTP ${response.status}.`, {
        provider: 'admindivisions',
        endpoint: url.href,
        status: response.status,
        responsePreview: body.slice(0, 300),
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Administrative Divisions DB returned invalid JSON: ${String(error)}`, {
        provider: 'admindivisions',
        endpoint: url.href,
        contentType,
        responsePreview: body.slice(0, 300),
      })
    }

    if (!Array.isArray(parsed) || parsed.some(entry => typeof entry !== 'string')) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Administrative Divisions DB response must be a JSON array of strings.', {
        provider: 'admindivisions',
        endpoint: url.href,
        contentType,
      })
    }

    return {
      requestUrl: url.href,
      divisions: parsed,
    }
  }
}

export function normalizeAdminDivisionsCountryInput(input: AdminDivisionsCountryInput = {}): NormalizedAdminDivisionsCountryInput {
  return {
    country: normalizeCountry(input.country),
    limit: normalizeLimit(input.limit),
  }
}

export function createAdminDivisionsCountryUrl(baseUrl: string, country: string): URL {
  return new URL(`${normalizeBaseUrl(baseUrl)}/${country}.json`)
}

function normalizeCountry(value: string | undefined): string {
  const country = (value ?? ADMIN_DIVISIONS_DEFAULT_COUNTRY).trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(country)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Administrative Divisions DB --country must be an ISO 3166-1 alpha-2 country code such as KE or US.', { country: value })
  }
  return country
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? ADMIN_DIVISIONS_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > ADMIN_DIVISIONS_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Administrative Divisions DB --limit must be an integer from 1 to ${String(ADMIN_DIVISIONS_MAX_LIMIT)}.`, { limit: value })
  }
  return limit
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}
