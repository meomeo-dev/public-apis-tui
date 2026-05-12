import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const INDIAN_PINCODE_DEFAULT_QUERY = 'mumbai'
export const INDIAN_PINCODE_DEFAULT_LIMIT = 10
export const INDIAN_PINCODE_MAX_LIMIT = 10
export const INDIAN_PINCODE_DEFAULT_TYPE = 'all'

type FetchImpl = typeof fetch

export type IndianPincodeResultType = 'all' | 'state' | 'district' | 'pincode'

export type IndianPincodeSearchInput = {
  query?: string | undefined
  limit?: number | undefined
  type?: IndianPincodeResultType | undefined
}

export type NormalizedIndianPincodeSearchInput = {
  query: string
  limit: number
  type: IndianPincodeResultType
}

export type IndianPincodeSearchResult =
  | {
    type: 'state'
    stateName: string
    stateSlug?: string | undefined
    pincodesCount?: number | undefined
  }
  | {
    type: 'district'
    districtName: string
    districtSlug?: string | undefined
    stateName?: string | undefined
    stateSlug?: string | undefined
    pincodesCount?: number | undefined
  }
  | {
    type: 'pincode'
    code: string
    postOfficeName?: string | undefined
    districtName?: string | undefined
    districtSlug?: string | undefined
    stateName?: string | undefined
    stateSlug?: string | undefined
    area?: string | undefined
    officeType?: string | undefined
  }

export class IndianPincodeClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined } = {}) {}

  async search(input: NormalizedIndianPincodeSearchInput): Promise<{ results: IndianPincodeSearchResult[]; upstreamCount: number }> {
    const url = new URL('/api/search', 'https://indianpincode.com')
    url.searchParams.set('q', input.query)
    const parsed = await this.fetchJson(url)
    const rawResults = parseResults(parsed)
    const filteredResults = input.type === 'all' ? rawResults : rawResults.filter(result => result.type === input.type)
    return {
      results: filteredResults.slice(0, input.limit),
      upstreamCount: rawResults.length,
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
      },
    })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Indian Pincode returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Indian Pincode request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeIndianPincodeSearchInput(input: IndianPincodeSearchInput = {}): NormalizedIndianPincodeSearchInput {
  return {
    query: normalizeQuery(input.query),
    limit: normalizeLimit(input.limit),
    type: normalizeType(input.type),
  }
}

function parseResults(value: unknown): IndianPincodeSearchResult[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Indian Pincode search response had an unexpected schema.')
  }
  return value.results.map(parseResult).filter((entry): entry is IndianPincodeSearchResult => entry !== undefined)
}

function parseResult(value: unknown): IndianPincodeSearchResult | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const type = readString(value.type)
  if (type === 'state') {
    const stateName = readString(value.stateName)
    if (stateName === undefined) {
      return undefined
    }
    return {
      type,
      stateName,
      stateSlug: readString(value.stateSlug),
      pincodesCount: readNumber(value.pincodesCount),
    }
  }
  if (type === 'district') {
    const districtName = readString(value.districtName)
    if (districtName === undefined) {
      return undefined
    }
    return {
      type,
      districtName,
      districtSlug: readString(value.districtSlug),
      stateName: readString(value.stateName),
      stateSlug: readString(value.stateSlug),
      pincodesCount: readNumber(value.pincodesCount),
    }
  }
  if (type === 'pincode') {
    const code = readString(value.code)
    if (code === undefined) {
      return undefined
    }
    return {
      type,
      code,
      postOfficeName: readString(value.postOfficeName),
      districtName: readString(value.districtName),
      districtSlug: readString(value.districtSlug),
      stateName: readString(value.stateName),
      stateSlug: readString(value.stateSlug),
      area: readString(value.area),
      officeType: readString(value.officeType),
    }
  }
  return undefined
}

function normalizeQuery(value: string | undefined): string {
  const normalized = (value ?? INDIAN_PINCODE_DEFAULT_QUERY).trim()
  if (normalized.length < 2 || normalized.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Indian Pincode --query must be 2 to 80 characters.', { query: value })
  }
  return normalized
}

function normalizeLimit(value: number | undefined): number {
  const normalized = value ?? INDIAN_PINCODE_DEFAULT_LIMIT
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > INDIAN_PINCODE_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Indian Pincode --limit must be an integer from 1 to ${INDIAN_PINCODE_MAX_LIMIT}.`, { limit: value })
  }
  return normalized
}

function normalizeType(value: IndianPincodeResultType | undefined): IndianPincodeResultType {
  const normalized = value ?? INDIAN_PINCODE_DEFAULT_TYPE
  if (!['all', 'state', 'district', 'pincode'].includes(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Indian Pincode --type must be one of all, state, district, or pincode.', { type: value })
  }
  return normalized
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
