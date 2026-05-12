import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NVD_DEFAULT_LIMIT = 10
export const NVD_MAX_LIMIT = 50
export const NVD_DEFAULT_SEARCH = 'openssl'

type FetchImpl = typeof fetch

const severityValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type NvdSeverity = Lowercase<typeof severityValues[number]>

export type NvdCvesInput = {
  cveId?: string | undefined
  keyword?: string | undefined
  severity?: NvdSeverity | undefined
  limit?: number | undefined
}

export type NormalizedNvdCvesInput = {
  cveId?: string | undefined
  keyword?: string | undefined
  severity?: NvdSeverity | undefined
  limit: number
}

export type NvdCvss = {
  version: string
  source?: string | undefined
  type?: string | undefined
  vectorString?: string | undefined
  baseScore?: number | undefined
  baseSeverity?: string | undefined
}

export type NvdCve = {
  id: string
  sourceIdentifier?: string | undefined
  published?: string | undefined
  lastModified?: string | undefined
  status?: string | undefined
  description?: string | undefined
  cvss?: NvdCvss | undefined
  weaknesses: string[]
  referenceCount: number
  safeReferences: Array<{
    url: string
    source?: string | undefined
    tags: string[]
  }>
}

export type NvdResponseMeta = {
  totalResults: number
  returned: number
  resultsPerPage: number
  startIndex: number
  format?: string | undefined
  version?: string | undefined
  timestamp?: string | undefined
}

export class NvdClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listCves(
    input: NormalizedNvdCvesInput,
  ): Promise<{ meta: NvdResponseMeta; cves: NvdCve[] }> {
    const url = new URL('/rest/json/cves/2.0', 'https://services.nvd.nist.gov')
    url.searchParams.set('resultsPerPage', String(input.limit))
    if (input.cveId !== undefined) {
      url.searchParams.set('cveId', input.cveId)
    } else if (input.keyword !== undefined) {
      url.searchParams.set('keywordSearch', input.keyword)
    }
    if (input.severity !== undefined) {
      url.searchParams.set('cvssV3Severity', input.severity.toUpperCase())
    }
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || !Array.isArray(parsed.vulnerabilities)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'NVD CVE response had an unexpected schema.',
      )
    }
    const cves = parsed.vulnerabilities
      .map(parseVulnerability)
      .filter((entry): entry is NvdCve => entry !== undefined)
    return {
      meta: {
        totalResults: readNumber(parsed.totalResults) ?? cves.length,
        returned: cves.length,
        resultsPerPage: readNumber(parsed.resultsPerPage) ?? input.limit,
        startIndex: readNumber(parsed.startIndex) ?? 0,
        format: readString(parsed.format),
        version: readString(parsed.version),
        timestamp: readString(parsed.timestamp),
      },
      cves,
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `NVD API request failed: ${String(error)}`,
        {
          provider: 'nvd',
          endpoint: url.href,
        },
      )
    }
    const text = await response.text()
    const contentType = response.headers.get('content-type') ?? undefined
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'NVD is currently returning a Cloudflare challenge HTML page instead',
          'of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'nvd',
          endpoint: url.href,
          status: response.status,
          contentType,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'NVD API returned non-JSON content.',
        {
          provider: 'nvd',
          endpoint: url.href,
          status: response.status,
          contentType,
          preview: text.slice(0, 120),
        },
      )
    }
    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `NVD API request failed with HTTP ${response.status}.`,
        {
          provider: 'nvd',
          endpoint: url.href,
          status: response.status,
          contentType,
          response: parsed,
        },
      )
    }
    return parsed
  }
}

export function normalizeNvdCvesInput(
  input: NvdCvesInput = {},
): NormalizedNvdCvesInput {
  const cveId = normalizeCve(input.cveId)
  const keyword = normalizeKeyword(input.keyword)
  if (cveId !== undefined && keyword !== undefined) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Use either --cve-id or --keyword, not both.',
    )
  }
  const severity = normalizeSeverity(input.severity)
  return {
    cveId,
    keyword: cveId === undefined ? (keyword ?? NVD_DEFAULT_SEARCH) : undefined,
    severity,
    limit: normalizeInteger(
      input.limit,
      '--limit',
      NVD_DEFAULT_LIMIT,
      1,
      NVD_MAX_LIMIT,
    ),
  }
}

function parseVulnerability(value: unknown): NvdCve | undefined {
  const cve = isRecord(value) && isRecord(value.cve) ? value.cve : undefined
  const id = readString(cve?.id)
  if (cve === undefined || id === undefined) {
    return undefined
  }
  const references = Array.isArray(cve.references)
    ? cve.references.filter(isRecord)
    : []
  return {
    id,
    sourceIdentifier: readString(cve.sourceIdentifier),
    published: readString(cve.published),
    lastModified: readString(cve.lastModified),
    status: readString(cve.vulnStatus),
    description: readEnglishDescription(cve.descriptions),
    cvss: readBestCvss(cve.metrics),
    weaknesses: readWeaknesses(cve.weaknesses),
    referenceCount: references.length,
    safeReferences: references
      .map(parseReference)
      .filter((entry): entry is NvdCve['safeReferences'][number] => {
        return entry !== undefined
      })
      .slice(0, 5),
  }
}

function readBestCvss(value: unknown): NvdCvss | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  for (const key of [
    'cvssMetricV40',
    'cvssMetricV31',
    'cvssMetricV30',
    'cvssMetricV2',
  ]) {
    const entries = Array.isArray(value[key]) ? value[key].filter(isRecord) : []
    const primary = entries.find(entry => entry.type === 'Primary') ?? entries[0]
    const data = isRecord(primary?.cvssData) ? primary.cvssData : undefined
    const version = readString(data?.version)
    if (primary !== undefined && data !== undefined && version !== undefined) {
      return {
        version,
        source: readString(primary.source),
        type: readString(primary.type),
        vectorString: readString(data.vectorString),
        baseScore: readNumber(data.baseScore),
        baseSeverity: readString(data.baseSeverity),
      }
    }
  }
  return undefined
}

function readWeaknesses(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const weaknesses = new Set<string>()
  for (const entry of value.filter(isRecord)) {
    const descriptions = Array.isArray(entry.description)
      ? entry.description.filter(isRecord)
      : []
    for (const description of descriptions) {
      const weakness = readString(description.value)
      if (weakness !== undefined) {
        weaknesses.add(weakness)
      }
    }
  }
  return [...weaknesses]
}

function parseReference(
  value: Record<string, unknown>,
): NvdCve['safeReferences'][number] | undefined {
  const url = readString(value.url)
  if (url === undefined || !/^https:\/\//iu.test(url)) {
    return undefined
  }
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((entry): entry is string => typeof entry === 'string')
    : []
  const advisoryTagPattern =
    /advisory|vendor|third party|release notes|patch|mitigation|technical description/iu
  const safeTags = tags.filter(tag => {
    return advisoryTagPattern.test(tag)
  })
  if (safeTags.length === 0) {
    return undefined
  }
  return {
    url,
    source: readString(value.source),
    tags: safeTags.slice(0, 3),
  }
}

function readEnglishDescription(value: unknown): string | undefined {
  const descriptions = Array.isArray(value) ? value.filter(isRecord) : []
  const english = descriptions.find(entry => entry.lang === 'en')
  return normalizeWhitespace(readString(english?.value))
}

function normalizeCve(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const cveId = value.trim().toUpperCase()
  if (!/^CVE-\d{4}-\d{4,}$/u.test(cveId)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--cve-id must look like CVE-2024-3094.',
    )
  }
  return cveId
}

function normalizeKeyword(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const keyword = value.trim()
  if (keyword.length < 3 || keyword.length > 80) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--keyword must be between 3 and 80 characters.',
    )
  }
  return keyword
}

function normalizeSeverity(value: NvdSeverity | undefined): NvdSeverity | undefined {
  if (value === undefined) {
    return undefined
  }
  const severity = String(value).toLowerCase()
  if (!severityValues.map(entry => entry.toLowerCase()).includes(severity)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--severity must be one of low, medium, high, critical.',
    )
  }
  return severity as NvdSeverity
}

function normalizeInteger(
  value: number | undefined,
  name: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${name} must be an integer between ${min} and ${max}.`,
    )
  }
  return normalized
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeWhitespace(value: string | undefined): string | undefined {
  return value?.replace(/\s+/gu, ' ').trim()
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const normalizedBody = body.toLowerCase()
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      normalizedBody.includes('just a moment') ||
      normalizedBody.includes('captcha') ||
      normalizedBody.includes('waf')
    )
  )
}
