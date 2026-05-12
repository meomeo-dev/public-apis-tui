import { z } from 'zod'
import { getOpenCollectiveAccount, type OpenCollectiveAccountResult } from '../../application/usecases/openCollective.js'
import { OPEN_COLLECTIVE_DEFAULT_SLUG, normalizeOpenCollectiveAccountInput, type OpenCollectiveAccountInput } from '../../infrastructure/openApis/openCollectiveClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const accountParamsSchema = z.object({
  slug: z.string().min(1).optional(),
}) satisfies z.ZodType<OpenCollectiveAccountInput>

const accountOperation: PublicApiOperationDefinition<OpenCollectiveAccountInput> = {
  id: 'opencollective.account',
  providerId: 'opencollective',
  name: 'Account Summary',
  commandPath: ['opencollective', 'account'],
  rpcMethod: 'opencollective.account',
  description: 'Show public Open Collective account metadata and financial stats through the no-auth GraphQL API.',
  category: 'social',
  options: [
    {
      name: 'slug',
      flag: '--slug <slug>',
      description: `Open Collective account slug, default ${OPEN_COLLECTIVE_DEFAULT_SLUG}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Slug is the stable public account identifier and keeps the CLI surface focused for account intelligence.',
      defaultValue: OPEN_COLLECTIVE_DEFAULT_SLUG,
    },
  ],
  paramsSchema: accountParamsSchema,
  execute: params => getOpenCollectiveAccount(params),
  normalizeParams: params => accountParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOpenCollectiveAccountInput(params),
  resultKind: 'opencollective.account',
  defaultFormat: 'text',
}

export const openCollectiveProvider: PublicApiProviderModule = {
  manifest: {
    id: 'opencollective',
    name: 'Open Collective',
    description: 'No-auth public GraphQL reads for Open Collective account metadata and financial stats.',
    publicApisCategory: 'Social',
    homepageUrl: 'https://opencollective.com/',
    docsUrl: 'https://docs.opencollective.com/help/contributing/development/api',
    auth: { mode: 'none', notes: ['This provider only uses unauthenticated public account reads; token/OAuth flows for higher limits or private data are intentionally excluded.'] },
    tags: ['social', 'funding', 'open-source', 'graphql', 'no-auth'],
    freePlanNotes: ['No public no-auth quota was found in official docs; live probes can return rate-limit errors and recommend Personal Tokens for higher limits.'],
  },
  operations: [accountOperation],
  endpoints: [
    {
      id: 'opencollective-graphql-v2',
      method: 'POST',
      urlPattern: 'https://api.opencollective.com/graphql/v2',
      category: 'public-api:social',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://docs.opencollective.com/help/contributing/development/api', 'https://graphql-docs-v2.opencollective.com/'],
      consumedBy: ['opencollective.account'],
      description: 'Open Collective public GraphQL API v2 endpoint for account summary reads.',
      notes: ['No auth required for public account reads.', 'No-auth live probes may be rate-limited; Personal Tokens are outside this no-auth operation.'],
    },
  ],
}

export type { OpenCollectiveAccountResult }
