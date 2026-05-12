import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WHISKY_HUNTER_DEFAULT_BASE_URL = 'https://whiskyhunter.net'
export const WHISKY_HUNTER_DEFAULT_LIMIT = 313
export const WHISKY_HUNTER_MAX_LIMIT = 313

export type WhiskyHunterDistilleriesInput = {
  query?: string | undefined
  country?: string | undefined
  limit?: number | undefined
}

export type NormalizedWhiskyHunterDistilleriesInput = {
  limit: number
  query?: string | undefined
  country?: string | undefined
}

export type WhiskyHunterDistillery = {
  name: string
  slug: string
  country: string
}

export class WhiskyHunterClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listDistilleries(): Promise<WhiskyHunterDistillery[]> {
    const url = new URL('/api/distilleries_info/', this.options.baseUrl ?? WHISKY_HUNTER_DEFAULT_BASE_URL)
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-tui no-auth CLI (https://github.com/meomeo-dev/public-apis-tui)',
        },
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `WhiskyHunter request failed: ${String(error)}`, {
        provider: 'whiskyhunter',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `WhiskyHunter returned a non-JSON response: ${String(error)}`, {
        provider: 'whiskyhunter',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `WhiskyHunter request failed with HTTP ${response.status}.`, {
        provider: 'whiskyhunter',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'WhiskyHunter distilleries response must be an array.')
    }
    return parsed.map(parseDistillery)
  }
}

export function normalizeWhiskyHunterDistilleriesInput(input: WhiskyHunterDistilleriesInput = {}): NormalizedWhiskyHunterDistilleriesInput {
  return {
    limit: normalizeLimit(input.limit),
    ...(input.query !== undefined ? { query: normalizeText(input.query, '--query') } : {}),
    ...(input.country !== undefined ? { country: normalizeText(input.country, '--country') } : {}),
  }
}

export function filterWhiskyHunterDistilleries(distilleries: WhiskyHunterDistillery[], query: NormalizedWhiskyHunterDistilleriesInput): WhiskyHunterDistillery[] {
  const search = query.query?.toLowerCase()
  const country = query.country?.toLowerCase()
  return distilleries
    .filter(distillery => search === undefined || distillery.name.toLowerCase().includes(search) || distillery.slug.toLowerCase().includes(search))
    .filter(distillery => country === undefined || distillery.country.toLowerCase() === country)
    .slice(0, query.limit)
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? WHISKY_HUNTER_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > WHISKY_HUNTER_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer from 1 to ${WHISKY_HUNTER_MAX_LIMIT}.`)
  }
  return limit
}

function normalizeText(value: string, label: string): string {
  const text = value.trim()
  if (text.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return text
}

function parseDistillery(value: unknown): WhiskyHunterDistillery {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.slug !== 'string' || typeof value.country !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'WhiskyHunter distillery item had an unexpected schema.')
  }
  return {
    name: value.name,
    slug: value.slug,
    country: value.country,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
