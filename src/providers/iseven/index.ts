import { z } from 'zod'
import {
  ISEVEN_DEFAULT_NUMBER,
  ISEVEN_FREE_MAX,
  ISEVEN_FREE_MIN,
  checkIsEven,
  normalizeIsEvenInput,
  type IsEvenCheckInput,
} from '../../application/usecases/isEven.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const checkParamsSchema = z.object({
  number: z.number().int().optional(),
}) satisfies z.ZodType<IsEvenCheckInput>

const checkOperation: PublicApiOperationDefinition<IsEvenCheckInput> = {
  id: 'iseven.check',
  providerId: 'iseven',
  name: 'Parity check',
  commandPath: ['iseven', 'check'],
  rpcMethod: 'iseven.check',
  description: 'Check whether a number is even through the no-auth isEven JSON API.',
  category: 'science',
  options: [
    {
      name: 'number',
      flag: '--number <integer>',
      description: [
        `Integer to check, default ${String(ISEVEN_DEFAULT_NUMBER)},`,
        `free range ${String(ISEVEN_FREE_MIN)}-${String(ISEVEN_FREE_MAX)}`,
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: [
        'The documented endpoint has one path parameter. The CLI bounds it to',
        'the documented no-auth public free range.',
      ].join(' '),
      valueType: 'integer',
      defaultValue: String(ISEVEN_DEFAULT_NUMBER),
    },
  ],
  paramsSchema: checkParamsSchema,
  execute: params => checkIsEven(params),
  normalizeParams: params => checkParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeIsEvenInput(params),
  resultKind: 'iseven.check',
  defaultFormat: 'text',
}

export const isEvenProvider: PublicApiProviderModule = {
  manifest: {
    id: 'iseven',
    name: 'isEven',
    description: [
      'No-auth HTTPS JSON API that reports whether a bounded non-negative',
      'integer is even.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://isevenapi.xyz/',
    docsUrl: 'https://isevenapi.xyz/',
    auth: {
      mode: 'none',
      notes: [
        [
          'The documented public endpoint returns JSON without API key, OAuth,',
          'cookies, browser sessions, or account setup for the free range.',
        ].join(' '),
      ],
    },
    tags: ['science', 'math', 'parity', 'humor', 'no-auth', 'json'],
    freePlanNotes: [
      'Public free tier range is documented as 0 through 999999.',
      'Free responses include provider-supplied advertisement text.',
      [
        'Negative numbers, ranges above 999999, ad-free access, and support',
        'belong to paid tiers and are not exposed in the no-auth CLI.',
      ].join(' '),
    ],
  },
  operations: [checkOperation],
  endpoints: [
    {
      id: 'iseven-check',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.isevenapi\\.xyz/api/iseven/[0-9]+/?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'isEven documented parity endpoint for one number.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://isevenapi.xyz/',
        'https://api.isevenapi.xyz/api/iseven/6/',
      ],
      consumedBy: ['public-apis apis run iseven.check'],
      notes: [
        'No authentication required for documented free-range requests.',
        'CLI validates the documented public free range before making requests.',
        'Free JSON responses may include provider-supplied ad text.',
      ],
    },
  ],
}

export type { IsEvenCheckInput } from '../../application/usecases/isEven.js'
