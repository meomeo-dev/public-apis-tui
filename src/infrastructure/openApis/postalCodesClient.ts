import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const POSTAL_CODES_BASE_URL = 'https://postalcodes.info'
export const POSTAL_CODES_DOCS_URL = 'https://postalcodes.info/openapi.json'
export const POSTAL_CODES_DEFAULT_QUERY = '90210'
export const POSTAL_CODES_DEFAULT_COUNTRY = 'US'
export const POSTAL_CODES_DEFAULT_LIMIT = 10
export const POSTAL_CODES_MAX_LIMIT = 25

export type PostalCodesSearchInput = {
  query?: string | undefined
  country?: string | undefined
  limit?: number | undefined
}

export type NormalizedPostalCodesSearchInput = {
  query: string
  country?: string | undefined
  limit: number
}

export type PostalCodesSuggestion = {
  type: string
  text: string
  sub?: string | undefined
  url: string
}

type PostalCodesClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class PostalCodesClient {
  constructor(private readonly options: PostalCodesClientOptions = {}) {}

  async search(input: NormalizedPostalCodesSearchInput): Promise<PostalCodesSuggestion[]> {
    const url = new URL('/search', this.options.baseUrl ?? POSTAL_CODES_BASE_URL)
    url.searchParams.set('q', input.query)
    if (input.country !== undefined) {
      url.searchParams.set('country', input.country)
    }
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'PostalCodes.info search response was not a JSON array.', { provider: 'postalcodes', response: parsed })
    }
    return parsed.map(parseSuggestion).slice(0, input.limit)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostalCodes.info request failed: ${String(error)}`, {
        provider: 'postalcodes',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostalCodes.info response body could not be read: ${String(error)}`, {
        provider: 'postalcodes',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'PostalCodes.info is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'postalcodes',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostalCodes.info returned a non-JSON response: ${String(error)}`, {
        provider: 'postalcodes',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostalCodes.info request failed with HTTP ${response.status}.`, {
        provider: 'postalcodes',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizePostalCodesSearchInput(input: PostalCodesSearchInput = {}): NormalizedPostalCodesSearchInput {
  const query = (input.query ?? POSTAL_CODES_DEFAULT_QUERY).trim()
  if (query.length < 2) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must contain at least 2 characters.')
  }
  if (query.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 80 characters or fewer.')
  }
  const country = normalizeCountry(input.country)
  return {
    query,
    ...(country !== undefined ? { country } : {}),
    limit: normalizeInteger(input.limit, POSTAL_CODES_DEFAULT_LIMIT, 1, POSTAL_CODES_MAX_LIMIT, '--limit'),
  }
}

function normalizeCountry(value: string | undefined): string | undefined {
  const country = (value === undefined || value.trim() === '' ? POSTAL_CODES_DEFAULT_COUNTRY : value).trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(country)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--country must be an ISO 3166-1 alpha-2 code such as US, ES, or PT.')
  }
  return country
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function parseSuggestion(value: unknown): PostalCodesSuggestion {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PostalCodes.info suggestion had an unexpected schema.', { provider: 'postalcodes', response: value })
  }
  return {
    type: readRequiredString(value, 'type'),
    text: readRequiredString(value, 'text'),
    ...readOptionalStringAs(value, 'sub', 'sub'),
    url: readRequiredString(value, 'url'),
  }
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', `PostalCodes.info response did not include ${key}.`, { provider: 'postalcodes', response: record })
  }
  return value.trim()
}

function readOptionalStringAs(record: Record<string, unknown>, source: string, target: string): Record<string, string> {
  const value = record[source]
  return typeof value === 'string' && value.trim() !== '' ? { [target]: value.trim() } : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}
