import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MSRC_DEFAULT_LIMIT = 20
export const MSRC_MAX_LIMIT = 50
export const MSRC_DEFAULT_ORDER = 'releaseDate desc'

type FetchImpl = typeof fetch

const severityIds = {
  critical: 100000000,
  important: 100000001,
  moderate: 100000002,
  low: 100000003,
  none: 100000004,
} as const

export type MsrcSeverity = keyof typeof severityIds

export type MsrcVulnerabilitiesInput = {
  releaseNumber?: string | undefined
  cve?: string | undefined
  severity?: MsrcSeverity | undefined
  limit?: number | undefined
}

export type NormalizedMsrcVulnerabilitiesInput = {
  releaseNumber?: string | undefined
  cve?: string | undefined
  severity?: MsrcSeverity | undefined
  limit: number
}

export type MsrcVulnerability = {
  id: string
  cveNumber: string
  title: string
  releaseNumber?: string | undefined
  releaseDate?: string | undefined
  latestRevisionDate?: string | undefined
  vulnerabilityType?: string | undefined
  severity?: string | undefined
  severityId?: number | undefined
  impact?: string | undefined
  impactId?: number | undefined
  issuingCna?: string | undefined
  tag?: string | undefined
  customerActionRequired?: boolean | undefined
  mitreUrl?: string | undefined
  summary?: string | undefined
  revisionCount: number
  articleCount: number
}

export type MsrcResponseMeta = {
  totalMatched: number
  returned: number
  odataContext?: string | undefined
}

export class MsrcClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listVulnerabilities(
    input: NormalizedMsrcVulnerabilitiesInput,
  ): Promise<{ meta: MsrcResponseMeta; vulnerabilities: MsrcVulnerability[] }> {
    const url = new URL(
      '/sug/v2.0/en-US/vulnerability',
      'https://api.msrc.microsoft.com',
    )
    url.searchParams.set('$top', String(input.limit))
    url.searchParams.set('$orderby', MSRC_DEFAULT_ORDER)
    const filters = buildFilters(input)
    if (filters.length > 0) {
      url.searchParams.set('$filter', filters.join(' and '))
    }
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || !Array.isArray(parsed.value)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'MSRC vulnerability response had an unexpected schema.',
      )
    }
    const vulnerabilities = parsed.value
      .map(parseVulnerability)
      .filter((entry): entry is MsrcVulnerability => entry !== undefined)
    return {
      meta: {
        totalMatched: readNumber(parsed['@odata.count']) ?? vulnerabilities.length,
        returned: vulnerabilities.length,
        odataContext: readString(parsed['@odata.context']),
      },
      vulnerabilities,
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
        `MSRC API request failed: ${String(error)}`,
        {
          provider: 'msrc',
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
          'MSRC is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'msrc',
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
        'MSRC API returned non-JSON content.',
        {
          provider: 'msrc',
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
        `MSRC API request failed with HTTP ${response.status}.`,
        {
          provider: 'msrc',
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

export function normalizeMsrcVulnerabilitiesInput(
  input: MsrcVulnerabilitiesInput = {},
): NormalizedMsrcVulnerabilitiesInput {
  const cve = normalizeCve(input.cve)
  const releaseNumber = normalizeReleaseNumber(input.releaseNumber)
  if (cve !== undefined && releaseNumber !== undefined) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Use either --cve or --release-number, not both.',
    )
  }
  return {
    cve,
    releaseNumber,
    severity: normalizeSeverity(input.severity),
    limit: normalizeInteger(
      input.limit,
      '--limit',
      MSRC_DEFAULT_LIMIT,
      1,
      MSRC_MAX_LIMIT,
    ),
  }
}

function buildFilters(input: NormalizedMsrcVulnerabilitiesInput): string[] {
  const filters: string[] = []
  if (input.cve !== undefined) {
    filters.push(`cveNumber eq '${input.cve}'`)
  }
  if (input.releaseNumber !== undefined) {
    filters.push(`releaseNumber eq '${input.releaseNumber}'`)
  }
  if (input.severity !== undefined) {
    filters.push(`severityId eq ${String(severityIds[input.severity])}`)
  }
  return filters
}

function parseVulnerability(value: unknown): MsrcVulnerability | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readString(value.id)
  const cveNumber = readString(value.cveNumber)
  const title = readString(value.cveTitle)
  if (id === undefined || cveNumber === undefined || title === undefined) {
    return undefined
  }
  const severityId = readNumber(value.severityId)
  const impactId = readNumber(value.impactId)
  const summary = readString(value.unformattedDescription) ??
    cleanHtml(readString(value.description))
  return {
    id,
    cveNumber,
    title,
    releaseNumber: readString(value.releaseNumber),
    releaseDate: readString(value.releaseDate),
    latestRevisionDate: readString(value.latestRevisionDate),
    vulnerabilityType: readString(value.vulnType),
    severity: severityId === undefined ? undefined : mapSeverity(severityId),
    severityId,
    impact: impactId === undefined ? undefined : mapImpact(impactId),
    impactId,
    issuingCna: readString(value.issuingCna),
    tag: readString(value.tag),
    customerActionRequired: typeof value.customerActionRequired === 'boolean'
      ? value.customerActionRequired
      : undefined,
    mitreUrl: readString(value.mitreUrl),
    summary,
    revisionCount: Array.isArray(value.revisions) ? value.revisions.length : 0,
    articleCount: Array.isArray(value.articles) ? value.articles.length : 0,
  }
}

function normalizeCve(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const cve = value.trim().toUpperCase()
  if (!/^CVE-\d{4}-\d{4,}$/u.test(cve)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--cve must look like CVE-2026-12345.',
    )
  }
  return cve
}

function normalizeReleaseNumber(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const releaseNumber = value.trim()
  if (!/^\d{4}-[A-Za-z]{3,9}$/u.test(releaseNumber)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--release-number must look like 2026-May.',
    )
  }
  return releaseNumber
}

function normalizeSeverity(value: MsrcSeverity | undefined): MsrcSeverity | undefined {
  if (value === undefined) {
    return undefined
  }
  const severity = String(value).toLowerCase()
  if (!isMsrcSeverity(severity)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--severity must be one of critical, important, moderate, low, none.',
    )
  }
  return severity
}

function isMsrcSeverity(value: string): value is MsrcSeverity {
  return Object.hasOwn(severityIds, value)
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

function mapSeverity(value: number): string {
  switch (value) {
    case 100000000:
      return 'Critical'
    case 100000001:
      return 'Important'
    case 100000002:
      return 'Moderate'
    case 100000003:
      return 'Low'
    case 100000004:
      return 'None'
    case 0:
      return 'Unspecified'
    default:
      return `Unknown (${String(value)})`
  }
}

function mapImpact(value: number): string {
  switch (value) {
    case 100000005:
      return 'Remote Code Execution'
    case 100000002:
      return 'Elevation of Privilege'
    case 100000001:
      return 'Denial of Service'
    case 100000007:
      return 'Security Feature Bypass'
    case 100000003:
      return 'Information Disclosure'
    case 100000006:
      return 'Repudiation'
    case 100000009:
      return 'Tampering'
    case 100000008:
      return 'Spoofing'
    case 100000000:
      return 'Defense in Depth'
    case 100000004:
      return 'Not a Vulnerability'
    case 0:
      return 'None'
    default:
      return `Unknown (${String(value)})`
  }
}

function cleanHtml(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return value.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim()
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
