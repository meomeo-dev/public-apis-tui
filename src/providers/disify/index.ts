import { z } from 'zod'
import { validateDisifyDomain, validateDisifyEmail } from '../../application/usecases/disify.js'
import {
  normalizeDisifyDomainInput,
  normalizeDisifyEmailInput,
  type DisifyDomainInput,
  type DisifyEmailInput,
} from '../../infrastructure/openApis/disifyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const emailParamsSchema = z.object({
  email: z.string().optional(),
}) satisfies z.ZodType<DisifyEmailInput>

const domainParamsSchema = z.object({
  domain: z.string().optional(),
}) satisfies z.ZodType<DisifyDomainInput>

const emailOperation: PublicApiOperationDefinition<DisifyEmailInput> = {
  id: 'disify.email',
  providerId: 'disify',
  name: 'Email Validation',
  commandPath: ['disify', 'email'],
  rpcMethod: 'disify.email',
  description: 'Validate an email address and detect disposable/free/role signals using Disify.',
  category: 'email',
  options: [
    {
      name: 'email',
      flag: '--email <address>',
      description: 'Email address to validate, default test@example.com',
      exposure: 'primary',
      group: 'query',
      reason: 'Email address is the primary documented Disify validation path parameter.',
      defaultValue: 'test@example.com',
    },
  ],
  paramsSchema: emailParamsSchema,
  execute: params => validateDisifyEmail(params),
  normalizeParams: params => emailParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeDisifyEmailInput(params),
  resultKind: 'disify.email',
  defaultFormat: 'text',
}

const domainOperation: PublicApiOperationDefinition<DisifyDomainInput> = {
  id: 'disify.domain',
  providerId: 'disify',
  name: 'Domain Validation',
  commandPath: ['disify', 'domain'],
  rpcMethod: 'disify.domain',
  description: 'Validate a domain for disposable/free/role signals using Disify.',
  category: 'email',
  options: [
    {
      name: 'domain',
      flag: '--domain <domain>',
      description: 'Domain to validate, default gmail.com',
      exposure: 'primary',
      group: 'query',
      reason: 'Domain is the primary documented Disify domain validation path parameter.',
      defaultValue: 'gmail.com',
    },
  ],
  paramsSchema: domainParamsSchema,
  execute: params => validateDisifyDomain(params),
  normalizeParams: params => domainParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeDisifyDomainInput(params),
  resultKind: 'disify.domain',
  defaultFormat: 'text',
}

export const disifyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'disify',
    name: 'Disify',
    description: 'No-auth HTTPS JSON API for validating emails and domains with disposable/free/role signals.',
    publicApisCategory: 'Email',
    homepageUrl: 'https://www.disify.com/',
    docsUrl: 'https://docs.disify.com/',
    auth: {
      mode: 'none',
      notes: ['Email and domain validation endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['email', 'validation', 'disposable-email', 'domain', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Live unauthenticated responses expose x-ratelimit-limit: 30 and x-ratelimit-remaining headers.',
      'Both email and domain validation are path-parameter GET endpoints returning JSON validation signals.',
    ],
  },
  operations: [emailOperation, domainOperation],
  endpoints: [
    {
      id: 'disify-email',
      method: 'GET',
      urlPattern: 'https://disify.com/api/email/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Disify no-auth email validation endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://docs.disify.com/', 'https://disify.com/api/email/test@example.com'],
      consumedBy: ['disify email'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
    {
      id: 'disify-domain',
      method: 'GET',
      urlPattern: 'https://disify.com/api/domain/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Disify no-auth domain validation endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://docs.disify.com/', 'https://disify.com/api/domain/gmail.com'],
      consumedBy: ['disify domain'],
      notes: ['No authentication required; no browser clickstream or scraping required.'],
    },
  ],
}
