import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const DISIFY_DEFAULT_BASE_URL = 'https://disify.com'
export const DISIFY_DEFAULT_EMAIL = 'test@example.com'
export const DISIFY_DEFAULT_DOMAIN = 'gmail.com'

export type DisifyRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
}

export type DisifyEmailInput = {
  email?: string | undefined
}

export type DisifyDomainInput = {
  domain?: string | undefined
}

export type NormalizedDisifyEmailInput = {
  email: string
}

export type NormalizedDisifyDomainInput = {
  domain: string
}

export type DisifyValidationResponse = {
  format: boolean
  domain: string
  disposable: boolean
  dns: boolean
  confidence?: number | undefined
  signals: string[]
  domainInfo: {
    tld?: string | undefined
    isSubdomain?: boolean | undefined
    parentDomain?: string | null | undefined
  }
  mxInfo: string[]
  role?: boolean | undefined
  free?: boolean | undefined
  whitelist?: boolean | undefined
  rateLimit: DisifyRateLimit
}

export class DisifyClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async validateEmail(input: DisifyEmailInput = {}): Promise<DisifyValidationResponse> {
    const query = normalizeDisifyEmailInput(input)
    return this.fetchValidation(`/api/email/${encodeURIComponent(query.email)}`)
  }

  async validateDomain(input: DisifyDomainInput = {}): Promise<DisifyValidationResponse> {
    const query = normalizeDisifyDomainInput(input)
    return this.fetchValidation(`/api/domain/${encodeURIComponent(query.domain)}`)
  }

  private async fetchValidation(path: string): Promise<DisifyValidationResponse> {
    const url = new URL(path, normalizeBaseUrl(this.options.baseUrl ?? DISIFY_DEFAULT_BASE_URL))
    const response = await this.fetchJson(url)
    return parseValidationResponse(response.parsed, response.rateLimit)
  }

  private async fetchJson(url: URL): Promise<{ parsed: unknown; rateLimit: DisifyRateLimit }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Disify request failed: ${String(error)}`, {
        provider: 'disify',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Disify returned a non-JSON response: ${String(error)}`, {
        provider: 'disify',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Disify request failed with HTTP ${response.status}.`, {
        provider: 'disify',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return { parsed, rateLimit: readRateLimit(response.headers) }
  }
}

export function normalizeDisifyEmailInput(input: DisifyEmailInput = {}): NormalizedDisifyEmailInput {
  const email = (input.email ?? DISIFY_DEFAULT_EMAIL).trim().toLowerCase()
  if (email.length < 3 || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Disify --email must be a valid email address up to 254 characters.', {
      email: input.email,
    })
  }
  return { email }
}

export function normalizeDisifyDomainInput(input: DisifyDomainInput = {}): NormalizedDisifyDomainInput {
  const domain = (input.domain ?? DISIFY_DEFAULT_DOMAIN).trim().toLowerCase()
  if (domain.length < 1 || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(domain)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Disify --domain must be a valid hostname domain up to 253 characters.', {
      domain: input.domain,
    })
  }
  return { domain }
}

function parseValidationResponse(value: unknown, rateLimit: DisifyRateLimit): DisifyValidationResponse {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Disify response must be a JSON object.')
  }
  if (typeof value.format !== 'boolean' || typeof value.domain !== 'string' || typeof value.disposable !== 'boolean' || typeof value.dns !== 'boolean') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Disify response did not include required validation fields.')
  }
  const domainInfo = isRecord(value.domain_info) ? value.domain_info : {}
  return {
    format: value.format,
    domain: value.domain,
    disposable: value.disposable,
    dns: value.dns,
    ...(typeof value.confidence === 'number' ? { confidence: value.confidence } : {}),
    signals: Array.isArray(value.signals) ? value.signals.filter((signal): signal is string => typeof signal === 'string') : [],
    domainInfo: {
      ...(typeof domainInfo.tld === 'string' ? { tld: domainInfo.tld } : {}),
      ...(typeof domainInfo.is_subdomain === 'boolean' ? { isSubdomain: domainInfo.is_subdomain } : {}),
      ...(typeof domainInfo.parent_domain === 'string' || domainInfo.parent_domain === null ? { parentDomain: domainInfo.parent_domain } : {}),
    },
    mxInfo: Array.isArray(value.mx_info) ? value.mx_info.filter((entry): entry is string => typeof entry === 'string' && entry !== '') : [],
    ...(typeof value.role === 'boolean' ? { role: value.role } : {}),
    ...(typeof value.free === 'boolean' ? { free: value.free } : {}),
    ...(typeof value.whitelist === 'boolean' ? { whitelist: value.whitelist } : {}),
    rateLimit,
  }
}

function readRateLimit(headers: Headers): DisifyRateLimit {
  return {
    limit: headers.get('x-ratelimit-limit') ?? undefined,
    remaining: headers.get('x-ratelimit-remaining') ?? undefined,
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
