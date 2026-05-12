import {
  DISIFY_DEFAULT_DOMAIN,
  DISIFY_DEFAULT_EMAIL,
  DisifyClient,
  normalizeDisifyDomainInput,
  normalizeDisifyEmailInput,
  type DisifyDomainInput,
  type DisifyEmailInput,
  type DisifyRateLimit,
} from '../../infrastructure/openApis/disifyClient.js'

type DisifyApiMetadata = {
  provider: 'disify'
  endpoint: string
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://docs.disify.com/'
  homepage: 'https://www.disify.com/'
  transport: 'HTTPS JSON'
  rateLimit: 'Live unauthenticated responses expose x-ratelimit-limit: 30'
  defaultEmail: string
  defaultDomain: string
  publicApisProject: 'https://github.com/public-apis/public-apis'
}

export type DisifyValidationResult = {
  domain: string
  format: boolean
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
}

export type DisifyEmailResult = {
  kind: 'disify.email'
  api: DisifyApiMetadata
  query: {
    email: string
  }
  validation: DisifyValidationResult
  rateLimit: DisifyRateLimit
}

export type DisifyDomainResult = {
  kind: 'disify.domain'
  api: DisifyApiMetadata
  query: {
    domain: string
  }
  validation: DisifyValidationResult
  rateLimit: DisifyRateLimit
}

export async function validateDisifyEmail(input: DisifyEmailInput = {}): Promise<DisifyEmailResult> {
  const query = normalizeDisifyEmailInput(input)
  const client = new DisifyClient()
  const validation = await client.validateEmail(query)
  return {
    kind: 'disify.email',
    api: createApiMetadata('GET /api/email/{email}'),
    query,
    validation: projectValidation(validation),
    rateLimit: validation.rateLimit,
  }
}

export async function validateDisifyDomain(input: DisifyDomainInput = {}): Promise<DisifyDomainResult> {
  const query = normalizeDisifyDomainInput(input)
  const client = new DisifyClient()
  const validation = await client.validateDomain(query)
  return {
    kind: 'disify.domain',
    api: createApiMetadata('GET /api/domain/{domain}'),
    query,
    validation: projectValidation(validation),
    rateLimit: validation.rateLimit,
  }
}

function createApiMetadata(endpoint: string): DisifyApiMetadata {
  return {
    provider: 'disify',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://docs.disify.com/',
    homepage: 'https://www.disify.com/',
    transport: 'HTTPS JSON',
    rateLimit: 'Live unauthenticated responses expose x-ratelimit-limit: 30',
    defaultEmail: DISIFY_DEFAULT_EMAIL,
    defaultDomain: DISIFY_DEFAULT_DOMAIN,
    publicApisProject: 'https://github.com/public-apis/public-apis',
  }
}

function projectValidation(validation: Omit<DisifyValidationResult, never> & { rateLimit?: DisifyRateLimit | undefined }): DisifyValidationResult {
  return {
    domain: validation.domain,
    format: validation.format,
    disposable: validation.disposable,
    dns: validation.dns,
    ...(validation.confidence !== undefined ? { confidence: validation.confidence } : {}),
    signals: validation.signals,
    domainInfo: validation.domainInfo,
    mxInfo: validation.mxInfo,
    ...(validation.role !== undefined ? { role: validation.role } : {}),
    ...(validation.free !== undefined ? { free: validation.free } : {}),
    ...(validation.whitelist !== undefined ? { whitelist: validation.whitelist } : {}),
  }
}
