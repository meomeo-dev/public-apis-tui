import { z } from 'zod'
import { checkUserCheckEmail } from '../../application/usecases/usercheck.js'
import {
  normalizeUserCheckEmailInput,
  type UserCheckEmailInput,
} from '../../infrastructure/openApis/usercheckClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const emailParamsSchema = z.object({
  email: z.string().optional(),
}) satisfies z.ZodType<UserCheckEmailInput>

const emailOperation: PublicApiOperationDefinition<UserCheckEmailInput> = {
  id: 'usercheck.email',
  providerId: 'usercheck',
  name: 'Email Validation',
  commandPath: ['usercheck', 'email'],
  rpcMethod: 'usercheck.email',
  description: 'Validate an email address with the no-auth UserCheck/MailCheck.ai endpoint.',
  category: 'email',
  options: [
    {
      name: 'email',
      flag: '--email <address>',
      description: 'Email address to validate, default test@example.com',
      exposure: 'primary',
      group: 'query',
      reason: 'Email is the primary UserCheck validation path parameter and includes domain/reputation fields in one response.',
      defaultValue: 'test@example.com',
    },
  ],
  paramsSchema: emailParamsSchema,
  execute: params => checkUserCheckEmail(params),
  normalizeParams: params => emailParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUserCheckEmailInput(params),
  resultKind: 'usercheck.email',
  defaultFormat: 'text',
}

export const userCheckProvider: PublicApiProviderModule = {
  manifest: {
    id: 'usercheck',
    name: 'UserCheck (MailCheck.ai)',
    description: 'No-auth HTTPS JSON email validation endpoint for disposable, MX, public-domain, role, and spam signals.',
    publicApisCategory: 'Email',
    homepageUrl: 'https://www.usercheck.com/',
    docsUrl: 'https://www.usercheck.com/docs/api/email-endpoint',
    auth: {
      mode: 'none',
      notes: [
        'MailCheck.ai has rebranded to UserCheck.com.',
        'Official docs describe API-key authentication, but the public homepage/rebrand notice and live endpoint support low-quota unauthenticated checks.',
      ],
    },
    tags: ['email', 'validation', 'disposable-email', 'domain-reputation', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Rebrand notice says unauthenticated requests are supported with a reduced quota; live responses expose x-ratelimit-limit and x-ratelimit-remaining headers.',
      'The CLI implements one email check per command to preserve the low anonymous quota.',
    ],
  },
  operations: [emailOperation],
  endpoints: [
    {
      id: 'usercheck-email',
      method: 'GET',
      urlPattern: 'https://api.usercheck.com/email/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'UserCheck/MailCheck.ai no-auth email validation endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://www.usercheck.com/rebrand',
        'https://www.usercheck.com/docs/api/email-endpoint',
        'https://api.usercheck.com/email/test@example.com',
      ],
      consumedBy: ['usercheck email'],
      notes: [
        'No authentication used by this CLI workflow; live response confirmed HTTPS JSON without Authorization header.',
        'Full authenticated plan remains available separately and is intentionally not implemented.',
        'No browser clickstream or scraping required.',
      ],
    },
  ],
}
