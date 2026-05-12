import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const USERCHECK_DEFAULT_BASE_URL = 'https://api.usercheck.com'
export const USERCHECK_DEFAULT_EMAIL = 'test@example.com'

export type UserCheckEmailInput = {
  email?: string | undefined
}

export type NormalizedUserCheckEmailInput = {
  email: string
}

export type UserCheckRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
}

export type UserCheckMxRecord = {
  hostname: string
  priority?: number | undefined
}

export type UserCheckMxProvider = {
  slug?: string | undefined
  type?: string | undefined
  grade?: string | undefined
}

export type UserCheckEmailResponse = {
  status: number
  email: string
  normalizedEmail: string
  domain: string
  domainAgeInDays?: number | null | undefined
  mx: boolean
  mxRecords: UserCheckMxRecord[]
  mxProviders: UserCheckMxProvider[]
  disposable: boolean
  publicDomain: boolean
  relayDomain: boolean
  alias?: boolean | undefined
  roleAccount: boolean
  spam: boolean
  blocklisted?: boolean | undefined
  didYouMean?: string | null | undefined
  rateLimit: UserCheckRateLimit
}

export class UserCheckClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async checkEmail(input: UserCheckEmailInput = {}): Promise<UserCheckEmailResponse> {
    const query = normalizeUserCheckEmailInput(input)
    const url = new URL(`/email/${encodeURIComponent(query.email)}`, normalizeBaseUrl(this.options.baseUrl ?? USERCHECK_DEFAULT_BASE_URL))
    const { parsed, rateLimit } = await this.fetchJson(url)
    return parseEmailResponse(parsed, rateLimit)
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: UserCheckRateLimit }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UserCheck request failed: ${String(error)}`, {
        provider: 'usercheck',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UserCheck returned a non-JSON response: ${String(error)}`, {
        provider: 'usercheck',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? `UserCheck request failed with HTTP ${response.status}.`, {
        provider: 'usercheck',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeUserCheckEmailInput(input: UserCheckEmailInput = {}): NormalizedUserCheckEmailInput {
  const email = (input.email ?? USERCHECK_DEFAULT_EMAIL).trim().toLowerCase()
  if (email.length < 3 || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'UserCheck --email must be a valid email address up to 254 characters.', {
      email: input.email,
    })
  }
  return { email }
}

function parseEmailResponse(value: unknown, rateLimit: UserCheckRateLimit): UserCheckEmailResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'UserCheck response must be a JSON object.')
  }
  if (
    typeof value.status !== 'number'
    || typeof value.email !== 'string'
    || typeof value.normalized_email !== 'string'
    || typeof value.domain !== 'string'
    || typeof value.mx !== 'boolean'
    || typeof value.disposable !== 'boolean'
    || typeof value.public_domain !== 'boolean'
    || typeof value.relay_domain !== 'boolean'
    || typeof value.role_account !== 'boolean'
    || typeof value.spam !== 'boolean'
  ) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'UserCheck response did not include required email validation fields.')
  }
  return {
    status: value.status,
    email: value.email,
    normalizedEmail: value.normalized_email,
    domain: value.domain,
    ...(typeof value.domain_age_in_days === 'number' || value.domain_age_in_days === null ? { domainAgeInDays: value.domain_age_in_days } : {}),
    mx: value.mx,
    mxRecords: Array.isArray(value.mx_records) ? value.mx_records.filter(isRecord).map(parseMxRecord) : [],
    mxProviders: Array.isArray(value.mx_providers) ? value.mx_providers.filter(isRecord).map(parseMxProvider) : [],
    disposable: value.disposable,
    publicDomain: value.public_domain,
    relayDomain: value.relay_domain,
    ...(typeof value.alias === 'boolean' ? { alias: value.alias } : {}),
    roleAccount: value.role_account,
    spam: value.spam,
    ...(typeof value.blocklisted === 'boolean' ? { blocklisted: value.blocklisted } : {}),
    ...(typeof value.did_you_mean === 'string' || value.did_you_mean === null ? { didYouMean: value.did_you_mean } : {}),
    rateLimit,
  }
}

function parseMxRecord(value: Record<string, unknown>): UserCheckMxRecord {
  return {
    hostname: typeof value.hostname === 'string' ? value.hostname : '',
    ...(typeof value.priority === 'number' ? { priority: value.priority } : {}),
  }
}

function parseMxProvider(value: Record<string, unknown>): UserCheckMxProvider {
  return {
    ...(typeof value.slug === 'string' ? { slug: value.slug } : {}),
    ...(typeof value.type === 'string' ? { type: value.type } : {}),
    ...(typeof value.grade === 'string' ? { grade: value.grade } : {}),
  }
}

function readRateLimit(headers: Headers): UserCheckRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
  }
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return typeof value.error === 'string' ? value.error : typeof value.message === 'string' ? value.message : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
