import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ARBEITNOW_DEFAULT_BASE_URL = 'https://www.arbeitnow.com'
export const ARBEITNOW_DEFAULT_PAGE = 1
export const ARBEITNOW_PAGE_SIZE = 100
export const ARBEITNOW_MAX_PAGE = 1000

export type ArbeitnowJobsInput = {
  page?: number | undefined
  visaSponsorship?: boolean | undefined
}

export type NormalizedArbeitnowJobsInput = {
  page: number
  visaSponsorship?: boolean | undefined
}

export type ArbeitnowJob = {
  slug: string
  companyName: string
  title: string
  descriptionHtml?: string | undefined
  descriptionText?: string | undefined
  remote: boolean
  url: string
  tags: string[]
  jobTypes: string[]
  location?: string | undefined
  createdAt?: number | undefined
  createdAtIso?: string | undefined
  visaSponsorship?: boolean | undefined
}

export type ArbeitnowPagination = {
  currentPage: number
  perPage: number
  from?: number | undefined
  to?: number | undefined
  nextUrl?: string | undefined
  prevUrl?: string | undefined
  firstUrl?: string | undefined
  lastUrl?: string | undefined
  terms?: string | undefined
  info?: string | undefined
}

export type ArbeitnowRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
}

export type ArbeitnowJobsEnvelope = {
  jobs: ArbeitnowJob[]
  pagination: ArbeitnowPagination
  rateLimit: ArbeitnowRateLimit
}

export class ArbeitnowClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listJobs(input: NormalizedArbeitnowJobsInput): Promise<ArbeitnowJobsEnvelope> {
    const url = this.createUrl('/api/job-board-api')
    url.searchParams.set('page', String(input.page))
    if (input.visaSponsorship !== undefined) {
      url.searchParams.set('visa_sponsorship', String(input.visaSponsorship))
    }

    const { parsed, rateLimit } = await this.fetchJson(url)
    return parseJobsEnvelope(parsed, rateLimit)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname.replace(/^\/+/u, ''), normalizeBaseUrl(this.options.baseUrl ?? ARBEITNOW_DEFAULT_BASE_URL))
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: ArbeitnowRateLimit }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Arbeitnow request failed: ${String(error)}`, {
        provider: 'arbeitnow',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Arbeitnow returned a non-JSON response: ${String(error)}`, {
        provider: 'arbeitnow',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Arbeitnow request failed with HTTP ${response.status}.`, {
        provider: 'arbeitnow',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeArbeitnowJobsInput(input: ArbeitnowJobsInput = {}): NormalizedArbeitnowJobsInput {
  return {
    page: normalizePage(input.page),
    ...(input.visaSponsorship !== undefined ? { visaSponsorship: input.visaSponsorship } : {}),
  }
}

function normalizePage(value: number | undefined): number {
  const page = value ?? ARBEITNOW_DEFAULT_PAGE
  if (!Number.isInteger(page) || page < 1 || page > ARBEITNOW_MAX_PAGE) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--page must be an integer from 1 to ${ARBEITNOW_MAX_PAGE}.`)
  }
  return page
}

function parseJobsEnvelope(value: unknown, rateLimit: ArbeitnowRateLimit): ArbeitnowJobsEnvelope {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Arbeitnow jobs response had an unexpected schema.')
  }
  const links = isRecord(value.links) ? value.links : {}
  const meta = isRecord(value.meta) ? value.meta : {}
  return {
    jobs: value.data.map(parseJob),
    pagination: {
      currentPage: readNumber(meta.current_page) ?? ARBEITNOW_DEFAULT_PAGE,
      perPage: readNumber(meta.per_page) ?? ARBEITNOW_PAGE_SIZE,
      from: readNumber(meta.from),
      to: readNumber(meta.to),
      nextUrl: optionalString(links.next),
      prevUrl: optionalString(links.prev),
      firstUrl: optionalString(links.first),
      lastUrl: optionalString(links.last),
      terms: optionalString(meta.terms),
      info: optionalString(meta.info),
    },
    rateLimit,
  }
}

function parseJob(value: unknown): ArbeitnowJob {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Arbeitnow job item had an unexpected schema.')
  }
  const slug = optionalString(value.slug)
  const companyName = optionalString(value.company_name)
  const title = optionalString(value.title)
  const url = optionalString(value.url)
  if (slug === undefined || companyName === undefined || title === undefined || url === undefined || typeof value.remote !== 'boolean') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Arbeitnow job item was missing required fields.')
  }
  const createdAt = readNumber(value.created_at)
  const descriptionHtml = optionalString(value.description)
  return {
    slug,
    companyName,
    title,
    descriptionHtml,
    descriptionText: descriptionHtml === undefined ? undefined : stripHtml(descriptionHtml),
    remote: value.remote,
    url,
    tags: readStringArray(value.tags),
    jobTypes: readStringArray(value.job_types),
    location: optionalString(value.location),
    createdAt,
    createdAtIso: createdAt === undefined ? undefined : new Date(createdAt * 1000).toISOString(),
    visaSponsorship: typeof value.visa_sponsorship === 'boolean' ? value.visa_sponsorship : undefined,
  }
}

function readRateLimit(headers: Headers): ArbeitnowRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
  }
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(optionalString).filter((entry): entry is string => entry !== undefined) : []
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return optionalString(value.message) ?? optionalString(value.error)
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
