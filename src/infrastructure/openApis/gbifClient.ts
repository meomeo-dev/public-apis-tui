import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const GBIF_DEFAULT_BASE_URL = 'https://api.gbif.org/v1'
export const GBIF_DEFAULT_SPECIES_QUERY = 'Quercus robur'
export const GBIF_DEFAULT_OCCURRENCE_NAME = 'Quercus robur'
export const GBIF_DEFAULT_LIMIT = 10
export const GBIF_MAX_LIMIT = 50
export const GBIF_MAX_OFFSET = 10_000

const retryableStatuses = new Set([408, 429, 500, 502, 503, 504])

export type GbifClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type GbifSpeciesSearchQuery = {
  query: string
  rank?: string | undefined
  status?: string | undefined
  higherTaxonKey?: number | undefined
  limit: number
  offset: number
}

export type GbifOccurrenceSearchQuery = {
  scientificName: string
  country?: string | undefined
  year?: string | undefined
  basisOfRecord?: string | undefined
  hasCoordinate?: boolean | undefined
  limit: number
  offset: number
}

export type GbifSpeciesSearchPage = {
  count: number
  limit: number
  offset: number
  endOfRecords?: boolean | undefined
  results: GbifSpeciesUsage[]
}

export type GbifOccurrenceSearchPage = {
  count: number
  limit: number
  offset: number
  endOfRecords?: boolean | undefined
  results: GbifOccurrenceRecord[]
}

export type GbifSpeciesUsage = {
  key?: number | undefined
  nubKey?: number | undefined
  scientificName?: string | undefined
  canonicalName?: string | undefined
  kingdom?: string | undefined
  phylum?: string | undefined
  class?: string | undefined
  order?: string | undefined
  family?: string | undefined
  genus?: string | undefined
  species?: string | undefined
  rank?: string | undefined
  taxonomicStatus?: string | undefined
  nameType?: string | undefined
  synonym?: boolean | undefined
  numOccurrences?: number | undefined
}

export type GbifOccurrenceRecord = {
  key?: number | undefined
  gbifID?: string | undefined
  scientificName?: string | undefined
  acceptedScientificName?: string | undefined
  kingdom?: string | undefined
  phylum?: string | undefined
  class?: string | undefined
  order?: string | undefined
  family?: string | undefined
  genus?: string | undefined
  species?: string | undefined
  country?: string | undefined
  countryCode?: string | undefined
  decimalLatitude?: number | undefined
  decimalLongitude?: number | undefined
  eventDate?: string | undefined
  year?: number | undefined
  basisOfRecord?: string | undefined
  datasetKey?: string | undefined
  datasetTitle?: string | undefined
  publishingOrgKey?: string | undefined
  license?: string | undefined
  issues?: string[] | undefined
  media?: Array<Record<string, unknown>> | undefined
}

export class GbifClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: GbifClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? GBIF_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async searchSpecies(query: GbifSpeciesSearchQuery): Promise<GbifSpeciesSearchPage> {
    const url = new URL(`${this.baseUrl}/species/search`)
    url.searchParams.set('q', query.query)
    appendOptionalStringParam(url, 'rank', query.rank)
    appendOptionalStringParam(url, 'status', query.status)
    appendOptionalNumberParam(url, 'higherTaxonKey', query.higherTaxonKey)
    url.searchParams.set('limit', String(query.limit))
    url.searchParams.set('offset', String(query.offset))
    return parseSpeciesSearchPage(await this.getJson(url))
  }

  async searchOccurrences(
    query: GbifOccurrenceSearchQuery,
  ): Promise<GbifOccurrenceSearchPage> {
    const url = new URL(`${this.baseUrl}/occurrence/search`)
    url.searchParams.set('scientificName', query.scientificName)
    appendOptionalStringParam(url, 'country', query.country)
    appendOptionalStringParam(url, 'year', query.year)
    appendOptionalStringParam(url, 'basisOfRecord', query.basisOfRecord)
    appendOptionalBooleanParam(url, 'hasCoordinate', query.hasCoordinate)
    url.searchParams.set('limit', String(query.limit))
    url.searchParams.set('offset', String(query.offset))
    return parseOccurrenceSearchPage(await this.getJson(url))
  }

  private async getJson(url: URL): Promise<unknown> {
    const response = await this.fetchWithRetry(url)
    const body = await response.text()

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'GBIF is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'gbif',
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type') ?? undefined,
          url: url.toString(),
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'GBIF API returned non-JSON content.',
        {
          provider: 'gbif',
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type') ?? undefined,
          url: url.toString(),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed), {
        provider: 'gbif',
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type') ?? undefined,
        url: url.toString(),
        response: parsed,
      })
    }

    return parsed
  }

  private async fetchWithRetry(url: URL): Promise<Response> {
    const maxAttempts = 3
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'user-agent': [
              'public-apis-tui no-auth CLI',
              '(https://github.com/public-apis/public-apis)',
            ].join(' '),
          },
        })
        if (!retryableStatuses.has(response.status) || attempt === maxAttempts) {
          return response
        }
      } catch (error) {
        lastError = error
        if (attempt === maxAttempts) {
          throw new RuntimeFailure(
            'OPEN_API_FAILED',
            'GBIF API request failed after retrying transient network errors.',
            { cause: error instanceof Error ? error.message : String(error) },
          )
        }
      }
      await delay(400 * attempt)
    }
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'GBIF API request failed after retrying transient network errors.',
      { cause: lastError instanceof Error ? lastError.message : String(lastError) },
    )
  }
}

function parseSpeciesSearchPage(value: unknown): GbifSpeciesSearchPage {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'GBIF species response must be an object.',
    )
  }
  return {
    count: readNumber(value, 'count'),
    limit: readNumber(value, 'limit'),
    offset: readNumber(value, 'offset'),
    endOfRecords: readOptionalBoolean(value, 'endOfRecords'),
    results: readResults(value).map(parseSpeciesUsage),
  }
}

function parseOccurrenceSearchPage(value: unknown): GbifOccurrenceSearchPage {
  if (!isRecord(value)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'GBIF occurrence response must be an object.',
    )
  }
  return {
    count: readNumber(value, 'count'),
    limit: readNumber(value, 'limit'),
    offset: readNumber(value, 'offset'),
    endOfRecords: readOptionalBoolean(value, 'endOfRecords'),
    results: readResults(value).map(parseOccurrenceRecord),
  }
}

function parseSpeciesUsage(value: Record<string, unknown>): GbifSpeciesUsage {
  return {
    key: readOptionalNumber(value, 'key'),
    nubKey: readOptionalNumber(value, 'nubKey'),
    scientificName: readOptionalString(value, 'scientificName'),
    canonicalName: readOptionalString(value, 'canonicalName'),
    kingdom: readOptionalString(value, 'kingdom'),
    phylum: readOptionalString(value, 'phylum'),
    class: readOptionalString(value, 'class'),
    order: readOptionalString(value, 'order'),
    family: readOptionalString(value, 'family'),
    genus: readOptionalString(value, 'genus'),
    species: readOptionalString(value, 'species'),
    rank: readOptionalString(value, 'rank'),
    taxonomicStatus: readOptionalString(value, 'taxonomicStatus'),
    nameType: readOptionalString(value, 'nameType'),
    synonym: readOptionalBoolean(value, 'synonym'),
    numOccurrences: readOptionalNumber(value, 'numOccurrences'),
  }
}

function parseOccurrenceRecord(value: Record<string, unknown>): GbifOccurrenceRecord {
  return {
    key: readOptionalNumber(value, 'key'),
    gbifID: readOptionalString(value, 'gbifID'),
    scientificName: readOptionalString(value, 'scientificName'),
    acceptedScientificName: readOptionalString(value, 'acceptedScientificName'),
    kingdom: readOptionalString(value, 'kingdom'),
    phylum: readOptionalString(value, 'phylum'),
    class: readOptionalString(value, 'class'),
    order: readOptionalString(value, 'order'),
    family: readOptionalString(value, 'family'),
    genus: readOptionalString(value, 'genus'),
    species: readOptionalString(value, 'species'),
    country: readOptionalString(value, 'country'),
    countryCode: readOptionalString(value, 'countryCode'),
    decimalLatitude: readOptionalNumber(value, 'decimalLatitude'),
    decimalLongitude: readOptionalNumber(value, 'decimalLongitude'),
    eventDate: readOptionalString(value, 'eventDate'),
    year: readOptionalNumber(value, 'year'),
    basisOfRecord: readOptionalString(value, 'basisOfRecord'),
    datasetKey: readOptionalString(value, 'datasetKey'),
    datasetTitle: readOptionalString(value, 'datasetTitle'),
    publishingOrgKey: readOptionalString(value, 'publishingOrgKey'),
    license: readOptionalString(value, 'license'),
    issues: readOptionalStringArray(value, 'issues'),
    media: readOptionalRecordArray(value, 'media'),
  }
}

function readResults(value: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(value.results)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'GBIF response must include results.')
  }
  return value.results.filter(isRecord)
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `GBIF field ${key} must be a number.`)
  }
  return value
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

function readOptionalBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  return typeof record[key] === 'boolean' ? record[key] : undefined
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readOptionalStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = record[key]
  if (!Array.isArray(value)) return undefined
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function readOptionalRecordArray(
  record: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> | undefined {
  const value = record[key]
  return Array.isArray(value) ? value.filter(isRecord) : undefined
}

function readErrorMessage(value: unknown): string {
  if (!isRecord(value)) return 'GBIF API request failed.'
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== ''
    ? message
    : 'GBIF API request failed.'
}

function appendOptionalStringParam(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(key, value)
  }
}

function appendOptionalNumberParam(
  url: URL,
  key: string,
  value: number | undefined,
): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function appendOptionalBooleanParam(
  url: URL,
  key: string,
  value: boolean | undefined,
): void {
  if (value !== undefined) {
    url.searchParams.set(key, String(value))
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const challengeStatus = response.status === 403 || response.status === 429
  if (mitigated === 'challenge') return true
  if (!challengeStatus || !contentType.includes('text/html')) return false
  return (
    server.includes('cloudflare') ||
    body.includes('<title>Just a moment...</title>') ||
    body.includes('cf-browser-verification') ||
    body.includes('Checking your browser before accessing')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
