import { z } from 'zod'
import { checkKickboxDisposable } from '../../application/usecases/kickbox.js'
import {
  normalizeKickboxDisposableInput,
  type KickboxDisposableInput,
} from '../../infrastructure/openApis/kickboxClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const disposableParamsSchema = z.object({
  target: z.string().optional(),
}) satisfies z.ZodType<KickboxDisposableInput>

const disposableOperation: PublicApiOperationDefinition<KickboxDisposableInput> = {
  id: 'kickbox.disposable',
  providerId: 'kickbox',
  name: 'Disposable Email Check',
  commandPath: ['kickbox', 'disposable'],
  rpcMethod: 'kickbox.disposable',
  description: 'Check whether an email address or domain is disposable using Kickbox Open API.',
  category: 'email',
  options: [
    {
      name: 'target',
      flag: '--target <email-or-domain>',
      description: 'Email address or domain to check, default gmail.com',
      exposure: 'primary',
      group: 'query',
      reason: 'The Kickbox Open API accepts one path target that may be an email address or domain.',
      defaultValue: 'gmail.com',
    },
  ],
  paramsSchema: disposableParamsSchema,
  execute: params => checkKickboxDisposable(params),
  normalizeParams: params => disposableParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeKickboxDisposableInput(params),
  resultKind: 'kickbox.disposable',
  defaultFormat: 'text',
}

export const kickboxProvider: PublicApiProviderModule = {
  manifest: {
    id: 'kickbox',
    name: 'Kickbox Open API',
    description: 'No-auth HTTPS JSON API for checking whether an email address or domain is disposable.',
    publicApisCategory: 'Email',
    homepageUrl: 'https://open.kickbox.com/',
    docsUrl: 'https://open.kickbox.com/',
    auth: {
      mode: 'none',
      notes: ['The open disposable checker requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['email', 'disposable-email', 'domain', 'validation', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'The open endpoint returns only a disposable boolean; full Kickbox email verification is a separate account/API-key product and is not implemented here.',
      'No documented request quota was found on the open page, so the CLI exposes only one low-cost target per command.',
    ],
  },
  operations: [disposableOperation],
  endpoints: [
    {
      id: 'kickbox-open-disposable',
      method: 'GET',
      urlPattern: 'https://open.kickbox.com/v1/disposable/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Kickbox Open API disposable email/domain detection endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://open.kickbox.com/',
        'https://open.kickbox.com/assets/scripts/client.js',
        'https://open.kickbox.com/v1/disposable/gmail.com',
      ],
      consumedBy: ['kickbox disposable'],
      notes: ['No authentication required for disposable detection.', 'No browser clickstream or scraping required.', 'Full verification API is intentionally excluded because it is account/API-key based.'],
    },
  ],
}
