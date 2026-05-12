import {
  USERCHECK_DEFAULT_EMAIL,
  UserCheckClient,
  normalizeUserCheckEmailInput,
  type UserCheckEmailInput,
  type UserCheckEmailResponse,
  type UserCheckRateLimit,
} from '../../infrastructure/openApis/usercheckClient.js'

export type UserCheckEmailResult = {
  kind: 'usercheck.email'
  api: {
    provider: 'usercheck'
    endpoint: 'GET /email/{email}'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://www.usercheck.com/docs/api/email-endpoint'
    homepage: 'https://www.usercheck.com/'
    rebrand: 'MailCheck.ai is now UserCheck.com; api.mailcheck.ai forwards to api.usercheck.com for a transition period.'
    transport: 'HTTPS JSON'
    defaultEmail: string
    freePlanLimit: 'Unauthenticated requests are supported but low-quota; live headers expose x-ratelimit-limit.'
    publicApisProject: 'https://github.com/public-apis/public-apis'
  }
  query: {
    email: string
  }
  validation: {
    status: number
    email: string
    normalizedEmail: string
    domain: string
    domainAgeInDays?: number | null | undefined
    mx: boolean
    mxRecords: UserCheckEmailResponse['mxRecords']
    mxProviders: UserCheckEmailResponse['mxProviders']
    disposable: boolean
    publicDomain: boolean
    relayDomain: boolean
    alias?: boolean | undefined
    roleAccount: boolean
    spam: boolean
    blocklisted?: boolean | undefined
    didYouMean?: string | null | undefined
  }
  rateLimit: UserCheckRateLimit
}

export async function checkUserCheckEmail(input: UserCheckEmailInput = {}): Promise<UserCheckEmailResult> {
  const query = normalizeUserCheckEmailInput(input)
  const client = new UserCheckClient()
  const validation = await client.checkEmail(query)
  return {
    kind: 'usercheck.email',
    api: {
      provider: 'usercheck',
      endpoint: 'GET /email/{email}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://www.usercheck.com/docs/api/email-endpoint',
      homepage: 'https://www.usercheck.com/',
      rebrand: 'MailCheck.ai is now UserCheck.com; api.mailcheck.ai forwards to api.usercheck.com for a transition period.',
      transport: 'HTTPS JSON',
      defaultEmail: USERCHECK_DEFAULT_EMAIL,
      freePlanLimit: 'Unauthenticated requests are supported but low-quota; live headers expose x-ratelimit-limit.',
      publicApisProject: 'https://github.com/public-apis/public-apis',
    },
    query,
    validation: {
      status: validation.status,
      email: validation.email,
      normalizedEmail: validation.normalizedEmail,
      domain: validation.domain,
      ...(validation.domainAgeInDays !== undefined ? { domainAgeInDays: validation.domainAgeInDays } : {}),
      mx: validation.mx,
      mxRecords: validation.mxRecords,
      mxProviders: validation.mxProviders,
      disposable: validation.disposable,
      publicDomain: validation.publicDomain,
      relayDomain: validation.relayDomain,
      ...(validation.alias !== undefined ? { alias: validation.alias } : {}),
      roleAccount: validation.roleAccount,
      spam: validation.spam,
      ...(validation.blocklisted !== undefined ? { blocklisted: validation.blocklisted } : {}),
      ...(validation.didYouMean !== undefined ? { didYouMean: validation.didYouMean } : {}),
    },
    rateLimit: validation.rateLimit,
  }
}
