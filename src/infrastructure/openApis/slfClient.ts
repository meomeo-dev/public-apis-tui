import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const SLF_DATA_URL = 'https://slftool.github.io/data.json'
export const SLF_DOCS_URL = 'https://slftool.github.io/API.md'
export const SLF_DEFAULT_LETTER = 'a'
export const SLF_DEFAULT_CATEGORY = 'stadt'
export const SLF_DEFAULT_LIMIT = 10
export const SLF_MAX_LIMIT = 50

export type SlfCategory = 'stadt' | 'land' | 'fluss' | 'name' | 'beruf' | 'tier' | 'marke' | 'pflanze'

export type SlfLookupInput = {
  letter?: string | undefined
  category?: SlfCategory | string | undefined
  limit?: number | undefined
}

export type NormalizedSlfLookupInput = {
  letter: string
  category: SlfCategory
  limit: number
}

export type SlfLookup = {
  values: string[]
  availableCategories: SlfCategory[]
}

type SlfClientOptions = {
  dataUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

const CATEGORIES: SlfCategory[] = ['stadt', 'land', 'fluss', 'name', 'beruf', 'tier', 'marke', 'pflanze']

export class SlfClient {
  constructor(private readonly options: SlfClientOptions = {}) {}

  async lookup(input: NormalizedSlfLookupInput): Promise<SlfLookup> {
    const url = new URL(this.options.dataUrl ?? SLF_DATA_URL)
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'SLF response was not a JSON object.', { provider: 'slf', response: parsed })
    }
    const byLetter = parsed[input.letter]
    if (!isRecord(byLetter)) {
      return { values: [], availableCategories: [] }
    }
    const availableCategories = CATEGORIES.filter(category => Array.isArray(byLetter[category]))
    const rawValues = byLetter[input.category]
    const values = Array.isArray(rawValues) ? rawValues.filter((value): value is string => typeof value === 'string' && value.trim() !== '').map(value => value.trim()).slice(0, input.limit) : []
    return { values, availableCategories }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `SLF request failed: ${String(error)}`, {
        provider: 'slf',
        endpoint: url.href,
      })
    }
    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `SLF response body could not be read: ${String(error)}`, {
        provider: 'slf',
        endpoint: url.href,
        status: response.status,
      })
    }
    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'SLF is currently returning a Cloudflare challenge HTML page instead of the documented static JSON response; retry later or use cached/offline data.', {
        provider: 'slf',
        endpoint: url.href,
        status: response.status,
      })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `SLF returned a non-JSON response: ${String(error)}`, {
        provider: 'slf',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `SLF request failed with HTTP ${response.status}.`, {
        provider: 'slf',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeSlfLookupInput(input: SlfLookupInput = {}): NormalizedSlfLookupInput {
  return {
    letter: normalizeLetter(input.letter),
    category: normalizeCategory(input.category),
    limit: normalizeInteger(input.limit, SLF_DEFAULT_LIMIT, 1, SLF_MAX_LIMIT, '--limit'),
  }
}

function normalizeLetter(value: string | undefined): string {
  const letter = (value ?? SLF_DEFAULT_LETTER).trim().toLowerCase()
  if (!/^[a-zäöü]$/u.test(letter)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--letter must be a single supported letter such as a, b, or z.')
  }
  return letter
}

function normalizeCategory(value: string | undefined): SlfCategory {
  const category = (value ?? SLF_DEFAULT_CATEGORY).trim().toLowerCase()
  if (!CATEGORIES.includes(category as SlfCategory)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--category must be one of: ${CATEGORIES.join(', ')}.`)
  }
  return category as SlfCategory
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  const contentType = response.headers.get('content-type')?.toLowerCase()
  return (
    mitigated === 'challenge' ||
    body.includes('Just a moment...') ||
    ((response.status === 403 || response.status === 429) && server === 'cloudflare' && contentType?.includes('text/html') === true)
  )
}
