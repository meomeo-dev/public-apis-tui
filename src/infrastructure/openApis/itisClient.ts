import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ITIS_DEFAULT_BASE_URL = 'https://www.itis.gov/ITISWebService/jsonservice'

export type ItisScientificName = {
  tsn: string
  combinedName: string
  author?: string | undefined
  kingdom?: string | undefined
  unitName1?: string | undefined
  unitName2?: string | undefined
}

export type ItisCommonName = {
  tsn?: string | undefined
  commonName: string
  language?: string | undefined
}

export type ItisSynonym = {
  tsn: string
  scientificName: string
  author?: string | undefined
}

export type ItisJurisdictionalOrigin = {
  jurisdiction: string
  origin?: string | undefined
  updateDate?: string | undefined
}

export type ItisFullRecord = {
  tsn: string
  scientificName?: ItisScientificName | undefined
  commonNames: ItisCommonName[]
  synonyms: ItisSynonym[]
  hierarchy?: {
    tsn: string
    taxonName: string
    rankName?: string | undefined
    parentTsn?: string | undefined
    parentName?: string | undefined
  } | undefined
  usage?: string | undefined
  rank?: string | undefined
  kingdom?: string | undefined
  credibility?: string | undefined
  updateDate?: string | undefined
  jurisdictionalOrigins: ItisJurisdictionalOrigin[]
}

export class ItisClient {
  constructor(
    private readonly baseUrl = ITIS_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async searchByScientificName(
    query: { search: string },
  ): Promise<ItisScientificName[]> {
    const parsed = await this.fetchJson('searchByScientificName', {
      srchKey: query.search,
    })
    if (!isRecord(parsed) || !Array.isArray(parsed.scientificNames)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'ITIS scientific-name search response had an unexpected schema.',
      )
    }
    return parsed.scientificNames
      .map(parseScientificName)
      .filter((item): item is ItisScientificName => item !== undefined)
  }

  async getFullRecordFromTsn(tsn: string): Promise<ItisFullRecord> {
    const parsed = await this.fetchJson('getFullRecordFromTSN', { tsn })
    if (!isRecord(parsed) || readString(parsed.tsn) === undefined) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'ITIS full-record response had an unexpected schema.',
        { tsn },
      )
    }

    return {
      tsn,
      ...(parseScientificName(parsed.scientificName) !== undefined
        ? { scientificName: parseScientificName(parsed.scientificName) }
        : {}),
      commonNames: readNestedArray(parsed.commonNameList, 'commonNames')
        .map(parseCommonName)
        .filter((item): item is ItisCommonName => item !== undefined),
      synonyms: readNestedArray(parsed.synonymList, 'synonyms')
        .map(parseSynonym)
        .filter((item): item is ItisSynonym => item !== undefined),
      ...(parseHierarchy(parsed.hierarchyUp) !== undefined
        ? { hierarchy: parseHierarchy(parsed.hierarchyUp) }
        : {}),
      ...readNestedString(parsed.usage, 'taxonUsageRating', 'usage'),
      ...readNestedString(parsed.taxRank, 'rankName', 'rank'),
      ...readNestedString(parsed.kingdom, 'kingdomName', 'kingdom'),
      ...readNestedString(parsed.credibilityRating, 'credRating', 'credibility'),
      ...readNestedString(parsed.dateData, 'updateDate', 'updateDate'),
      jurisdictionalOrigins: readNestedArray(
        parsed.jurisdictionalOriginList,
        'jurisdictionalOrigins',
      )
        .map(parseJurisdictionalOrigin)
        .filter((item): item is ItisJurisdictionalOrigin => item !== undefined),
    }
  }

  private async fetchJson(
    operation: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const url = new URL(`${normalizeBaseUrl(this.baseUrl)}/${operation}`)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json,text/json',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `ITIS request failed: ${String(error)}`,
        { provider: 'itis', url: url.toString() },
      )
    }

    const text = await response.text()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'ITIS is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    if (text.trim() === '') {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'ITIS returned an empty response instead of the documented JSON',
          'payload; verify the query or TSN and retry later.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'ITIS response was not JSON.',
        {
          ...createResponseDetails(response, url),
          preview: text.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `ITIS request failed with HTTP ${response.status}.`,
        {
          ...createResponseDetails(response, url),
          response: parsed,
        },
      )
    }

    return parsed
  }
}

export function normalizeItisTsn(value: unknown): string {
  const normalized = String(value ?? '').trim()
  if (/^[0-9]{1,12}$/u.test(normalized)) return normalized
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    'ITIS TSN must contain 1 to 12 digits.',
    { tsn: value },
  )
}

function parseScientificName(value: unknown): ItisScientificName | undefined {
  if (!isRecord(value)) return undefined
  const tsn = readString(value.tsn)
  const combinedName = readString(value.combinedName)
  if (tsn === undefined || combinedName === undefined) return undefined
  return {
    tsn,
    combinedName,
    ...readOptional('author', value.author),
    ...readOptional('kingdom', value.kingdom),
    ...readOptional('unitName1', value.unitName1),
    ...readOptional('unitName2', value.unitName2),
  }
}

function parseCommonName(value: unknown): ItisCommonName | undefined {
  if (!isRecord(value)) return undefined
  const commonName = readString(value.commonName)
  if (commonName === undefined) return undefined
  return {
    commonName,
    ...readOptional('tsn', value.tsn),
    ...readOptional('language', value.language),
  }
}

function parseSynonym(value: unknown): ItisSynonym | undefined {
  if (!isRecord(value)) return undefined
  const tsn = readString(value.tsn)
  const scientificName = readString(value.sciName)
  if (tsn === undefined || scientificName === undefined) return undefined
  return {
    tsn,
    scientificName,
    ...readOptional('author', value.author),
  }
}

function parseHierarchy(value: unknown): ItisFullRecord['hierarchy'] | undefined {
  if (!isRecord(value)) return undefined
  const tsn = readString(value.tsn)
  const taxonName = readString(value.taxonName)
  if (tsn === undefined || taxonName === undefined) return undefined
  return {
    tsn,
    taxonName,
    ...readOptional('rankName', value.rankName),
    ...readOptional('parentTsn', value.parentTsn),
    ...readOptional('parentName', value.parentName),
  }
}

function parseJurisdictionalOrigin(
  value: unknown,
): ItisJurisdictionalOrigin | undefined {
  if (!isRecord(value)) return undefined
  const jurisdiction = readString(value.jurisdictionValue)
  if (jurisdiction === undefined) return undefined
  return {
    jurisdiction,
    ...readOptional('origin', value.origin),
    ...readOptional('updateDate', value.updateDate),
  }
}

function readNestedArray(value: unknown, key: string): unknown[] {
  if (!isRecord(value) || !Array.isArray(value[key])) return []
  return value[key].filter(item => item !== null)
}

function readNestedString(
  value: unknown,
  upstreamKey: string,
  outputKey: string,
): Record<string, string> {
  if (!isRecord(value)) return {}
  const result = readString(value[upstreamKey])
  return result === undefined ? {} : { [outputKey]: result }
}

function readOptional(key: string, value: unknown): Record<string, string> {
  const result = readString(value)
  return result === undefined ? {} : { [key]: result }
}

function createResponseDetails(response: Response, url: URL): Record<string, unknown> {
  return {
    provider: 'itis',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      /<title>\s*just a moment/i.test(body)
    )
  )
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
